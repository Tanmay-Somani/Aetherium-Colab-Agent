from pydantic import BaseModel
from typing import Dict, Any

class LogCreate(BaseModel):
    session_id: str
    event_type: str
    payload: Dict[str, Any]