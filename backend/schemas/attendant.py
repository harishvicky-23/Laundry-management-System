from pydantic import BaseModel

class AttendantSummaryResponse(BaseModel):
    name: str
    class Config:
        from_attributes = True


class AttendantCreate(BaseModel):
    username: str
    password: str
    name: str
    phone: str | None = None


class AttendantUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None


class AttendantResponse(BaseModel):
    id: int
    user_id: int
    username: str
    name: str
    phone: str | None = None

    class Config:
        from_attributes = True
