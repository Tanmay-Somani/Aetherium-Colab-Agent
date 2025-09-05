# models.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class User(Base):
    # ... (existing User class is unchanged)
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

# --- ADD THIS NEW CLASS ---
class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    # In a real app, you would link this to the user ID
    # user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(String, index=True) # To group events by a user's session
    event_type = Column(String) # e.g., "keystroke", "button_click"
    payload = Column(String) # JSON string with details like {"key": "a"} or {"task": "improve"}
    timestamp = Column(DateTime(timezone=True), server_default=func.now())