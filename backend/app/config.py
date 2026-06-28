import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "social-media-secret-key-2024-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

GMAIL_USER = os.getenv("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./social_media.db")

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "hbbelalr")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "55555")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(f"{UPLOAD_DIR}/profiles", exist_ok=True)
os.makedirs(f"{UPLOAD_DIR}/covers", exist_ok=True)
os.makedirs(f"{UPLOAD_DIR}/posts", exist_ok=True)
