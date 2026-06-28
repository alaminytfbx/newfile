from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models import User, VerificationCode, Follow, Post, Like
from ..schemas import (
    UserRegisterStep1, VerifyCodeRequest, SetPasswordRequest,
    UserLogin, ForgotPasswordRequest, ResetPasswordRequest
)
from ..auth import hash_password, verify_password, create_access_token
from ..utils.email_service import send_verification_code, verify_code

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginVerifyRequest(BaseModel):
    identifier: str
    code: str
    session_token: str


@router.post("/register/initiate")
async def register_initiate(user_data: UserRegisterStep1, db: Session = Depends(get_db)):
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_phone = db.query(User).filter(User.phone == user_data.phone).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    send_verification_code(db, user_data.email, "registration", "email")
    send_verification_code(db, user_data.phone, "registration_phone", "phone")

    return {
        "message": "Verification code sent to your email and phone",
        "email": user_data.email,
        "phone": user_data.phone,
    }


@router.post("/register/verify")
async def register_verify(request: VerifyCodeRequest, db: Session = Depends(get_db)):
    valid = verify_code(db, request.identifier, request.code, request.purpose)
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
    return {"message": "Code verified successfully", "verified": True}


@router.post("/register/finalize")
async def register_finalize(
    email: str,
    first_name: str,
    last_name: str,
    phone: str,
    date_of_birth: str,
    age: int,
    gender: str,
    password: str,
    db: Session = Depends(get_db)
):
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_phone = db.query(User).filter(User.phone == phone).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    verified = db.query(VerificationCode).filter(
        VerificationCode.identifier == email,
        VerificationCode.purpose == "registration",
        VerificationCode.is_used == True
    ).order_by(VerificationCode.id.desc()).first()

    if not verified:
        raise HTTPException(status_code=400, detail="Email not verified. Please verify first.")

    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        date_of_birth=date_of_birth,
        age=age,
        gender=gender,
        hashed_password=hash_password(password),
        is_email_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "profile_picture": user.profile_picture,
            "cover_photo": user.cover_photo,
            "bio": user.bio,
            "location": user.location,
            "gender": user.gender,
            "date_of_birth": user.date_of_birth,
            "age": user.age,
            "hobbies": user.hobbies,
            "education": user.education,
            "is_email_verified": user.is_email_verified,
            "views_count": user.views_count or 0,
            "followers_count": 0,
            "following_count": 0,
            "likes_count": 0,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
    }


@router.post("/login")
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    identifier = credentials.identifier.strip()

    user = db.query(User).filter(
        (User.email == identifier) | (User.phone == identifier)
    ).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    send_verification_code(db, user.email, "login", "email")

    session_token = create_access_token({"sub": user.id, "purpose": "login_verify"})

    masked_email = user.email[:3] + "***" + user.email[user.email.index("@"):]
    return {
        "message": "Verification code sent to your email",
        "session_token": session_token,
        "user_id": user.id,
        "email": masked_email
    }


@router.post("/login/verify")
async def login_verify(request: LoginVerifyRequest, db: Session = Depends(get_db)):
    from ..auth import decode_token

    payload = decode_token(request.session_token)
    if not payload or payload.get("purpose") != "login_verify":
        raise HTTPException(status_code=401, detail="Invalid session token")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    valid = verify_code(db, user.email, request.code, "login")
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    token = create_access_token({"sub": user.id})

    followers = db.query(Follow).filter(Follow.following_id == user.id).count()
    following = db.query(Follow).filter(Follow.follower_id == user.id).count()
    total_likes = db.query(Like).join(Post).filter(Post.user_id == user.id).count()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "profile_picture": user.profile_picture,
            "cover_photo": user.cover_photo,
            "bio": user.bio,
            "location": user.location,
            "gender": user.gender,
            "date_of_birth": user.date_of_birth,
            "age": user.age,
            "hobbies": user.hobbies,
            "education": user.education,
            "is_email_verified": user.is_email_verified,
            "views_count": user.views_count or 0,
            "followers_count": followers,
            "following_count": following,
            "likes_count": total_likes,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
    }


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    identifier = request.identifier.strip()
    user = db.query(User).filter(
        (User.email == identifier) | (User.phone == identifier)
    ).first()

    if not user:
        return {"message": "If an account exists, a reset code has been sent"}

    send_verification_code(db, user.email, "password_reset", "email")

    masked = user.email[:3] + "***" + user.email[user.email.index("@"):]
    return {
        "message": "Password reset code sent to your email",
        "email": masked
    }


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    if request.new_password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    valid = verify_code(db, request.identifier, request.code, "password_reset")
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    user = db.query(User).filter(
        (User.email == request.identifier) | (User.phone == request.identifier)
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(request.new_password)
    db.commit()

    return {"message": "Password reset successfully"}


@router.post("/send-code")
async def send_code(identifier: str, purpose: str, db: Session = Depends(get_db)):
    identifier_type = "email" if "@" in identifier else "phone"
    send_verification_code(db, identifier, purpose, identifier_type)
    return {"message": "Code sent successfully"}
