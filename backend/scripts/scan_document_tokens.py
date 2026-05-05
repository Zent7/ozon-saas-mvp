from __future__ import annotations

from datetime import date
import re
import sys
import zipfile
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BACKEND_ROOT))

from app.models.client import Client
from app.services.document_context import build_document_context


TEMPLATES_DIR = PROJECT_ROOT / "assets" / "templates" / "Templates"
TOKEN_PATTERN = r"([A-Za-z0-9_]+(?:\s*\.\s*[A-Za-z0-9_]+)*)"

bad_templates: list[str] = []


def normalize_token(value: str) -> str:
    return re.sub(r"\s+", "", value or "")


def read_template_text(path: Path) -> str:
    if path.suffix.lower() == ".docx":
        try:
            with zipfile.ZipFile(path, "r") as archive:
                parts = []
                for name in archive.namelist():
                    if name.startswith("word/") and name.endswith(".xml"):
                        parts.append(archive.read(name).decode("utf-8", errors="ignore"))
                return "\n".join(parts)
        except zipfile.BadZipFile:
            bad_templates.append(path.name)
            return ""
    return path.read_text(encoding="utf-8", errors="ignore")


def extract_tokens(text: str) -> set[str]:
    tokens: set[str] = set()
    for value in re.findall(rf"\[\s*\|?\s*{TOKEN_PATTERN}\s*\|?\s*\]", text):
        tokens.add(normalize_token(value))
    for value in re.findall(rf"\{{\{{\s*{TOKEN_PATTERN}\s*\}}\}}", text):
        tokens.add(normalize_token(value))
    # Only bookmarks are placeholders. Other w:name attributes are Word styles/fonts.
    for value in re.findall(r'<w:bookmarkStart[^>]+w:name="([^"]+)"', text):
        if value and not value.startswith("_"):
            tokens.add(normalize_token(value))
    return tokens


dummy_client = Client(
    id=1,
    patient_number=1,
    last_name="РРІР°РЅРѕРІ",
    first_name="РРІР°РЅ",
    middle_name="РРІР°РЅРѕРІРёС‡",
    birth_date=date(1990, 1, 1),
)
known = {normalize_token(key) for key in build_document_context(dummy_client).keys()}
known.add("qdfOrderServices_Ordinal_Service_Quantity_ServiceDate")

all_tokens: dict[str, set[str]] = {}
for path in sorted(TEMPLATES_DIR.iterdir(), key=lambda item: item.name.lower()):
    if path.suffix.lower() not in {".docx", ".xml"}:
        continue
    tokens = extract_tokens(read_template_text(path))
    if tokens:
        all_tokens[path.name] = tokens

unknown = sorted(set().union(*all_tokens.values()) - known) if all_tokens else []
print("templates_with_tokens=", len(all_tokens))
print("known_tokens=", len(known))
print("unknown_tokens=", len(unknown))
print("bad_templates=", bad_templates)
for token in unknown:
    files = [name for name, tokens in all_tokens.items() if token in tokens][:8]
    print(f"{token}: {', '.join(files)}")
