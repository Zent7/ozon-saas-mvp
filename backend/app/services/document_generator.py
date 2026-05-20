from __future__ import annotations

from datetime import date, datetime
from pathlib import Path
import re
import shutil
import xml.etree.ElementTree as ET
import zipfile
from xml.etree.ElementTree import ParseError

import xlrd
from sqlalchemy import select
from sqlalchemy.orm import Session
from xlrd import xldate
from xlutils.copy import copy as copy_xls_workbook

from app.core.config import settings
from app.models.client import Client
from app.models.doctor_exam import DoctorExam
from app.models.document_journal import DocumentJournalEntry
from app.models.document_template import DocumentTemplate
from app.models.encounter import Encounter
from app.models.encounter_service import EncounterService
from app.models.generated_document import GeneratedDocument
from app.models.medical_record import MedicalRecord, MedicalRecordEntry
from app.models.service import Service
from app.schemas.document_generation import DocumentGenerateResponse
from app.services.audit import write_audit_log
from app.services.blank_forms import (
    issue_specific_blank,
    issue_next_blank,
    resolve_required_blank_type,
    reuse_blank_for_existing_document,
)
from app.services.document_context import build_document_context

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W_NS}
ET.register_namespace("w", W_NS)


def _is_contract_template(template: DocumentTemplate) -> bool:
    text = " ".join(
        [
            str(template.name or ""),
            str(template.code or ""),
            str(template.file_name or ""),
        ]
    ).lower()
    return "договор" in text or "contract" in text


def _cleanup_contract_xml(xml_text: str) -> str:
    cleanup_patterns = [
        r"Баронина\s+Виктора\s+Евгеньевича",
        r"Баронин\s+Виктор\s+Евгеньевич",
        r"П\s*о\s*д\s*п\s*и\s*с\s*ь",
    ]
    for pattern in cleanup_patterns:
        xml_text = re.sub(pattern, "", xml_text, flags=re.IGNORECASE)
    return xml_text


def _normalize_token_key(value: str) -> str:
    return re.sub(r"\s+", "", value.replace("|", ""))


def _token_key_pattern(key: str) -> str:
    return r"\s*\.\s*".join(re.escape(part) for part in key.split("."))


def _context_token_variants(context: dict[str, str]) -> list[tuple[str, str]]:
    variants: list[tuple[str, str]] = []
    seen: set[str] = set()
    for key, value in context.items():
        normalized = _normalize_token_key(key)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        variants.append((normalized, value))
    return variants


def _normalized_context_lookup(context: dict[str, str]) -> dict[str, str]:
    return {normalized: value for normalized, value in _context_token_variants(context)}


def _has_context_bookmarks(xml_text: str, context: dict[str, str]) -> bool:
    bookmark_names = re.findall(r'w:bookmarkStart\b[^>]*\bw:name="([^"]+)"', xml_text)
    if not bookmark_names:
        return False
    context_keys = set(context.keys())
    return any(name and not name.startswith("_") and name in context_keys for name in bookmark_names)


def _replace_text_tokens(xml_text: str, context: dict[str, str]) -> str:
    for key, value in _context_token_variants(context):
        key_pattern = _token_key_pattern(key)
        patterns = [
            rf"\[\s*\|\s*{key_pattern}\s*\|\s*\]",
            rf"\[\s*{key_pattern}\s*\]",
        ]
        for pattern in patterns:
            xml_text = re.sub(pattern, value, xml_text)
    return xml_text


def _append_bookmark_value(tree: ET.ElementTree, context: dict[str, str]) -> ET.ElementTree:
    root = tree.getroot()
    for bookmark in root.findall(".//w:bookmarkStart", NS):
        bookmark_name = bookmark.attrib.get(f"{{{W_NS}}}name")
        if not bookmark_name or bookmark_name.startswith("_"):
            continue
        if bookmark_name not in context:
            continue

        parent = _find_parent(root, bookmark)
        if parent is None:
            continue

        bookmark_id = bookmark.attrib.get(f"{{{W_NS}}}id")
        value = context.get(bookmark_name, "")
        if value is None:
            value = ""

        # Remove existing text nodes until the matching bookmark end.
        removing = False
        to_remove: list[ET.Element] = []
        for child in list(parent):
            if child is bookmark:
                removing = True
                continue
            if removing and child.tag == f"{{{W_NS}}}bookmarkEnd" and child.attrib.get(f"{{{W_NS}}}id") == bookmark_id:
                break
            if removing and child.tag == f"{{{W_NS}}}r":
                to_remove.append(child)

        for node in to_remove:
            parent.remove(node)

        if value:
            run = ET.Element(f"{{{W_NS}}}r")
            text = ET.SubElement(run, f"{{{W_NS}}}t")
            text.text = value
            insert_index = list(parent).index(bookmark) + 1
            parent.insert(insert_index, run)
    return tree


def _replace_split_token_nodes(tree: ET.ElementTree, context: dict[str, str]) -> ET.ElementTree:
    root = tree.getroot()
    text_nodes = root.findall(".//w:t", NS)
    normalized_context = _normalized_context_lookup(context)
    index = 0

    while index < len(text_nodes):
        current_text = (text_nodes[index].text or "").strip()
        if current_text != "[":
            index += 1
            continue

        end_index = index + 1
        token_parts: list[str] = []
        found_end = False
        while end_index < len(text_nodes):
            part = (text_nodes[end_index].text or "").strip()
            if part == "]":
                found_end = True
                break
            token_parts.append(part)
            end_index += 1

        if not found_end:
            index += 1
            continue

        raw_token = "".join(token_parts)
        normalized_token = _normalize_token_key(raw_token)
        if normalized_token in normalized_context:
            text_nodes[index].text = normalized_context[normalized_token]
            for clear_index in range(index + 1, end_index + 1):
                text_nodes[clear_index].text = ""

        index = end_index + 1

    return tree


def _replace_text_node_tokens(tree: ET.ElementTree, context: dict[str, str]) -> ET.ElementTree:
    variants = _context_token_variants(context)
    for text_node in tree.getroot().findall(".//w:t", NS):
        text = text_node.text or ""
        if "[" not in text:
            continue
        for key, value in variants:
            key_pattern = _token_key_pattern(key)
            text = re.sub(rf"\[\s*\|\s*{key_pattern}\s*\|\s*\]", value, text)
            text = re.sub(rf"\[\s*{key_pattern}\s*\]", value, text)
        text_node.text = text
    return tree


def _replace_paragraph_tokens(tree: ET.ElementTree, context: dict[str, str]) -> ET.ElementTree:
    variants = _context_token_variants(context)
    for paragraph in tree.getroot().findall(".//w:p", NS):
        text_nodes = paragraph.findall(".//w:t", NS)
        if not text_nodes:
            continue
        text = "".join(node.text or "" for node in text_nodes)
        if "[" not in text:
            continue
        replaced = text
        for key, value in variants:
            key_pattern = _token_key_pattern(key)
            replaced = re.sub(rf"\[\s*\|\s*{key_pattern}\s*\|\s*\]", value, replaced)
            replaced = re.sub(rf"\[\s*{key_pattern}\s*\]", value, replaced)
        if replaced == text:
            continue
        text_nodes[0].text = replaced
        for node in text_nodes[1:]:
            node.text = ""
    return tree


def _find_parent(root: ET.Element, node: ET.Element) -> ET.Element | None:
    for parent in root.iter():
        for child in list(parent):
            if child is node:
                return parent
    return None


def _set_cell_text(cell: ET.Element, value: str) -> None:
    text_nodes = cell.findall(".//w:t", NS)
    if text_nodes:
        text_nodes[0].text = value
        for node in text_nodes[1:]:
            node.text = ""
        return

    paragraph = cell.find("w:p", NS)
    if paragraph is None:
        paragraph = ET.SubElement(cell, f"{{{W_NS}}}p")
    run = paragraph.find("w:r", NS)
    if run is None:
        run = ET.SubElement(paragraph, f"{{{W_NS}}}r")
    text = ET.SubElement(run, f"{{{W_NS}}}t")
    text.text = value


