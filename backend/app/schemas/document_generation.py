from pydantic import BaseModel


class DocumentGenerateRequest(BaseModel):
    template_id: int | None = None
    template_code: str | None = None
    client_id: int
    encounter_id: int | None = None
    blank_form_id: int | None = None
    print_variant: str | None = None


class DocumentGenerateResponse(BaseModel):
    template_name: str
    template_type: str
    output_file_name: str
    output_file_path: str
    generated_document_id: int | None = None
    blank_form_id: int | None = None
    blank_number: str | None = None
    generated_fields: dict[str, str]


class DocumentPrintResponse(DocumentGenerateResponse):
    printed: bool = True
    message: str


class DocumentPrintTicketResponse(BaseModel):
    file_name: str
    file_url: str
    expires_in_seconds: int


class DocumentPrintResultRequest(BaseModel):
    generated_document_id: int
    success: bool = True
    reason: str | None = None


class DocumentPrintResultResponse(BaseModel):
    generated_document_id: int
    blank_form_id: int | None = None
    blank_status: str | None = None
    message: str
