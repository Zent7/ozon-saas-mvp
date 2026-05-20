from pydantic import BaseModel


class DocumentTemplateRead(BaseModel):
    id: int
    code: str
    name: str
    visit_type_id: int | None = None
    file_name: str
    file_path: str | None
    description: str | None
    template_type: str
    output_format: str
    requires_numbered_blank: bool
    blank_type: str | None
    is_active: bool

    model_config = {"from_attributes": True}