def _expand_service_rows(tree: ET.ElementTree, service_rows: list[dict[str, str]]) -> ET.ElementTree:
    root = tree.getroot()
    token = "qdfOrderServices_Ordinal_Service_Quantity_ServiceDate"
    for table in root.findall(".//w:tbl", NS):
        rows = table.findall("w:tr", NS)
        for row in rows:
            if len(row.findall("w:tc", NS)) < 4:
                continue
            row_text = "".join(text.text or "" for text in row.findall(".//w:t", NS))
            if token not in row_text:
                continue

            row_index = list(table).index(row)
            table.remove(row)
            if not service_rows:
                return tree
            for offset, item in enumerate(service_rows):
                new_row = ET.fromstring(ET.tostring(row, encoding="utf-8"))
                cells = new_row.findall("w:tc", NS)
                values = [
                    item.get("ordinal", ""),
                    item.get("service", ""),
                    item.get("quantity", "1"),
                    item.get("date", ""),
                ]
                for cell, value in zip(cells, values):
                    _set_cell_text(cell, value)
                table.insert(row_index + offset, new_row)
            return tree

    return tree


def _generate_docx(
    template_path: Path,
    output_path: Path,
    context: dict[str, str],
    service_rows: list[dict[str, str]] | None = None,
    cleanup_xml: bool = False,
) -> None:
    with zipfile.ZipFile(template_path, "r") as source_zip:
        with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as target_zip:
            for item in source_zip.infolist():
                file_bytes = source_zip.read(item.filename)
                if item.filename == "word/document.xml":
                    xml_text = file_bytes.decode("utf-8")
                    xml_text = _replace_text_tokens(xml_text, context)
                    if cleanup_xml:
                        xml_text = _cleanup_contract_xml(xml_text)
                    needs_tree_pass = (
                        "[" in xml_text
                        or _has_context_bookmarks(xml_text, context)
                        or (
                            bool(service_rows)
                            and "qdfOrderServices_Ordinal_Service_Quantity_ServiceDate" in xml_text
                        )
                    )
                    if needs_tree_pass:
                        try:
                            tree = ET.ElementTree(ET.fromstring(xml_text))
                            tree = _replace_paragraph_tokens(tree, context)
                            tree = _replace_text_node_tokens(tree, context)
                            tree = _replace_split_token_nodes(tree, context)
                            tree = _append_bookmark_value(tree, context)
                            tree = _expand_service_rows(tree, service_rows or [])
                            file_bytes = ET.tostring(tree.getroot(), encoding="utf-8", xml_declaration=True)
                        except ParseError:
                            # Some client templates contain non-standard Word XML fragments.
                            # In that case we still keep token replacement instead of failing generation.
                            file_bytes = xml_text.encode("utf-8")
                    else:
                        file_bytes = xml_text.encode("utf-8")
                target_zip.writestr(item, file_bytes)


def _generate_xml(template_path: Path, output_path: Path, context: dict[str, str]) -> None:
    xml_text = template_path.read_text(encoding="utf-8", errors="ignore")
    xml_text = _replace_text_tokens(xml_text, context)
    for key, value in context.items():
        xml_text = xml_text.replace(f"{{{{{key}}}}}", value)
    output_path.write_text(xml_text, encoding="utf-8")


def _write_xls_cell(target_sheet, source_sheet, row_index: int, col_index: int, value: object) -> None:
    existing_xf_idx = None
    existing_row = target_sheet._Worksheet__rows.get(row_index)
    if existing_row is not None:
        existing_cell = existing_row._Row__cells.get(col_index)
        if existing_cell is not None:
            existing_xf_idx = getattr(existing_cell, "xf_idx", None)

    target_sheet.write(row_index, col_index, value)
    row = target_sheet._Worksheet__rows.get(row_index)
    if row is None:
        return
    cell = row._Row__cells.get(col_index)
    if cell is None:
        return
    if existing_xf_idx is not None:
        cell.xf_idx = existing_xf_idx
        return
    try:
        cell.xf_idx = source_sheet.cell_xf_index(row_index, col_index)
    except IndexError:
        # Some legacy sheets have blank trailing rows without style metadata.
        # In that case we keep the written value without cloning formatting.
        return


def _xls_excel_date(value: date | datetime | str | None) -> float | str:
    if value in (None, ""):
        return ""
    if isinstance(value, datetime):
        value = value.date()
    if not isinstance(value, date):
        return str(value)
    if value <= date(1900, 1, 1):
        return ""
    if value < date(1900, 3, 1):
        return value.strftime("%d.%m.%Y")
    return xldate.xldate_from_date_tuple((value.year, value.month, value.day), 0)


def _exam_field(fields: dict, *keys: str) -> str:
    lowered = {str(key).lower(): value for key, value in fields.items()}
    for key in keys:
        value = fields.get(key)
        if value in (None, ""):
            value = lowered.get(key.lower())
        if value not in (None, ""):
            return str(value).strip()
    return ""


def _build_exam_export(exam: DoctorExam | None) -> dict[str, object]:
    if exam is None:
        return {
            "date": "",
            "title": "",
            "complaints": "",
            "anamnesis": "",
            "objective": "",
            "diagnosis": "",
            "doctor": "",
        }

    fields = exam.fields_json or {}
    result_text = str(exam.result_text or "").strip()
    diagnosis = (
        str(exam.diagnosis or "").strip()
        or _exam_field(fields, "diagnosis", "diagnosisShort", "diagnosisText", "diagnoz", "conclusion")
        or result_text
    )
    objective = (
        _exam_field(
            fields,
            "objective",
            "objectiveData",
            "objectiveText",
            "status",
            "statusLocalis",
            "inspection",
            "exam",
            "result",
        )
        or result_text
    )
    return {
        "date": exam.completed_at.date() if exam.completed_at else "",
        "title": _exam_field(fields, "conclusionTitle", "title", "caption"),
        "complaints": _exam_field(fields, "complaints", "complaint", "complaintsText"),
        "anamnesis": _exam_field(fields, "anamnesis", "anamnesisText", "history", "anamnesisVitae"),
        "objective": objective,
        "diagnosis": diagnosis,
        "doctor": str(exam.doctor_name or "").strip(),
    }


def _is_rural_address(*parts: str) -> bool:
    text = " ".join(part for part in parts if part).lower()
    return bool(re.search(r"\b(пос|пгт|село|дер|деревня|снт|рп|гп)\b", text))


def _split_policy(policy: str) -> tuple[str, str]:
    cleaned = re.sub(r"\s+", " ", str(policy or "").strip())
    if not cleaned:
        return "", ""
    parts = cleaned.split(" ", 1)
    if len(parts) == 1:
        digits = re.sub(r"\D", "", parts[0])
        if len(digits) > 10:
            return digits[:-10], digits[-10:]
        return "", parts[0]
    return parts[0], parts[1]


def _split_document(series: str, number: str) -> tuple[str, str]:
    merged = " ".join(part for part in [str(series or "").strip(), str(number or "").strip()] if part).strip()
    digits = re.sub(r"\D", "", merged)
    if len(digits) >= 10:
        return digits[:4], digits[4:10]
    return str(series or "").strip(), str(number or "").strip()


def _clear_xls_cells(target_sheet, source_sheet, coordinates: list[tuple[int, int]]) -> None:
    for row_index, col_index in coordinates:
        _write_xls_cell(target_sheet, source_sheet, row_index, col_index, "")


