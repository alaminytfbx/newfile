import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from ..database import get_db
from ..models import User, Follow, Post, Like
from ..schemas import UserResponse, UserUpdate
from ..auth import get_current_user
from ..config import UPLOAD_DIR

router = APIRouter(prefix="/api/users", tags=["users"])


def build_user_response(user: User, db: Session, current_user: Optional[User] = None) -> dict:
    followers = db.query(Follow).filter(Follow.following_id == user.id).count()
    following = db.query(Follow).filter(Follow.follower_id == user.id).count()
    total_likes = db.query(Like).join(Post).filter(Post.user_id == user.id).count()

    is_following = False
    if current_user and current_user.id != user.id:
        is_following = db.query(Follow).filter(
            Follow.follower_id == current_user.id,
            Follow.following_id == user.id
        ).first() is not None

    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone": user.phone,
        "date_of_birth": user.date_of_birth,
        "age": user.age,
        "gender": user.gender,
        "bio": user.bio,
        "location": user.location,
        "hobbies": user.hobbies,
        "education": user.education,
        "profile_picture": user.profile_picture,
        "cover_photo": user.cover_photo,
        "is_email_verified": user.is_email_verified,
        "is_active": user.is_active,
        "views_count": user.views_count,
        "followers_count": followers,
        "following_count": following,
        "likes_count": total_likes,
        "is_following": is_following,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return build_user_response(current_user, db, current_user)


@router.put("/me")
async def update_me(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    for field, value in user_data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return build_user_response(current_user, db, current_user)


@router.post("/me/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type")

    filename = f"profile_{current_user.id}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, "profiles", filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    current_user.profile_picture = f"/uploads/profiles/{filename}"
    db.commit()
    return {"profile_picture": current_user.profile_picture}


@router.post("/me/cover-photo")
async def upload_cover_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type")

    filename = f"cover_{current_user.id}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, "covers", filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    current_user.cover_photo = f"/uploads/covers/{filename}"
    db.commit()
    return {"cover_photo": current_user.cover_photo}


@router.get("/search")
async def search_users(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    users = db.query(User).filter(
        (User.first_name.ilike(f"%{q}%")) |
        (User.last_name.ilike(f"%{q}%")) |
        ((User.first_name + " " + User.last_name).ilike(f"%{q}%"))
    ).filter(User.is_active == True).limit(20).all()

    return [build_user_response(u, db, current_user) for u in users]


@router.get("/{user_id}")
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.views_count = (user.views_count or 0) + 1
    db.commit()

    return build_user_response(user, db, current_user)


@router.post("/{user_id}/follow")
async def follow_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"message": "Unfollowed", "is_following": False}

    follow = Follow(follower_id=current_user.id, following_id=user_id)
    db.add(follow)

    from ..models import Notification
    notif = Notification(
        user_id=user_id,
        type="follow",
        content=f"{current_user.first_name} {current_user.last_name} started following you",
        actor_id=current_user.id
    )
    db.add(notif)
    db.commit()

    return {"message": "Following", "is_following": True}


@router.get("/{user_id}/followers")
async def get_followers(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    follows = db.query(Follow).filter(Follow.following_id == user_id).all()
    followers = []
    for f in follows:
        follower = db.query(User).filter(User.id == f.follower_id).first()
        if follower:
            data = build_user_response(follower, db, current_user)
            data["mutual"] = current_user and db.query(Follow).filter(
                Follow.follower_id == user_id,
                Follow.following_id == follower.id
            ).first() is not None
            followers.append(data)
    return followers


@router.get("/{user_id}/following")
async def get_following(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    follows = db.query(Follow).filter(Follow.follower_id == user_id).all()
    following = []
    for f in follows:
        user = db.query(User).filter(User.id == f.following_id).first()
        if user:
            data = build_user_response(user, db, current_user)
            data["mutual"] = current_user and db.query(Follow).filter(
                Follow.follower_id == user.id,
                Follow.following_id == user_id
            ).first() is not None
            following.append(data)
    return following
