# schemas.py
from pydantic import BaseModel
from typing import Dict, Any

class UserCreate(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True # formerly orm_mode

# --- ADD THIS NEW CLASS ---
class LogCreate(BaseModel):
    session_id: str
    event_type: str
    payload: Dict[str, Any]