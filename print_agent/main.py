from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from urllib.request import urlopen


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765
SUPPORTED_WORD_EXTENSIONS = {".doc", ".docx"}
SUPPORTED_EXCEL_EXTENSIONS = {".xls", ".xlsx"}
SUPPORTED_EXTENSIONS = SUPPORTED_WORD_EXTENSIONS | SUPPORTED_EXCEL_EXTENSIONS


class PrintAgentError(Exception):
    pass


def sanitize_file_name(file_name: str) -> str:
    name = Path(file_name or "document").name
    name = re.sub(r"[^A-Za-z0-9._ -]+", "_", name).strip(" .")
    return name or "document"


def download_print_file(file_url: str, file_name: str) -> Path:
    parsed = urlparse(file_url)
    if parsed.scheme not in {"http", "https"}:
        raise PrintAgentError("file_url must be http or https")

    safe_name = sanitize_file_name(file_name or Path(parsed.path).name)
    suffix = Path(safe_name).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise PrintAgentError(f"Unsupported file type: {suffix or 'unknown'}")

    temp_dir = Path(tempfile.gettempdir()) / "vova-print-agent"
    temp_dir.mkdir(parents=True, exist_ok=True)
    target_path = temp_dir / safe_name
    counter = 1
    while target_path.exists():
        target_path = temp_dir / f"{Path(safe_name).stem}-{counter}{suffix}"
        counter += 1

    with urlopen(file_url, timeout=30) as response:
        target_path.write_bytes(response.read())
    return target_path


def print_word_document(file_path: Path, printer_name: str | None, copies: int) -> None:
    import pythoncom
    import win32com.client

    pythoncom.CoInitialize()
    word = None
    document = None
    previous_printer = None
    try:
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        if printer_name:
            previous_printer = word.ActivePrinter
            word.ActivePrinter = printer_name
        document = word.Documents.Open(
            str(file_path.resolve()),
            ReadOnly=True,
            AddToRecentFiles=False,
            Visible=False,
        )
        document.PrintOut(Background=False, Copies=copies)
    finally:
        if document is not None:
            document.Close(False)
        if word is not None:
            if previous_printer:
                try:
                    word.ActivePrinter = previous_printer
                except Exception:
                    pass
            word.Quit()
        pythoncom.CoUninitialize()


def print_excel_workbook(file_path: Path, printer_name: str | None, copies: int) -> None:
    import pythoncom
    import win32com.client

    pythoncom.CoInitialize()
    excel = None
    workbook = None
    try:
        excel = win32com.client.DispatchEx("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        workbook = excel.Workbooks.Open(str(file_path.resolve()), ReadOnly=True)
        if printer_name:
            workbook.PrintOut(Copies=copies, ActivePrinter=printer_name)
        else:
            workbook.PrintOut(Copies=copies)
    finally:
        if workbook is not None:
            workbook.Close(False)
        if excel is not None:
            excel.Quit()
        pythoncom.CoUninitialize()


def print_file(file_path: Path, printer_name: str | None, copies: int) -> None:
    suffix = file_path.suffix.lower()
    if suffix in SUPPORTED_WORD_EXTENSIONS:
        print_word_document(file_path, printer_name, copies)
        return
    if suffix in SUPPORTED_EXCEL_EXTENSIONS:
        print_excel_workbook(file_path, printer_name, copies)
        return
    raise PrintAgentError(f"Unsupported file type: {suffix or 'unknown'}")


class PrintAgentHandler(BaseHTTPRequestHandler):
    server_version = "VovaPrintAgent/1.0"

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/health":
            self.write_json(200, {"ok": True, "service": "vova-print-agent"})
            return
        self.write_json(404, {"ok": False, "error": "Not found"})

    def do_POST(self) -> None:
        if self.path != "/print":
            self.write_json(404, {"ok": False, "error": "Not found"})
            return

        try:
            payload = self.read_json_body()
            file_url = str(payload.get("file_url") or "").strip()
            file_name = str(payload.get("file_name") or "").strip()
            printer_name = str(payload.get("printer_name") or "").strip() or None
            copies = int(payload.get("copies") or 1)
            if copies < 1 or copies > 20:
                raise PrintAgentError("copies must be between 1 and 20")
            if not file_url:
                raise PrintAgentError("file_url is required")

            file_path = download_print_file(file_url, file_name)
            print_file(file_path, printer_name, copies)
            self.write_json(
                200,
                {
                    "ok": True,
                    "file_name": file_path.name,
                    "printer_name": printer_name or "default",
                    "copies": copies,
                },
            )
        except Exception as exc:
            self.write_json(500, {"ok": False, "error": str(exc)})

    def read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length") or "0")
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        try:
            value = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise PrintAgentError("Invalid JSON body") from exc
        if not isinstance(value, dict):
            raise PrintAgentError("JSON body must be an object")
        return value

    def write_json(self, status_code: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:
        if os.environ.get("VOVA_PRINT_AGENT_QUIET") == "1":
            return
        super().log_message(format, *args)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local silent print agent for Vova Medcenter")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.host not in {"127.0.0.1", "localhost"}:
        raise SystemExit("For safety the print agent must bind only to 127.0.0.1/localhost")

    server = ThreadingHTTPServer((args.host, args.port), PrintAgentHandler)
    print(f"Vova print agent listening on http://{args.host}:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