def _fill_exam_block(
    target_sheet,
    source_sheet,
    data: dict[str, object],
    *,
    date_cell: tuple[int, int],
    title_cell: tuple[int, int],
    complaints_cell: tuple[int, int],
    anamnesis_cell: tuple[int, int],
    objective_cell: tuple[int, int],
    diagnosis_cell: tuple[int, int],
    doctor_cell: tuple[int, int],
) -> None:
    _write_xls_cell(target_sheet, source_sheet, *date_cell, _xls_excel_date(data.get("date")))
    _write_xls_cell(target_sheet, source_sheet, *title_cell, str(data.get("title") or ""))
    _write_xls_cell(target_sheet, source_sheet, *complaints_cell, str(data.get("complaints") or ""))
    _write_xls_cell(target_sheet, source_sheet, *anamnesis_cell, str(data.get("anamnesis") or ""))
    _write_xls_cell(target_sheet, source_sheet, *objective_cell, str(data.get("objective") or ""))
    _write_xls_cell(target_sheet, source_sheet, *diagnosis_cell, str(data.get("diagnosis") or ""))
    _write_xls_cell(target_sheet, source_sheet, *doctor_cell, str(data.get("doctor") or ""))


def _write_xls_pairs(target_sheet, source_sheet, pairs: list[tuple[tuple[int, int], object]]) -> None:
    for (row_index, col_index), value in pairs:
        _write_xls_cell(target_sheet, source_sheet, row_index, col_index, value)


def _normalize_xls_auto_label(value: object) -> str:
    text = str(value or "").strip().lower().replace("ё", "е")
    return re.sub(r"[^0-9a-zа-я]+", " ", text).strip()


def _iter_xls_auto_markers(source_book) -> list[tuple[int, object, int, int, str]]:
    markers: list[tuple[int, object, int, int, str]] = []
    for sheet_index, source_sheet in enumerate(source_book.sheets()):
        seen_merges: set[tuple[int, int, int, int]] = set()
        for row_index in range(source_sheet.nrows):
            for col_index in range(source_sheet.ncols):
                try:
                    xf_index = source_sheet.cell_xf_index(row_index, col_index)
                    bg_index = source_book.xf_list[xf_index].background.pattern_colour_index
                except IndexError:
                    continue
                if bg_index != 13:
                    continue

                merge = next(
                    (
                        item
                        for item in source_sheet.merged_cells
                        if item[0] <= row_index < item[1] and item[2] <= col_index < item[3]
                    ),
                    None,
                )
                if merge is not None:
                    if merge in seen_merges:
                        continue
                    seen_merges.add(merge)
                    row_index, col_index = merge[0], merge[2]

                label = _normalize_xls_auto_label(source_sheet.cell_value(row_index, col_index))
                if "авто" in label:
                    markers.append((sheet_index, source_sheet, row_index, col_index, label))
    return markers


def _xls_auto_marker_values(
    context: dict[str, str],
    client: Client,
    encounter: Encounter | None,
    exams_by_role: dict[str, DoctorExam],
) -> list[tuple[tuple[str, ...], object]]:
    issue_date = encounter.encounter_date if encounter else date.today()
    therapist = _build_exam_export(exams_by_role.get("therapist"))
    chairman = _build_exam_export(exams_by_role.get("chairman"))
    return [
        (("терапевт",), _exam_conclusion_line(exams_by_role.get("therapist"))),
        (("офтальмолог", "окулист"), _exam_conclusion_line(exams_by_role.get("ophthalmologist"))),
        (("невролог",), _exam_conclusion_line(exams_by_role.get("neurologist"))),
        (("лор", "отоларинголог"), _exam_conclusion_line(exams_by_role.get("otolaryngologist"))),
        (("хирург",), _exam_conclusion_line(exams_by_role.get("surgeon"))),
        (("психиатр нарколог", "нарколог"), _exam_conclusion_line(exams_by_role.get("psychiatrist-narcologist"))),
        (("психиатр",), _exam_conclusion_line(exams_by_role.get("psychiatrist"))),
        (("дермат",), _exam_conclusion_line(exams_by_role.get("dermatologist"))),
        (("гинеколог",), _exam_conclusion_line(exams_by_role.get("gynecologist"))),
        (("председатель", "глав врач", "главный врач", "подписант"), _first_non_empty(chairman.get("doctor"), therapist.get("doctor"), context.get("Doctor"))),
        (("врач",), _first_non_empty(therapist.get("doctor"), context.get("Doctor"))),
        (("фио", "пациент"), context.get("ClientCalc", "")),
        (("дата рождения", "др"), _xls_excel_date(client.birth_date)),
        (("возраст",), _age_at_date(client.birth_date, issue_date)),
        (("пол",), context.get("SexCalc", "")),
        (("адрес",), context.get("AddressCalc", "")),
        (("телефон",), context.get("Phone", "")),
        (("снилс",), context.get("SNILS", "")),
        (("паспорт серия", "серия"), context.get("DocumentSeries", "")),
        (("паспорт номер", "номер паспорта"), context.get("DocumentNumber", "")),
        (("кем выдан",), context.get("WhoGive", "")),
        (("дата выдачи",), context.get("DocumentDate", "")),
        (("организация", "место работы", "работа"), context.get("CompanyName", "")),
        (("должность", "профессия"), _first_non_empty(context.get("Post"), context.get("PositionApplied"))),
        (("услуга", "услуги"), context.get("Services", "")),
        (("номер бланка", "бланк"), context.get("BlankFullNumber") or context.get("BlankNumber", "")),
        (("номер",), context.get("ReferenceNumber", "")),
        (("дата",), _xls_excel_date(issue_date)),
        (("заключение", "итог"), context.get("Conclusion", "")),
    ]


def _apply_xls_auto_markers(
    source_book,
    target_book,
    context: dict[str, str],
    client: Client,
    encounter: Encounter | None,
    exams_by_role: dict[str, DoctorExam],
) -> None:
    values = _xls_auto_marker_values(context, client, encounter, exams_by_role)
    for sheet_index, source_sheet, row_index, col_index, label in _iter_xls_auto_markers(source_book):
        value = None
        for aliases, candidate in values:
            if any(alias in label for alias in aliases):
                value = candidate
                break
        if value is None:
            continue
        target_sheet = target_book.get_sheet(sheet_index)
        _write_xls_cell(target_sheet, source_sheet, row_index, col_index, value)


def _exam_map(exams: list[DoctorExam]) -> dict[str, DoctorExam]:
    result: dict[str, DoctorExam] = {}
    for exam in exams:
        role_key = str(exam.doctor_role_id or "").strip().lower()
        result.setdefault(role_key, exam)
    return result


def _first_non_empty(*values: object) -> str:
    for value in values:
        text = str(value or "").strip()
        if text:
            return text
    return ""


def _exam_conclusion_line(exam: DoctorExam | None, fallback: str = "Противопоказания отсутствуют") -> str:
    data = _build_exam_export(exam)
    doctor = str(data.get("doctor") or "").strip()
    conclusion = _first_non_empty(data.get("diagnosis"), data.get("objective"), data.get("title"), fallback)
    return " ".join(part for part in [doctor, conclusion] if part).strip()


def _age_at_date(birth_date: date | None, on_date: date | None) -> str:
    if birth_date is None:
        return ""
    check_date = on_date or date.today()
    years = check_date.year - birth_date.year - ((check_date.month, check_date.day) < (birth_date.month, birth_date.day))
    return str(years)


def _sheet_pair(source_book, target_book, sheet_name: str):
    if sheet_name not in source_book.sheet_names():
        return None, None, None
    index = source_book.sheet_names().index(sheet_name)
    return source_book.sheet_by_index(index), target_book.get_sheet(index), index


