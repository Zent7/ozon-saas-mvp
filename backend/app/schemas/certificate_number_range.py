from pydantic import BaseModel


class CertificateNumberRangeRead(BaseModel):
    id: int
    visit_type_id: int | None = None
    service_id: int | None = None
    series: str | None = None
    number_from: int
    number_to: int
    current_number: int
    is_active: bool

    model_config = {"from_attributes": True}
