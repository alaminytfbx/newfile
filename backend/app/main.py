from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from .database import engine, Base
from .models import User, Post, Comment, Like, Follow, Message, Notification, Story, VerificationCode, MessagePin
from .routers import auth, users, posts, messages, notifications, admin, stories
from .config import UPLOAD_DIR

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SocialConnect API",
    description="Comprehensive Social Media Platform API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.path.exists(UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(messages.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(stories.router)


@app.get("/")
async def root():
    return {"message": "SocialConnect API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