def _fill_contract_xls_sheet(
    source_sheet,
    target_sheet,
    context: dict[str, str],
    client: Client,
    encounter: Encounter | None,
    runtime_values: dict[str, object],
) -> None:
    service_rows = runtime_values.get("service_rows", [])
    first_service = service_rows[0]["service"] if service_rows else context.get("Services", "")
    quantity = service_rows[0]["quantity"] if service_rows else "1"
    total_amount = str(encounter.total_amount or "") if encounter else ""
    doctor_name = context.get("UserName", "")
    full_name = context.get("ClientCalc", "")
    birth_date = context.get("BirthDateCalc", "")
    address = context.get("AddressCalc", "")
    passport_summary = (
        f"Паспорт РФ Серия:{context.get('DocumentSeries', '')} "
        f"Номер:{context.get('DocumentNumber', '')} "
        f"Кем выдан: {context.get('WhoGive', '')} - {context.get('DocumentDate', '')}"
    ).strip()
    _write_xls_pairs(
        target_sheet,
        source_sheet,
        [
            ((6, 2), f"Я, {full_name}, {birth_date} г. рождения,"),
            ((8, 6), address),
            ((8, 33), f"/ {doctor_name}" if doctor_name else ""),
            ((12, 34), context.get("ReferenceNumber", "")),
            ((14, 37), _xls_excel_date(encounter.encounter_date if encounter else date.today())),
            ((21, 1), f"{full_name} ( {context.get('Phone', '')} )"),
            ((24, 1), full_name),
            ((27, 16), _xls_excel_date(encounter.encounter_date if encounter else date.today())),
            ((31, 1), f"Я, {full_name}, {birth_date} г. рождения, зарегистрированная по адресу:"),
            ((32, 1), address),
            ((33, 1), passport_summary),
            ((33, 23), first_service),
            ((33, 37), quantity),
            ((33, 39), total_amount),
            ((37, 28), f"/ {full_name}" if full_name else ""),
            ((48, 1), f"Настоящее согласие дано мной {context.get('VisitDate', '')} и действует бессрочно."),
            ((55, 1), full_name),
            ((82, 23), total_amount),
            ((82, 33), f"/ {doctor_name}" if doctor_name else ""),
            ((86, 23), total_amount),
            ((86, 33), f"/ {doctor_name}" if doctor_name else ""),
            ((89, 33), f"Ф.И.О.: {full_name}" if full_name else ""),
            ((91, 33), f"Адрес места жительства: {address}" if address else ""),
            ((93, 35), client.document_type or "Паспорт РФ"),
            ((94, 35), context.get("DocumentSeries", "")),
            ((95, 35), context.get("DocumentNumber", "")),
            ((96, 33), f"Кем выдан: {context.get('WhoGive', '')}".strip()),
            ((99, 35), _xls_excel_date(client.document_issued_date)),
            ((100, 35), context.get("Phone", "")),
            ((106, 36), f"/ {full_name}" if full_name else ""),
        ],
    )


def _fill_086_xls_sheet(
    source_sheet,
    target_sheet,
    context: dict[str, str],
    client: Client,
    encounter: Encounter | None,
    exams_by_role: dict[str, DoctorExam],
) -> None:
    issue_date = encounter.encounter_date if encounter else date.today()
    _write_xls_pairs(
        target_sheet,
        source_sheet,
        [
            ((10, 12), context.get("ReferenceNumber", "")),
            ((13, 5), context.get("ClientCalc", "")),
            ((14, 5), _xls_excel_date(client.birth_date)),
            ((15, 10), context.get("SubjectCalc", "")),
            ((16, 3), context.get("DistrictCalc", "")),
            ((17, 4), context.get("CityCalc", "")),
            ((17, 9), " ".join(
                part
                for part in [
                    context.get("StreetCalc", ""),
                    context.get("HouseNumberCalc", ""),
                    context.get("ApartmentNumberCalc", ""),
                ]
                if part
            )),
            ((18, 5), _first_non_empty(context.get("WorkPlace"), context.get("CompanyName"), "по месту требования")),
            ((23, 4), _first_non_empty(_build_exam_export(exams_by_role.get("therapist")).get("diagnosis"), "Дз: практически здоров")),
            ((23, 15), _build_exam_export(exams_by_role.get("therapist")).get("doctor", "")),
            ((24, 4), _build_exam_export(exams_by_role.get("surgeon")).get("diagnosis", "")),
            ((24, 15), _build_exam_export(exams_by_role.get("surgeon")).get("doctor", "")),
            ((25, 4), _build_exam_export(exams_by_role.get("neurologist")).get("diagnosis", "")),
            ((25, 15), _build_exam_export(exams_by_role.get("neurologist")).get("doctor", "")),
            ((27, 5), _build_exam_export(exams_by_role.get("otolaryngologist")).get("diagnosis", "")),
            ((27, 15), _build_exam_export(exams_by_role.get("otolaryngologist")).get("doctor", "")),
            ((44, 1), context.get("Conclusion", "")),
            ((48, 1), _xls_excel_date(issue_date)),
            ((50, 12), _first_non_empty(_build_exam_export(exams_by_role.get("therapist")).get("doctor"), context.get("Doctor", ""))),
            ((53, 12), _first_non_empty(_build_exam_export(exams_by_role.get("chairman")).get("doctor"), _build_exam_export(exams_by_role.get("therapist")).get("doctor"), context.get("Doctor", ""))),
        ],
    )


def _fill_eeg_xls_sheet(
    source_sheet,
    target_sheet,
    context: dict[str, str],
    client: Client,
    encounter: Encounter | None,
    exams: list[DoctorExam],
) -> None:
    eeg_exam = next((exam for exam in exams if "ээг" in f"{exam.result_text or ''} {exam.diagnosis or ''}".lower()), None)
    eeg_data = _build_exam_export(eeg_exam)
    doctor_name = _first_non_empty(eeg_data.get("doctor"), context.get("Doctor"))
    _write_xls_pairs(
        target_sheet,
        source_sheet,
        [
            ((9, 8), _xls_excel_date(encounter.encounter_date if encounter else date.today())),
            ((11, 8), context.get("ClientCalc", "")),
            ((13, 8), _age_at_date(client.birth_date, encounter.encounter_date if encounter else None)),
            ((15, 8), context.get("CardNumber", "") or context.get("ReferenceNumber", "")),
            ((17, 8), doctor_name),
        ],
    )


def _fill_chod_xls_sheet(
    source_sheet,
    target_sheet,
    context: dict[str, str],
    encounter: Encounter | None,
) -> None:
    issue_date = encounter.encounter_date if encounter else date.today()
    _write_xls_pairs(
        target_sheet,
        source_sheet,
        [
            ((17, 15), context.get("BlankNumber", "") or context.get("ReferenceNumber", "")),
            ((20, 3), context.get("ClientCalc", "")),
            ((21, 11), issue_date.day),
            ((21, 20), issue_date.year),
            ((23, 3), context.get("SubjectCalc", "")),
            ((24, 5), context.get("DistrictCalc", "")),
            ((25, 4), context.get("CityCalc", "")),
            ((27, 5), context.get("StreetCalc", "")),
            ((28, 5), " ".join(part for part in [context.get("HouseNumberCalc", ""), context.get("ApartmentNumberCalc", "")] if part)),
            ((30, 16), _xls_excel_date(issue_date)),
            ((36, 12), context.get("Doctor", "")),
        ],
    )


def _restriction_text(value: object) -> str:
    text = str(value or "").strip().lower()
    if not text or text in {"0", "нет", "false", "no", "не установлено"}:
        return "не установлено"
    return "установлено"


