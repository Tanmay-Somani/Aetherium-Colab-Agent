import ollama
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta
from contextlib import asynccontextmanager
import hashlib
from pydantic import BaseModel
from typing import List

import models, schemas, auth
from database import engine, SessionLocal
from memory_manager import add_to_memory, retrieve_relevant_context

async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Server starting up...")
    await create_db_and_tables()
    
    async with SessionLocal() as db:
        dev_user_email = "tanmay@example.com"
        result = await db.execute(models.User.__table__.select().where(models.User.email == dev_user_email))
        user = result.first()
        if not user:
            hashed_password = auth.get_password_hash("Tanmay123")
            dev_user = models.User(email=dev_user_email, hashed_password=hashed_password)
            db.add(dev_user)
            await db.commit()
            print(f"Development user '{dev_user_email}' created.")
    
    yield
    print("Server shutting down...")

app = FastAPI(title="Aetherium AI Agent Guild", lifespan=lifespan)

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

async def get_db():
    async with SessionLocal() as session:
        yield session

@app.post("/token", response_model=auth.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await auth.get_user(db, email=form_data.username)
    if not user or not auth.pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=schemas.UserOut)
async def create_user(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(models.User.__table__.select().where(models.User.email == user.email))
    db_user = result.first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@app.post("/log-event/")
async def log_event(log_data: List[schemas.LogCreate], db: AsyncSession = Depends(get_db)):
    import json
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
async def router_agent(request: AgentRequest, current_user: schemas.UserOut = Depends(auth.get_current_user)):
    print(f"Router received task: '{request.task}' from user: {current_user.email}")
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