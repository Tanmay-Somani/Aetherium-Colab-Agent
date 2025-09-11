# main.py (Corrected for Logging)
import ollama
from fastapi import FastAPI, Depends # FIX: Added Depends import
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib
from typing import List
from contextlib import asynccontextmanager
import json

import models, schemas
from memory_manager import add_to_memory, retrieve_relevant_context
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///./aetherium.db"
engine = create_async_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Lifespan startup: Creating DB tables...")
    await create_db_and_tables()
    yield
    print("Lifespan shutdown.")

app = FastAPI(title="Aetherium AI Agent Guild", lifespan=lifespan)

# --- Dependency for getting a DB session ---
async def get_db():
    async with SessionLocal() as session:
        yield session

origins = [
    "http://localhost:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/log-event/")
# FIX: db type hint was missing AsyncSession
async def log_event(log_data: List[schemas.LogCreate], db: AsyncSession = Depends(get_db)):
    for log_item in log_data:
        new_log = models.Log(
            session_id=log_item.session_id,
            event_type=log_item.event_type,
            payload=json.dumps(log_item.payload)
        )
        db.add(new_log)
    await db.commit()
    return {"status": f"{len(log_data)} events logged"}

class AgentRequest(BaseModel):
    html: str
    task: str

def run_suggestion_agent_with_memory(content: str) -> str:
    print("Delegating to Suggestion Agent with Memory...")
    context_chunks = retrieve_relevant_context(content)
    context_str = "\n".join(context_chunks)
    prompt = f"CONTEXT FROM THE BOOK:\n---\n{context_str}\n---\nCURRENT TEXT:\n---\n{content}\n---\nTASK: Based on the context and the current text, provide a creative suggestion."
    response = ollama.chat(
        model='phi3:mini',
        messages=[
            {'role': 'system', 'content': 'You are a creative partner with a perfect memory of the entire book.'},
            {'role': 'user', 'content': prompt},
        ]
    )
    return response['message']['content']

def run_improvement_agent(content: str) -> str:
    print("Delegating to Improvement Agent...")
    response = ollama.chat(
        model='phi3:mini',
        messages=[
            {'role': 'system', 'content': 'You are a meticulous editor. Rewrite the following text to improve it. Provide ONLY the improved text.'},
            {'role': 'user', 'content': content},
        ]
    )
    return response['message']['content']

def run_librarian_agent(content: str) -> str:
    print("Delegating to Librarian Agent...")
    response = ollama.chat(
        model='phi3:mini',
        messages=[
            {'role': 'system', 'content': 'You are a research assistant. Provide a concise summary or citation for the text.'},
            {'role': 'user', 'content': content},
        ]
    )
    return response['message']['content']

def run_reviewer_agent(content: str) -> str:
    print("Delegating to Reviewer Agent...")
    response = ollama.chat(
        model='phi3:mini',
        messages=[
            {'role': 'system', 'content': 'You are a book reviewer. Provide a 2-3 sentence review of the following text\'s clarity, tone, and flow.'},
            {'role': 'user', 'content': content},
        ]
    )
    return response['message']['content']

@app.post("/agent-request")
async def router_agent(request: AgentRequest):
    print(f"Router received task: '{request.task}'")
    ai_response = "Unknown task."
    try:
        if request.task == 'save_to_memory':
            chunk_id = hashlib.sha256(request.html.encode()).hexdigest()
            add_to_memory(request.html, chunk_id)
            ai_response = "Content saved to long-term memory."
        elif request.task == 'suggest_with_memory':
            ai_response = run_suggestion_agent_with_memory(request.html)
        elif request.task == 'improve':
            ai_response = run_improvement_agent(request.html)
        elif request.task == 'summarize':
            ai_response = run_librarian_agent(request.html)
        elif request.task == 'review':
            ai_response = run_reviewer_agent(request.html)
        else:
            ai_response = "Task not recognized by the Router Agent."
        print("Received response:", ai_response)
        return {"message": "AI task complete!", "response": ai_response}
    except Exception as e:
        print(f"Error during agent request: {e}")
        return {"message": "Error", "response": "An error occurred in the backend."}

@app.get("/")
def read_root():
    return {"status": "Aetherium Backend is running!"}