def _fill_driver_xls_sheets(
    source_book,
    target_book,
    context: dict[str, str],
    client: Client,
    encounter: Encounter | None,
    exams_by_role: dict[str, DoctorExam],
) -> None:
    driver_lines = [
        _exam_conclusion_line(exams_by_role.get("therapist")),
        _exam_conclusion_line(exams_by_role.get("ophthalmologist")),
        _exam_conclusion_line(exams_by_role.get("neurologist"), "не установлено"),
        _exam_conclusion_line(exams_by_role.get("otolaryngologist"), "не установлено"),
        _first_non_empty(
            _build_exam_export(exams_by_role.get("chairman")).get("doctor"),
            _build_exam_export(exams_by_role.get("therapist")).get("doctor"),
        ),
    ]
    issue_date = encounter.encounter_date if encounter else date.today()
    front_source, front_target, _ = _sheet_pair(source_book, target_book, "Водительская Лицевая")
    if front_source and front_target:
        _write_xls_pairs(
            front_target,
            front_source,
            [
                ((15, 28), context.get("ClientCalc", "")),
                ((16, 35), context.get("BirthDateCalc_DAY", "")),
                ((16, 41), context.get("BirthDateCalc_DATEMONTH", "")),
                ((16, 48), context.get("BirthDateCalc_YEAR", "")),
                ((18, 36), context.get("SubjectCalc", "")),
                ((19, 31), context.get("DistrictCalc", "")),
                ((20, 30), context.get("CityCalc", "")),
                ((21, 30), context.get("StreetCalc", "")),
                ((21, 45), context.get("HouseNumberCalc", "")),
                ((22, 31), context.get("HouseBodyCalc", "")),
                ((22, 38), context.get("ApartmentNumberCalc", "")),
                ((23, 41), issue_date.day),
                ((23, 45), context.get("VisitDate_DATEMONTH", "")),
                ((23, 49), issue_date.year),
                ((28, 12), driver_lines[0]),
                ((28, 39), driver_lines[0]),
                ((30, 12), driver_lines[1]),
                ((30, 39), driver_lines[1]),
                ((35, 12), driver_lines[2]),
                ((35, 39), driver_lines[2]),
                ((37, 12), driver_lines[3]),
                ((37, 39), driver_lines[3]),
            ],
        )
    back_source, back_target, _ = _sheet_pair(source_book, target_book, "Водительская Оборотная")
    if back_source and back_target:
        restriction_cells = [
            ((14, 29), _restriction_text(context.get("DriveShipCalc"))),
            ((14, 62), _restriction_text(context.get("DriveShipCalc"))),
            ((17, 29), _restriction_text(context.get("ManualControlCalc"))),
            ((17, 62), _restriction_text(context.get("ManualControlCalc"))),
            ((20, 29), _restriction_text(context.get("AutomaticTransmissionCalc"))),
            ((20, 62), _restriction_text(context.get("AutomaticTransmissionCalc"))),
            ((25, 29), _restriction_text(context.get("ParkingSystemCalc"))),
            ((25, 62), _restriction_text(context.get("ParkingSystemCalc"))),
            ((27, 29), _restriction_text(context.get("VisionTCCalc"))),
            ((27, 62), _restriction_text(context.get("VisionTCCalc"))),
            ((29, 29), _restriction_text(context.get("HearingTCCalc"))),
            ((29, 62), _restriction_text(context.get("HearingTCCalc"))),
            ((31, 29), _restriction_text(context.get("3040"))),
            ((31, 62), _restriction_text(context.get("3040"))),
            ((33, 29), _restriction_text(context.get("3201"))),
            ((33, 62), _restriction_text(context.get("3201"))),
            ((36, 8), driver_lines[4]),
            ((36, 41), driver_lines[4]),
        ]
        _write_xls_pairs(back_target, back_source, restriction_cells)


def _fill_tractor_xls_sheets(source_book, target_book, exams_by_role: dict[str, DoctorExam]) -> None:
    tractor_lines = [
        _exam_conclusion_line(exams_by_role.get("therapist")),
        _exam_conclusion_line(exams_by_role.get("ophthalmologist")),
        _exam_conclusion_line(exams_by_role.get("neurologist")),
        _exam_conclusion_line(exams_by_role.get("otolaryngologist")),
    ]
    front_source, front_target, _ = _sheet_pair(source_book, target_book, "Тракторная Лицевая")
    if front_source and front_target:
        _write_xls_pairs(
            front_target,
            front_source,
            [
                ((29, 12), tractor_lines[0]),
                ((29, 39), tractor_lines[0]),
                ((31, 12), tractor_lines[1]),
                ((31, 39), tractor_lines[1]),
                ((35, 12), tractor_lines[2]),
                ((35, 39), tractor_lines[2]),
                ((37, 12), tractor_lines[3]),
                ((37, 39), tractor_lines[3]),
            ],
        )
    back_source, back_target, _ = _sheet_pair(source_book, target_book, "Тракторная оборотная")
    if back_source and back_target:
        signer = _first_non_empty(_build_exam_export(exams_by_role.get("chairman")).get("doctor"), _build_exam_export(exams_by_role.get("therapist")).get("doctor"))
        _write_xls_pairs(
            back_target,
            back_source,
            [
                ((36, 5), signer),
                ((36, 25), signer),
            ],
        )


def _fill_amb_opo_xls_sheet(
    source_sheet,
    target_sheet,
    context: dict[str, str],
    client: Client,
    encounter: Encounter | None,
    exams_by_role: dict[str, DoctorExam],
) -> None:
    issue_date = encounter.encounter_date if encounter else date.today()
    work_place = ", ".join(part for part in [context.get("CompanyName", ""), context.get("Post", "")] if part and part != "не указано")
    _write_xls_pairs(
        target_sheet,
        source_sheet,
        [
            ((2, 35), context.get("ReferenceNumber", "")),
            ((16, 54), _xls_excel_date(issue_date)),
            ((17, 43), context.get("ClientCalc", "")),
            ((18, 35), context.get("SexCalc", "")),
            ((18, 48), _xls_excel_date(client.birth_date)),
            ((19, 54), context.get("CityCalc", "")),
            ((20, 35), context.get("DistrictCalc", "")),
            ((20, 49), context.get("CityCalc", "")),
            ((21, 40), context.get("StreetCalc", "")),
            ((22, 35), context.get("AddressCalc", "")),
            ((22, 56), context.get("Phone", "")),
            ((24, 55), context.get("SNILS", "")),
            ((26, 48), client.document_type or "Паспорт РФ"),
            ((26, 56), context.get("DocumentSeries", "")),
            ((26, 59), context.get("DocumentNumber", "")),
            ((38, 44), work_place),
            ((72, 11), _build_exam_export(exams_by_role.get("therapist")).get("doctor", "")),
            ((72, 42), _build_exam_export(exams_by_role.get("psychiatrist")).get("doctor", "")),
            ((94, 11), _build_exam_export(exams_by_role.get("neurologist")).get("doctor", "")),
            ((94, 42), _build_exam_export(exams_by_role.get("otolaryngologist")).get("doctor", "")),
        ],
    )


def _fill_journal_344_sheet(
    source_sheet,
    target_sheet,
    context: dict[str, str],
    client: Client,
    encounter: Encounter | None,
) -> None:
    issue_date = encounter.encounter_date if encounter else date.today()
    _write_xls_pairs(
        target_sheet,
        source_sheet,
        [
            ((7, 0), 1),
            ((7, 1), _xls_excel_date(issue_date)),
            ((7, 2), context.get("BlankNumber", "") or context.get("ReferenceNumber", "")),
            ((7, 3), context.get("ClientCalc", "")),
            ((7, 4), _xls_excel_date(client.birth_date)),
            ((7, 5), context.get("Conclusion", "")),
            ((7, 6), ""),
            ((7, 7), ""),
        ],
    )


