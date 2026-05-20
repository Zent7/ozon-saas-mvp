from pathlib import Path
import re


SUPPORTED_TEMPLATE_EXTENSIONS = {".docx", ".xml", ".xls"}


def get_templates_root() -> Path:
    return Path(__file__).resolve().parents[3] / "assets" / "templates" / "Templates"


def slugify_template_name(value: str) -> str:
    slug = value.strip().lower()
    slug = re.sub(r"[^\w]+", "-", slug, flags=re.UNICODE)
    slug = slug.strip("-")
    return slug or "template"


def load_template_catalog() -> list[dict[str, str]]:
    root = get_templates_root()
    if not root.exists():
        return []

    catalog: list[dict[str, str]] = []
    for index, path in enumerate(sorted(root.iterdir(), key=lambda item: item.name.lower()), start=1):
        if not path.is_file():
            continue
        if path.suffix.lower() not in SUPPORTED_TEMPLATE_EXTENSIONS:
            continue

        catalog.append(
            {
                "code": f"{slugify_template_name(path.stem)}-{index}",
                "name": path.stem,
                "file_name": path.name,
                "file_path": str(path),
                "description": f"Подключенный шаблон {path.suffix.lower().lstrip('.')}",
                "template_type": path.suffix.lower().lstrip("."),
            }
        )
    return catalog


def template_visit_type_code(template_name: str) -> str | None:
    normalized = template_name.lower()
    if "вод" in normalized or "driver" in normalized:
        return "driver"
    if "лмк" in normalized or "медкниж" in normalized:
        return "lmk_new"
    if "086" in normalized:
        return "086"
    if "амб" in normalized or "профосмотр" in normalized or "мед.карта" in normalized:
        return "prof"
    if "гимс" in normalized:
        return "gims"
    if any(keyword in normalized for keyword in ("070", "072", "санатор", "морск", "marine", "seafar", "драг", "drug", "alcohol")):
        return "other"
    return None


def sync_document_template_catalog(db) -> int:
    from sqlalchemy import select

    from app.models.blank_form import BLANK_TYPE_DRIVER_MEDICAL_CERTIFICATE
    from app.models.document_template import DocumentTemplate
    from app.models.visit_type import VisitType

    catalog = load_template_catalog()
    visit_type_by_code = {
        visit_type.code: visit_type
        for visit_type in db.execute(select(VisitType)).scalars().all()
    }
    existing_by_file_name = {
        template.file_name: template
        for template in db.execute(select(DocumentTemplate)).scalars().all()
    }
    active_file_names: set[str] = set()

    for item in catalog:
        template = existing_by_file_name.get(item["file_name"])
        if template is None:
            template = DocumentTemplate(
                code=item["code"],
                name=item["name"],
                file_name=item["file_name"],
                requires_numbered_blank=False,
                blank_type=None,
            )
            db.add(template)
            existing_by_file_name[item["file_name"]] = template

        template.code = item["code"]
        template.name = item["name"]
        template.file_path = item["file_path"]
        template.description = item["description"]
        template.template_type = item["template_type"]
        template.output_format = item["template_type"]
        template.is_active = True

        haystack = " ".join([item["code"], item["name"], item["file_name"]]).lower()
        if ("вод" in haystack) or ("driver" in haystack):
            template.requires_numbered_blank = True
            template.blank_type = BLANK_TYPE_DRIVER_MEDICAL_CERTIFICATE

        visit_type_code = template_visit_type_code(f"{template.name} {template.file_name}")
        visit_type = visit_type_by_code.get(visit_type_code or "")
        template.visit_type_id = visit_type.id if visit_type is not None else None
        active_file_names.add(template.file_name)

    for template in existing_by_file_name.values():
        if template.file_name not in active_file_names:
            template.is_active = False

    amb_docx = existing_by_file_name.get("АМБ_карты_профосмотр_шаблон.docx")
    amb_xls = existing_by_file_name.get("АМБ_карты_профосмотр_шаблон.xls")
    if amb_xls is not None:
        amb_xls.is_active = True
        amb_xls.template_type = "xls"
        amb_xls.output_format = "xls"
        prof_visit_type = visit_type_by_code.get("prof")
        amb_xls.visit_type_id = prof_visit_type.id if prof_visit_type is not None else None
    if amb_docx is not None and amb_xls is not None:
        amb_docx.is_active = False

    return len(catalog)
