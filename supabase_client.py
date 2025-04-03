from supabase import create_client, Client
from config import SUPABASE_KEY, SUPABASE_URL
# Supabase credentials

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase credentials are missing!")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
