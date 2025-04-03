# config.py

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


GEMINI_API_KEY = os.getenv("GEMINI_KEY") 

MODEL_NAME = "gemini-2.0-flash" 

BRAVE_API_KEY = os.getenv("BRAVE_API")

SUPABASE_KEY = os.getenv("SUPABASE_KEY")

SUPABASE_URL = os.getenv("SUPABASE_URL")

DATABASE_URL = os.getenv("DATABASE_URL")


