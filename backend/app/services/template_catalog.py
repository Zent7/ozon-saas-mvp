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
