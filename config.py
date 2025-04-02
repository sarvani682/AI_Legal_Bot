# config.py

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


GEMINI_API_KEY = os.getenv("GEMINI_KEY") 

MODEL_NAME = "gemini-2.0-flash" 

BRAVE_API_KEY = os.getenv("BRAVE_API")