def _generate_prof_amb_xls(
    template_path: Path,
    output_path: Path,
    context: dict[str, str],
    client: Client,
    encounter: Encounter | None,
    exams: list[DoctorExam],
    print_variant: str | None = None,
) -> None:
    source_book = xlrd.open_workbook(file_contents=template_path.read_bytes(), formatting_info=True)
    amb_index = source_book.sheet_names().index("Амб")
    source_sheet = source_book.sheet_by_index(amb_index)
    target_book = copy_xls_workbook(source_book)
    target_sheet = target_book.get_sheet(amb_index)
    target_book._Workbook__active_sheet = amb_index

    address = context.get("AddressCalc", "")
    city = context.get("CityCalc", "")
    district = context.get("DistrictCalc", "")
    street = context.get("StreetCalc", "") or address
    oms_series, oms_number = _split_policy(context.get("PolisOMS", ""))
    passport_series, passport_number = _split_document(context.get("DocumentSeries", ""), context.get("DocumentNumber", ""))
    visit_date = encounter.encounter_date if encounter else None
    work_place = ", ".join(part for part in [context.get("CompanyName", ""), context.get("Post", "")] if part and part != "не указано")

    header_values: list[tuple[tuple[int, int], object]] = [
        ((15, 54), context.get("ReferenceNumber", "")),
        ((16, 47), _xls_excel_date(visit_date)),
        ((17, 43), context.get("ClientCalc", "")),
        ((18, 35), context.get("SexCalc", "")),
        ((18, 48), _xls_excel_date(client.birth_date)),
        ((19, 54), context.get("SubjectCalc", "")),
        ((20, 35), district),
        ((20, 50), city),
        ((21, 40), city),
        ((22, 35), street),
        ((22, 56), context.get("Phone", "")),
        ((23, 48), 2 if _is_rural_address(address, city, district) else 1),
        ((24, 35), oms_series),
        ((24, 46), oms_number),
        ((24, 55), context.get("SNILS", "")),
        ((26, 48), "Паспорт РФ" if passport_series or passport_number else ""),
        ((26, 56), passport_series),
        ((26, 59), passport_number),
        ((38, 44), work_place),
    ]
    for (row_index, col_index), value in header_values:
        _write_xls_cell(target_sheet, source_sheet, row_index, col_index, value)

    _clear_xls_cells(
        target_sheet,
        source_sheet,
        [
            (30, 1),
            (31, 14),
            (33, 1),
            (40, 1),
            (43, 1),
            (45, 18),
            (45, 26),
            (47, 18),
            (47, 26),
            (47, 40),
            (47, 54),
            (48, 44),
            (49, 18),
            (49, 26),
        ],
    )

    exams_by_role: dict[str, DoctorExam] = {}
    for exam in exams:
        role_key = str(exam.doctor_role_id or "").strip().lower()
        exams_by_role.setdefault(role_key, exam)

    psychiatrist_exam = exams_by_role.get("psychiatrist")
    narcologist_exam = exams_by_role.get("psychiatrist-narcologist")
    psychiatrist_data = _build_exam_export(psychiatrist_exam)
    narcologist_data = _build_exam_export(narcologist_exam)
    if not psychiatrist_data["objective"]:
        psychiatrist_data["objective"] = narcologist_data["objective"]
    if narcologist_data["diagnosis"]:
        psychiatrist_data["diagnosis"] = ", ".join(
            part for part in [str(psychiatrist_data["diagnosis"] or ""), str(narcologist_data["diagnosis"] or "")] if part
        )
    if narcologist_data["doctor"] and not psychiatrist_data["doctor"]:
        psychiatrist_data["doctor"] = narcologist_data["doctor"]

    _fill_exam_block(
        target_sheet,
        source_sheet,
        _build_exam_export(exams_by_role.get("therapist")),
        date_cell=(51, 24),
        title_cell=(52, 10),
        complaints_cell=(53, 10),
        anamnesis_cell=(54, 13),
        objective_cell=(56, 1),
        diagnosis_cell=(59, 1),
        doctor_cell=(64, 11),
    )
    _fill_exam_block(
        target_sheet,
        source_sheet,
        _build_exam_export(exams_by_role.get("dermatologist")),
        date_cell=(51, 55),
        title_cell=(52, 41),
        complaints_cell=(53, 41),
        anamnesis_cell=(54, 44),
        objective_cell=(56, 32),
        diagnosis_cell=(59, 32),
        doctor_cell=(64, 42),
    )
    _fill_exam_block(
        target_sheet,
        source_sheet,
        _build_exam_export(exams_by_role.get("otolaryngologist")),
        date_cell=(66, 24),
        title_cell=(67, 10),
        complaints_cell=(68, 10),
        anamnesis_cell=(69, 13),
        objective_cell=(71, 1),
        diagnosis_cell=(74, 1),
        doctor_cell=(79, 11),
    )
    _fill_exam_block(
        target_sheet,
        source_sheet,
        psychiatrist_data,
        date_cell=(66, 55),
        title_cell=(67, 41),
        complaints_cell=(68, 41),
        anamnesis_cell=(69, 44),
        objective_cell=(71, 32),
        diagnosis_cell=(74, 32),
        doctor_cell=(79, 42),
    )
    _fill_exam_block(
        target_sheet,
        source_sheet,
        _build_exam_export(exams_by_role.get("neurologist")),
        date_cell=(81, 24),
        title_cell=(82, 10),
        complaints_cell=(83, 10),
        anamnesis_cell=(84, 13),
        objective_cell=(86, 1),
        diagnosis_cell=(89, 1),
        doctor_cell=(94, 11),
    )
    _fill_exam_block(
        target_sheet,
        source_sheet,
        _build_exam_export(exams_by_role.get("gynecologist")),
        date_cell=(96, 24),
        title_cell=(97, 10),
        complaints_cell=(98, 10),
        anamnesis_cell=(99, 13),
        objective_cell=(101, 1),
        diagnosis_cell=(104, 1),
        doctor_cell=(109, 11),
    )

    _apply_xls_auto_markers(source_book, target_book, context, client, encounter, exams_by_role)
    _apply_print_variant_to_xls_workbook(target_book, print_variant)
    target_book.save(str(output_path))


def _apply_print_variant_to_xls_workbook(target_book, print_variant: str | None) -> None:
    variant = str(print_variant or "").strip().lower()
    if not variant:
        return

    sheet_by_variant = {
        "driver_front": "Водительская Лицевая",
        "driver_back": "Водительская Оборотная",
        "tractor_front": "Тракторная Лицевая",
        "tractor_back": "Тракторная оборотная",
    }
    target_sheet_name = sheet_by_variant.get(variant)
    if not target_sheet_name:
        raise ValueError(f"Неизвестный вариант печати: {print_variant}")

    worksheets = list(getattr(target_book, "_Workbook__worksheets", []) or [])
    if not worksheets:
        return

    kept_sheets = [sheet for sheet in worksheets if getattr(sheet, "name", "") == target_sheet_name]
    if not kept_sheets:
        raise ValueError(f"В шаблоне не найден лист для печати: {target_sheet_name}")

    target_book._Workbook__worksheets = kept_sheets
    target_book._Workbook__worksheet_idx_from_name = {target_sheet_name: 0}
    target_book._Workbook__active_sheet = 0


def _generate_xls(
    template_path: Path,
    output_path: Path,
    context: dict[str, str],
    client: Client,
    encounter: Encounter | None,
    exams: list[DoctorExam],
) -> None:
    source_book = xlrd.open_workbook(file_contents=template_path.read_bytes(), formatting_info=True)
    if "Амб" in source_book.sheet_names():
        _generate_prof_amb_xls(template_path, output_path, context, client, encounter, exams)
        return
    shutil.copy2(template_path, output_path)


