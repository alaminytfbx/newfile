from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Post, Follow, Like, Message
from ..auth import create_access_token
from ..config import ADMIN_USERNAME, ADMIN_PASSWORD

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/login")
async def admin_login(username: str, password: str):
    if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    token = create_access_token({"sub": "admin", "role": "admin"})
    return {"access_token": token, "token_type": "bearer"}


def verify_admin(token: str):
    from ..auth import decode_token
    if not token:
        raise HTTPException(status_code=401, detail="Admin authentication required")
    payload = decode_token(token)
    if not payload or payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload


@router.get("/users")
async def get_all_users(
    skip: int = 0,
    limit: int = 50,
    search: str = "",
    token: str = "",
    db: Session = Depends(get_db)
):
    verify_admin(token)

    query = db.query(User)
    if search:
        query = query.filter(
            (User.first_name.ilike(f"%{search}%")) |
            (User.last_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )

    users = query.offset(skip).limit(limit).all()
    total = query.count()

    result = []
    for user in users:
        followers = db.query(Follow).filter(Follow.following_id == user.id).count()
        posts = db.query(Post).filter(Post.user_id == user.id).count()
        result.append({
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "gender": user.gender,
            "date_of_birth": user.date_of_birth,
            "age": user.age,
            "is_email_verified": user.is_email_verified,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "posts_count": posts,
            "followers_count": followers,
            "profile_picture": user.profile_picture,
        })

    return {"users": result, "total": total}


@router.get("/stats")
async def get_stats(token: str = "", db: Session = Depends(get_db)):
    verify_admin(token)

    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_posts = db.query(Post).count()
    total_messages = db.query(Message).count()

    post_types = {}
    for pt in ["photo", "video", "reel", "text"]:
        post_types[pt] = db.query(Post).filter(Post.post_type == pt).count()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_posts": total_posts,
        "total_messages": total_messages,
        "post_types": post_types,
    }


@router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    token: str = "",
    db: Session = Depends(get_db)
):
    verify_admin(token)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    db.commit()

    return {"message": f"User {'activated' if user.is_active else 'deactivated'}", "is_active": user.is_active}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    token: str = "",
    db: Session = Depends(get_db)
):
    verify_admin(token)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

    return {"message": "User deleted"}
