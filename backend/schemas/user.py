from pydantic import BaseModel
from models.enums import UserRole

class AdminCreate(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    role: UserRole

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    user_id: int
    username: str
    role: UserRole
    profile_id: int | None = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str