def _generate_runtime_xls(
    template_path: Path,
    output_path: Path,
    context: dict[str, str],
    client: Client,
    encounter: Encounter | None,
    runtime_values: dict[str, object],
    print_variant: str | None = None,
) -> None:
    source_book = xlrd.open_workbook(file_contents=template_path.read_bytes(), formatting_info=True)
    exams = list(runtime_values.get("exams", []))
    if "Àìá" in source_book.sheet_names():
        _generate_prof_amb_xls(template_path, output_path, context, client, encounter, exams, print_variant=print_variant)
        return

    target_book = copy_xls_workbook(source_book)
    exams_by_role = _exam_map(exams)

    contract_source, contract_target, _ = _sheet_pair(source_book, target_book, "Договор !")
    if contract_source and contract_target:
        _fill_contract_xls_sheet(contract_source, contract_target, context, client, encounter, runtime_values)

    source_sheet, target_sheet, _ = _sheet_pair(source_book, target_book, "086")
    if source_sheet and target_sheet:
        _fill_086_xls_sheet(source_sheet, target_sheet, context, client, encounter, exams_by_role)

    source_sheet, target_sheet, _ = _sheet_pair(source_book, target_book, "ЭЭГ")
    if source_sheet and target_sheet:
        _fill_eeg_xls_sheet(source_sheet, target_sheet, context, client, encounter, exams)

    source_sheet, target_sheet, _ = _sheet_pair(source_book, target_book, "ЧОД")
    if source_sheet and target_sheet:
        _fill_chod_xls_sheet(source_sheet, target_sheet, context, encounter)

    _fill_driver_xls_sheets(source_book, target_book, context, client, encounter, exams_by_role)
    _fill_tractor_xls_sheets(source_book, target_book, exams_by_role)

    source_sheet, target_sheet, _ = _sheet_pair(source_book, target_book, "АмбОПО !")
    if source_sheet and target_sheet:
        _fill_amb_opo_xls_sheet(source_sheet, target_sheet, context, client, encounter, exams_by_role)

    source_sheet, target_sheet, _ = _sheet_pair(source_book, target_book, "Журн344")
    if source_sheet and target_sheet:
        _fill_journal_344_sheet(source_sheet, target_sheet, context, client, encounter)

    _apply_xls_auto_markers(source_book, target_book, context, client, encounter, exams_by_role)
    target_book.save(str(output_path))


def _first_field_value(fields: dict, *keys: str) -> str:
    lowered = {str(key).lower(): value for key, value in fields.items()}
    for key in keys:
        value = fields.get(key)
        if value in (None, ""):
            value = lowered.get(key.lower())
        if value not in (None, ""):
            return str(value).strip()
    return ""


def _get_journal_info(template: DocumentTemplate) -> tuple[str, str] | None:
    name = f"{template.name} {template.file_name}".lower()
    if "вод" in name or "driver" in name:
        return ("journal_344", "Журнал 344 водительских заключений")
    if "оруж" in name or "002" in name:
        return ("journal_441", "Журнал 441 оружейных заключений")
    if "лмк" in name or "медкниж" in name:
        return ("lmk", "Журнал личных медицинских книжек")
    if "086" in name:
        return ("086", "Журнал справок 086у")
    return None


def _load_encounter_document_values(db: Session, client: Client, encounter: Encounter | None) -> dict[str, object]:
    if encounter is None:
        fallback_services = client.legacy_payload_json.get("services", []) if isinstance(client.legacy_payload_json, dict) else []
        service_names = [str(item).strip() for item in fallback_services if str(item).strip()]
        service_rows = [
            {
                "ordinal": str(index),
                "service": name,
                "quantity": "1",
                "date": date.today().strftime("%d.%m.%Y"),
                "unit_price": "",
                "line_total": "",
            }
            for index, name in enumerate(service_names, start=1)
        ]
        return {
            "service_names": service_names,
            "service_rows": service_rows,
            "doctor_name": "",
            "diagnosis": "",
            "mkb10": "",
            "exams": [],
            "context_overrides": {},
        }

    service_items = (
        db.execute(
            select(EncounterService, Service.name)
            .join(Service, EncounterService.service_id == Service.id)
            .where(EncounterService.encounter_id == encounter.id)
            .order_by(EncounterService.id.asc())
        )
        .all()
    )
    service_names = [name for _, name in service_items]
    service_rows = [
        {
            "ordinal": str(index),
            "service": name,
            "quantity": str(item.quantity or 1),
            "date": encounter.encounter_date.strftime("%d.%m.%Y"),
            "unit_price": str(item.unit_price or ""),
            "line_total": str(item.line_total or ""),
        }
        for index, (item, name) in enumerate(service_items, start=1)
    ]
    if not service_rows:
        fallback_services = client.legacy_payload_json.get("services", []) if isinstance(client.legacy_payload_json, dict) else []
        service_names = [str(item).strip() for item in fallback_services if str(item).strip()]
        service_rows = [
            {
                "ordinal": str(index),
                "service": name,
                "quantity": "1",
                "date": encounter.encounter_date.strftime("%d.%m.%Y"),
                "unit_price": "",
                "line_total": "",
            }
            for index, name in enumerate(service_names, start=1)
        ]

    exams = (
        db.execute(
            select(DoctorExam)
            .where(DoctorExam.encounter_id == encounter.id, DoctorExam.deleted_at.is_(None))
            .order_by(DoctorExam.updated_at.desc(), DoctorExam.id.desc())
        )
        .scalars()
        .all()
    )
    doctor_names: list[str] = []
    diagnosis = ""
    mkb10 = ""
    medical_record = db.execute(
        select(MedicalRecord)
        .where(MedicalRecord.client_id == client.id, MedicalRecord.deleted_at.is_(None))
        .order_by(MedicalRecord.updated_at.desc(), MedicalRecord.id.desc())
    ).scalars().first()
    context_overrides = {
        "MaritalStatus": medical_record.marital_status if medical_record and medical_record.marital_status else "",
        "Weight": "",
        "Height": "",
        "HairColor": "",
        "EyeColor": "",
        "DistinguishingMark": "",
    }
    for exam in exams:
        if exam.doctor_name and exam.doctor_name not in doctor_names:
            doctor_names.append(exam.doctor_name)
        fields = exam.fields_json or {}
        diagnosis = diagnosis or _first_field_value(
            fields,
            "diagnosis",
            "diagnosisShort",
            "diagnosisText",
            "diagnose",
            "diagnoz",
            "conclusion",
        )
        mkb10 = mkb10 or _first_field_value(fields, "mkb10", "mkb", "icd10")
        context_overrides["Weight"] = context_overrides["Weight"] or _first_field_value(fields, "weight", "Weight")
        context_overrides["Height"] = context_overrides["Height"] or _first_field_value(fields, "height", "Height")
        context_overrides["HairColor"] = context_overrides["HairColor"] or _first_field_value(
            fields, "hairColor", "hair", "hair_color"
        )
        context_overrides["EyeColor"] = context_overrides["EyeColor"] or _first_field_value(
            fields, "eyeColor", "eyesColor", "eye_color"
        )
        context_overrides["DistinguishingMark"] = context_overrides["DistinguishingMark"] or _first_field_value(
            fields, "distinguishingMark", "distinguishingMarks", "specialMarks", "special_mark"
        )

    return {
        "service_names": service_names,
        "service_rows": service_rows,
        "doctor_name": ", ".join(doctor_names),
        "diagnosis": diagnosis,
        "mkb10": mkb10,
        "exams": exams,
        "context_overrides": context_overrides,
    }


def _append_blank_entry_to_medical_record_legacy(
    db: Session,
    *,
    client: Client,
    encounter: Encounter,
    blank_number: str,
) -> None:
    medical_record = db.execute(
        select(MedicalRecord).where(MedicalRecord.client_id == client.id, MedicalRecord.deleted_at.is_(None))
    ).scalar_one_or_none()
    if medical_record is None:
        medical_record = MedicalRecord(
            client_id=client.id,
            center_id=encounter.center_id,
            card_number=client.card_number,
            opened_at=encounter.encounter_date,
            oms_policy=client.oms_policy,
            work_place=client.work_place,
            position=client.profession,
            mkb10=client.mkb10,
            notes=client.notes,
        )
        db.add(medical_record)
        db.flush()

    db.add(
        MedicalRecordEntry(
            medical_record_id=medical_record.id,
            encounter_id=encounter.id,
            entry_date=encounter.encounter_date,
            doctor_role_id="document",
            doctor_name="document",
            conclusion=f"Выдан номерной бланк медицинского заключения №{blank_number}",
        )
    )


