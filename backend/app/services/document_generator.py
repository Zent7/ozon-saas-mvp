from __future__ import annotations

from datetime import datetime
from pathlib import Path
import re
import shutil
import xml.etree.ElementTree as ET
import zipfile
from xml.etree.ElementTree import ParseError

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.client import Client
from app.models.document_template import DocumentTemplate
from app.models.encounter import Encounter
from app.schemas.document_generation import DocumentGenerateResponse
from app.services.audit import write_audit_log
from app.services.document_context import build_document_context

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W_NS}
ET.register_namespace("w", W_NS)


def _replace_text_tokens(xml_text: str, context: dict[str, str]) -> str:
    for key, value in context.items():
        patterns = [
            rf"\[\s*\|\s*{re.escape(key)}\s*\|\s*\]",
            rf"\[\s*{re.escape(key)}\s*\]",
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
        normalized_token = raw_token.replace("|", "").replace(" ", "")
        if normalized_token in context:
            text_nodes[index].text = context[normalized_token]
            for clear_index in range(index + 1, end_index + 1):
                text_nodes[clear_index].text = ""

        index = end_index + 1

    return tree


def _find_parent(root: ET.Element, node: ET.Element) -> ET.Element | None:
    for parent in root.iter():
        for child in list(parent):
            if child is node:
                return parent
    return None


def _generate_docx(template_path: Path, output_path: Path, context: dict[str, str]) -> None:
    with zipfile.ZipFile(template_path, "r") as source_zip:
        with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as target_zip:
            for item in source_zip.infolist():
                file_bytes = source_zip.read(item.filename)
                if item.filename == "word/document.xml":
                    xml_text = file_bytes.decode("utf-8")
                    xml_text = _replace_text_tokens(xml_text, context)
                    try:
                        tree = ET.ElementTree(ET.fromstring(xml_text))
                        tree = _replace_split_token_nodes(tree, context)
                        tree = _append_bookmark_value(tree, context)
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
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file_name = f"{template_path.stem}_{client.id}_{timestamp}{template_path.suffix}"
    output_path = output_dir / output_file_name

    context = build_document_context(client, encounter)

    if template.template_type == "docx":
        _generate_docx(template_path, output_path, context)
    elif template.template_type == "xml":
        _generate_xml(template_path, output_path, context)
    else:
        shutil.copy2(template_path, output_path)

    write_audit_log(
        db,
        entity_type="document_template",
        entity_id=template.id,
        action="generate",
        user_id=1,
        center_id=encounter.center_id if encounter else None,
        payload_json={"client_id": client.id, "encounter_id": encounter.id if encounter else None},
    )

    return DocumentGenerateResponse(
        template_name=template.name,
        template_type=template.template_type,
        output_file_name=output_file_name,
        output_file_path=str(output_path.resolve()),
        generated_fields=context,
    )
