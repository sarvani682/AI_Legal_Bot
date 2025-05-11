from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import requests
from config import SUPABASE_URL, SUPABASE_ANON_KEY

security = HTTPBearer()  # Extracts `Authorization` header

async def get_current_user(token: HTTPAuthorizationCredentials = Security(security)):
    """Verify JWT token with Supabase and return user_id."""
    headers = {
        "Authorization": f"Bearer {token.credentials}",
        "apikey": SUPABASE_ANON_KEY
    }

    response = requests.get(f"{SUPABASE_URL}/auth/v1/user", headers=headers)

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_data = response.json()
    return user_data.get("id")  # Supabase returns `id` as user UUID
