from pydantic import BaseModel


class DocumentGenerateRequest(BaseModel):
    template_id: int | None = None
    template_code: str | None = None
    client_id: int
    encounter_id: int | None = None


class DocumentGenerateResponse(BaseModel):
    template_name: str
    template_type: str
    output_file_name: str
    output_file_path: str
    generated_fields: dict[str, str]