def _append_blank_entry_to_medical_record(
    db: Session,
    *,
    client: Client,
    encounter: Encounter,
    blank_number: str,
) -> None:
    conclusion = f"Выдан номерной бланк медицинского заключения №{blank_number}"
    medical_record = db.execute(
        select(MedicalRecord).where(MedicalRecord.client_id == client.id, MedicalRecord.deleted_at.is_(None))
    ).scalar_one_or_none()
    if medical_record is None:
        medical_record = MedicalRecord(
            client_id=client.id,
            center_id=encounter.center_id,
            card_number=client.card_number,
            opened_at=encounter.encounter_date,
            oms_policy=client.oms_policy,
            work_place=client.work_place,
            position=client.profession,
            mkb10=client.mkb10,
            notes=client.notes,
        )
        db.add(medical_record)
        db.flush()

    existing_entry = db.execute(
        select(MedicalRecordEntry).where(
            MedicalRecordEntry.medical_record_id == medical_record.id,
            MedicalRecordEntry.encounter_id == encounter.id,
            MedicalRecordEntry.doctor_role_id == "document",
            MedicalRecordEntry.conclusion == conclusion,
        )
    ).scalar_one_or_none()
    if existing_entry is not None:
        return

    db.add(
        MedicalRecordEntry(
            medical_record_id=medical_record.id,
            encounter_id=encounter.id,
            entry_date=encounter.encounter_date,
            doctor_role_id="document",
            doctor_name="document",
            conclusion=conclusion,
        )
    )


def generate_document(
    db: Session,
    *,
    template_id: int | None,
    template_code: str | None,
    client_id: int,
    encounter_id: int | None,
    blank_form_id: int | None = None,
    print_variant: str | None = None,
) -> DocumentGenerateResponse:
    print_variant_value = str(print_variant or "").strip().lower()
    side_print_variants = {"driver_front", "driver_back", "tractor_front", "tractor_back"}
    is_side_print = print_variant_value in side_print_variants
    template = None
    if template_id is not None:
        template = db.get(DocumentTemplate, template_id)
    elif template_code is not None:
        template = db.execute(select(DocumentTemplate).where(DocumentTemplate.code == template_code)).scalar_one_or_none()

    if template is None or not template.file_path:
        raise ValueError("Шаблон не найден")

    client = db.get(Client, client_id)
    if client is None or client.deleted_at is not None:
        raise ValueError("Клиент не найден")

    encounter = None
    if encounter_id is not None:
        encounter = db.get(Encounter, encounter_id)
        if encounter is None or encounter.deleted_at is not None:
            raise ValueError("Обращение не найдено")

    template_path = Path(template.file_path)
    output_dir = Path(settings.generated_documents_dir)
    if _is_contract_template(template):
        output_dir = output_dir / "contracts"
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file_name = f"{template_path.stem}_{client.id}_{timestamp}{template_path.suffix}"
    output_path = output_dir / output_file_name

    runtime_values = _load_encounter_document_values(db, client, encounter)
    required_blank_type = None if is_side_print else resolve_required_blank_type(template)
    blank_form = None

    try:
        if required_blank_type:
            if encounter is None or encounter.center_id is None:
                raise ValueError(
                    "Для документа с номерным бланком требуется encounter_id и center_id. "
                    "Сначала оформите обращение в нужном медцентре."
                )

            blank_form = reuse_blank_for_existing_document(
                db,
                blank_type=required_blank_type,
                client_id=client.id,
                encounter_id=encounter.id,
                template_id=template.id,
            )
            if blank_form is None:
                if blank_form_id is not None:
                    blank_form = issue_specific_blank(
                        db,
                        form_id=blank_form_id,
                        blank_type=required_blank_type,
                        client_id=client.id,
                        center_id=encounter.center_id,
                        encounter_id=encounter.id,
                        user_id=1,
                    )
                else:
                    blank_form = issue_next_blank(
                        db,
                        blank_type=required_blank_type,
                        client_id=client.id,
                        center_id=encounter.center_id,
                        encounter_id=encounter.id,
                        user_id=1,
                    )

        context = build_document_context(
            client,
            encounter,
            service_names=runtime_values["service_names"],
            doctor_name=runtime_values["doctor_name"],
            diagnosis=runtime_values["diagnosis"],
            mkb10=runtime_values["mkb10"],
        )
        context.update(
            {
                key: str(value).strip()
                for key, value in (runtime_values.get("context_overrides") or {}).items()
                if value not in (None, "")
            }
        )
        if blank_form is not None:
            context["BlankNumber"] = blank_form.full_number
            context["BlankSeries"] = blank_form.series or ""
            context["BlankFullNumber"] = blank_form.full_number
            context["DocumentNumber"] = blank_form.full_number
        if is_side_print:
            context["ReferenceNumber"] = ""
            context["SeriesNumberCalc"] = ""
            context["BlankNumber"] = ""
            context["BlankSeries"] = ""
            context["BlankFullNumber"] = ""

        if template.template_type == "docx":
            _generate_docx(
                template_path,
                output_path,
                context,
                runtime_values["service_rows"],
                cleanup_xml=_is_contract_template(template),
            )
        elif template.template_type == "xml":
            _generate_xml(template_path, output_path, context)
        elif template.template_type == "xls":
            _generate_runtime_xls(
                template_path,
                output_path,
                context,
                client,
                encounter,
                runtime_values,
                print_variant=print_variant,
            )
        else:
            shutil.copy2(template_path, output_path)

        document_number = blank_form.full_number if blank_form is not None else client.reference_number
        document_series = blank_form.series if blank_form is not None else client.document_series

        generated_document = GeneratedDocument(
            encounter_id=encounter.id if encounter else None,
            client_id=client.id,
            template_id=template.id,
            document_number=document_number,
            series=document_series,
            file_name=output_file_name,
            file_path=str(output_path.resolve()),
            generated_by_user_id=1,
            blank_form_id=blank_form.id if blank_form is not None else None,
            blank_number_snapshot=blank_form.full_number if blank_form is not None else None,
        )
        db.add(generated_document)
        db.flush()

        if blank_form is not None and blank_form.generated_document_id is None:
            blank_form.generated_document_id = generated_document.id
            db.flush()

        journal_info = _get_journal_info(template)
        if journal_info is not None:
            journal_code, journal_name = journal_info
            db.add(
                DocumentJournalEntry(
                    journal_code=journal_code,
                    journal_name=journal_name,
                    generated_document_id=generated_document.id,
                    client_id=client.id,
                    encounter_id=encounter.id if encounter else None,
                    issued_at=encounter.encounter_date if encounter else None,
                    series=generated_document.series,
                    number=generated_document.document_number,
                    result_text=context.get("Diagnosis") or context.get("Conclusion") or "",
                    created_by_user_id=1,
                )
            )

        if blank_form is not None and encounter is not None:
            _append_blank_entry_to_medical_record(
                db,
                client=client,
                encounter=encounter,
                blank_number=blank_form.full_number,
            )

        write_audit_log(
            db,
            entity_type="document_template",
            entity_id=template.id,
            action="generate",
            user_id=1,
            center_id=encounter.center_id if encounter else None,
            payload_json={
                "client_id": client.id,
                "encounter_id": encounter.id if encounter else None,
                "blank_form_id": blank_form.id if blank_form is not None else None,
                "blank_number": blank_form.full_number if blank_form is not None else None,
            },
        )

        return DocumentGenerateResponse(
            template_name=template.name,
            template_type=template.template_type,
            output_file_name=output_file_name,
            output_file_path=str(output_path.resolve()),
            generated_document_id=generated_document.id,
            blank_form_id=blank_form.id if blank_form is not None else None,
            blank_number=blank_form.full_number if blank_form is not None else None,
            generated_fields=context,
        )
    except Exception:
        if output_path.exists():
            output_path.unlink(missing_ok=True)
        raise
