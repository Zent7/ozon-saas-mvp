from pydantic import BaseModel


class LoginRequest(BaseModel):
    login: str
    password: str


class LoginResponse(BaseModel):
    user_id: int
    access_token: str
    token_type: str = "bearer"
    user_name: str
    role_code: str
    role_name: str
