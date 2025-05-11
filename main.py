import asyncio
from datetime import datetime
import json
from typing import Optional, Union
from fastapi import FastAPI, Depends, Form, HTTPException, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from document import extract_text
from models import ChatSession, ChatMessage, UserProfile
from pydantic import BaseModel, EmailStr
from ai_module import generate_ai_response
from supabase_client import supabase
from auth import get_current_user
from database import get_db
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import tempfile
import uuid
import pytz
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import get_db
from ai_module import add_document_context_to_session, generate_ai_response

# Initialize FastAPI app
app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Whisper model on startup
model = WhisperModel("base", compute_type="auto")

# -------------------- Pydantic Models --------------------

class SignUpRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class SignInRequest(BaseModel):
    email: EmailStr
    password: str

class MessageRequest(BaseModel):
    message: str


# -------------------- AUTHENTICATION ROUTES --------------------

@app.post("/signup")
async def register_user(request: SignUpRequest, db: AsyncSession = Depends(get_db)):
    try:
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password
        })

        if not auth_response or not auth_response.user:
            raise HTTPException(status_code=400, detail="User registration failed")
        
        supabase_user = auth_response.user
        created_at_str = str(supabase_user.created_at)
        created_at_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))

        new_user = UserProfile(
            id=uuid.UUID(supabase_user.id),
            name=request.name,
            email=supabase_user.email,
            created_at=created_at_dt
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        return {"message": "User registered successfully", "user_id": str(new_user.id)}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/login")
async def login_user(request: SignInRequest):
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        if not auth_response or not auth_response.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return {"access_token": auth_response.session.access_token, "token_type": "Bearer"}

    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


# -------------------- CHAT SESSION MANAGEMENT --------------------


@app.post("/start_session")
async def start_chat_session(
    db: AsyncSession = Depends(get_db), 
    user_id: uuid.UUID = Depends(get_current_user)  # Ensuring the user is authenticated
):
    """Create a new chat session for a logged-in user."""
    session = ChatSession(user_id=user_id)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"session_id": session.id}


@app.post("/send_message/{session_id}")
async def send_message(
    session_id: uuid.UUID,
    request: MessageRequest,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user)
):
    session_result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    chat_session = session_result.scalars().first()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")

    ai_response = await generate_ai_response(db, session_id, request.message)

    return {
        "session_id": session_id,
        "user_message": request.message,
        "ai_response": ai_response["answer"],
        "sources": ai_response["sources"]
    }


@app.get("/get_chat/{session_id}")
async def get_chat_history(session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    session_result = await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at)
    )
    messages = session_result.scalars().all()
    
    return [{
        "role": msg.role,
        "message": msg.message,
        "timestamp": msg.created_at,
        "sources": msg.sources if msg.role == "ai" else None
    } for msg in messages]


@app.get("/get_sessions")
async def get_user_sessions(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user)
):
    session_result = await db.execute(
        select(ChatSession).where(ChatSession.user_id == user_id).order_by(ChatSession.created_at.desc())
    )
    sessions = session_result.scalars().all()
    return [{"session_id": s.id, "created_at": s.created_at} for s in sessions]

# -------------------- SPEECH-TO-TEXT TRANSCRIPTION --------------------

@app.post("/transcribe/")
async def transcribe_audio(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        contents = await file.read()
        tmp.write(contents)
        tmp_path = tmp.name

    segments, _ = model.transcribe(tmp_path)
    transcription = "".join([segment.text for segment in segments])

    return {"text": transcription}







@app.post("/upload_document/{session_id}")
async def upload_document(session_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Upload a document (PDF, DOCX, TXT) and add its extracted content to the session context.
    """
    file_bytes = await file.read()
    try:
        response = await add_document_context_to_session(db, session_id, file_bytes, file.filename)
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    
    return response




@app.post("/send_message_with_optional_document/{session_id}")
async def send_message_with_optional_document(
    session_id: uuid.UUID,
    message: str = Form(...),
    file: Optional[Union[UploadFile, None]] = File(None),
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user)
):
    # Fetch chat session
    session_result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    chat_session = session_result.scalars().first()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # If file is uploaded, process it and update session context
    # if file:
    if file and not isinstance(file, UploadFile):
        file_bytes = await file.read()
        try:
            extracted_text = extract_text(file_bytes, file.filename)
            print(extracted_text)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        if chat_session.context:
            chat_session.context += f"\n\n[Document: {file.filename}]\n{extracted_text}\n"
            print("Updated Context:\n", chat_session.context)  # debug: print updated context

        else:
            chat_session.context = f"[Document: {file.filename}]\n{extracted_text}\n"

        await db.commit()

    # Generate AI response based on message (and updated context if doc was uploaded)
    ai_response = await generate_ai_response(db, session_id, message)

    return {
        "session_id": session_id,
        "user_message": message,
        "ai_response": ai_response["answer"],
        "sources": ai_response["sources"]
    }



