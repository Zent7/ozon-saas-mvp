# Vova Medcenter Print Agent

Local Windows-only helper for silent printing generated Word and Excel forms.

## Requirements

- Windows workstation.
- Python 3.11+.
- Microsoft Word and Excel installed.

## Start manually

```powershell
cd print_agent
.\start-print-agent.ps1
```

The agent listens only on `http://127.0.0.1:8765`.

## Install autostart task

```powershell
cd print_agent
.\install-print-agent-task.ps1
```

## API

- `GET /health`
- `POST /print`

```json
{
  "file_url": "https://server/api/v1/documents/print-ticket/...",
  "file_name": "generated.docx",
  "printer_name": "",
  "copies": 1
}
```
