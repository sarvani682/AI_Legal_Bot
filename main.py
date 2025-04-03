from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
import pytz
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import ChatSession, ChatMessage
from pydantic import BaseModel, EmailStr
from ai_module import generate_ai_response
from supabase_client import supabase
from auth import get_current_user
from models import UserProfile
from database import get_db
import uuid


app = FastAPI()

# -------------------- AUTHENTICATION ROUTES --------------------

class SignUpRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class SignInRequest(BaseModel):
    email: EmailStr
    password: str

import uuid
import pytz
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

@app.post("/signup")
async def register_user(request: SignUpRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user in Supabase Auth and store in PostgreSQL."""
    try:
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password
        })

        print(f"🔍 Supabase Response: {auth_response}")

        if not auth_response or not auth_response.user:
            raise HTTPException(status_code=400, detail="User registration failed")
        
        supabase_user = auth_response.user  # Extract the user object

        # 🔹 Ensure `created_at` is correctly formatted like Supabase Auth
        created_at_str = str(supabase_user.created_at)  # Convert to string
        created_at_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))  # Convert to UTC

        # ✅ Store directly in PostgreSQL as `TIMESTAMP WITH TIME ZONE`
        new_user = UserProfile(
            id=uuid.UUID(supabase_user.id),
            name=request.name,
            email=supabase_user.email,
            created_at=created_at_dt  # Store exact format like Supabase
        )

        db.add(new_user)
        print(f"📌 Added user to DB: {new_user}")
        await db.commit()
        await db.refresh(new_user)

        print(f"✅ User successfully saved: {new_user}")

        return {"message": "User registered successfully", "user_id": str(new_user.id)}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/login")
async def login_user(request: SignInRequest):
    """Authenticate user and return an access token."""
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
    message: str,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """User sends a message, AI responds, and both are stored in the database."""

    # Verify session exists
    session_result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    chat_session = session_result.scalars().first()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Generate AI response
    ai_response = await generate_ai_response(db, session_id, message)

    return {
        "session_id": session_id,
        "user_message": message,
        "ai_response": ai_response["answer"],
        "sources": ai_response["sources"]
    }

@app.get("/get_chat/{session_id}")
async def get_chat_history(session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Retrieve full chat history for a session."""
    session_result = await db.execute(select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at))
    messages = session_result.scalars().all()
    
    return [{"role": msg.role, "message": msg.message, "timestamp": msg.created_at} for msg in messages]

@app.get("/get_sessions/{user_id}")
async def get_user_sessions(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Retrieve all chat sessions for a user."""
    session_result = await db.execute(select(ChatSession).where(ChatSession.user_id == user_id).order_by(ChatSession.created_at.desc()))
    sessions = session_result.scalars().all()
    
    return [{"session_id": s.id, "created_at": s.created_at} for s in sessions]