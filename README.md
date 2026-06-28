# SocialConnect — Full-Stack Social Media Platform

A comprehensive social media platform with Python/FastAPI backend and Next.js frontend.

## Features

- **Authentication**: Email + phone verification at login, forgot password flow
- **Registration**: Multi-step with Google verification codes via Gmail SMTP
- **Header**: Home button | Dashboard (views/followers/likes) | Notifications | Messages
- **Search**: Find users by name below the header
- **Home Feed**: Profile sidebar left, posts feed right (photo/video/reel), scrollable explore section
- **Profile Page**: Cover photo, circular avatar, bio, friends list, dashboard, personal details
- **Messaging**: PIN-protected (4-digit, per-device enforcement)
- **Admin Panel**: `/admin` — username `hbbelalr`, password `55555`
- **Multiple users with the same name** are supported

---

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Gmail App Password (optional — dev mode works without it)

# Start server
python run.py
# API runs at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# App runs at http://localhost:3000
```

---

## Gmail Email Setup (Optional)

To send real verification emails:

1. Enable 2FA on your Google account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Generate an App Password for "Mail"
4. Add to `backend/.env`:
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-char-app-password
   ```

**Without Gmail configured**: verification codes are printed to the backend console (dev mode).

---

## Admin Panel

Navigate to `http://localhost:3000/admin`

- **Username**: `hbbelalr`
- **Password**: `55555`

---

## Architecture

```
social-media-platform/
├── backend/              # FastAPI (Python)
│   ├── app/
│   │   ├── main.py       # App entry point
│   │   ├── models.py     # SQLAlchemy models
│   │   ├── schemas.py    # Pydantic schemas
│   │   ├── auth.py       # JWT utilities
│   │   ├── routers/      # API route handlers
│   │   └── utils/        # Email service
│   └── requirements.txt
│
└── frontend/             # Next.js 14 (TypeScript)
    └── src/
        ├── app/          # Pages (App Router)
        ├── components/   # Reusable components
        └── lib/          # API client + auth utils
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register/initiate` | Start registration, send code |
| POST | `/api/auth/register/verify` | Verify email code |
| POST | `/api/auth/register/finalize` | Create account with password |
| POST | `/api/auth/login` | Login, send 2FA code |
| POST | `/api/auth/login/verify` | Verify login code, get token |
| POST | `/api/auth/forgot-password` | Send password reset code |
| POST | `/api/auth/reset-password` | Reset password with code |
| GET  | `/api/users/search?q=name` | Search users by name |
| GET  | `/api/posts/feed` | Get post feed |
| POST | `/api/posts` | Create post |
| POST | `/api/posts/{id}/like` | Like/unlike post |
| GET  | `/api/messages/conversations` | Get conversations |
| POST | `/api/messages/pin/create` | Create message PIN |
| POST | `/api/messages/pin/verify` | Verify PIN on device |
| GET  | `/api/admin/users` | Admin: list users |
