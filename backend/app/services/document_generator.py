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
from app.models.blank_form import BLANK_TYPE_DRIVER_MEDICAL_CERTIFICATE
from app.models.client import Client
from app.models.doctor_exam import DoctorExam
from app.models.document_journal import DocumentJournalEntry
from app.models.document_template import DocumentTemplate
from app.models.encounter import Encounter
from app.models.encounter_service import EncounterService
from app.models.generated_document import GeneratedDocument
from app.models.service import Service
from app.schemas.document_generation import DocumentGenerateResponse
from app.services.audit import write_audit_log
from app.services.blank_forms import (
    is_driver_certificate_template,
    issue_next_blank,
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
    cell.xf_idx = source_sheet.cell_xf_index(row_index, col_index)


def _xls_excel_date(value: date | datetime | str | None) -> float | str:
    if value in (None, ""):
        return ""
    if isinstance(value, datetime):
        value = value.date()
    if not isinstance(value, date):
        return str(value)
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


def _generate_prof_amb_xls(
    template_path: Path,
    output_path: Path,
    context: dict[str, str],
    client: Client,
    encounter: Encounter | None,
    exams: list[DoctorExam],
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

    target_book.save(str(output_path))


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

    return {
        "service_names": service_names,
        "service_rows": service_rows,
        "doctor_name": ", ".join(doctor_names),
        "diagnosis": diagnosis,
        "mkb10": mkb10,
        "exams": exams,
    }


def generate_document(
    db: Session,
    *,
    template_id: int | None,
    template_code: str | None,
    client_id: int,
    encounter_id: int | None,
) -> DocumentGenerateResponse:
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
    requires_blank = is_driver_certificate_template(template.name, template.file_name)
    blank_form = None
    if requires_blank:
        blank_form = reuse_blank_for_existing_document(
            db,
            blank_type=BLANK_TYPE_DRIVER_MEDICAL_CERTIFICATE,
            client_id=client.id,
            encounter_id=encounter.id if encounter else None,
            template_id=template.id,
        )
        if blank_form is None:
            blank_form = issue_next_blank(
                db,
                blank_type=BLANK_TYPE_DRIVER_MEDICAL_CERTIFICATE,
                client_id=client.id,
                center_id=encounter.center_id if encounter else None,
                encounter_id=encounter.id if encounter else None,
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
    if blank_form is not None:
        context["BlankNumber"] = blank_form.full_number
        context["BlankSeries"] = blank_form.series or ""
        context["BlankFullNumber"] = blank_form.full_number
        context["DocumentNumber"] = blank_form.full_number

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
        _generate_xls(
            template_path,
            output_path,
            context,
            client,
            encounter,
            runtime_values["exams"],
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
