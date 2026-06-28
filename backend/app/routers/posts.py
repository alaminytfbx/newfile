import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from ..database import get_db
from ..models import User, Post, Comment, Like, Follow, Notification
from ..schemas import PostCreate, CommentCreate
from ..auth import get_current_user, get_current_user_optional
from ..config import UPLOAD_DIR

router = APIRouter(prefix="/api/posts", tags=["posts"])


def build_post_response(post: Post, db: Session, current_user: Optional[User] = None) -> dict:
    author = db.query(User).filter(User.id == post.user_id).first()
    is_liked = False
    if current_user:
        is_liked = db.query(Like).filter(
            Like.post_id == post.id, Like.user_id == current_user.id
        ).first() is not None

    return {
        "id": post.id,
        "user_id": post.user_id,
        "content": post.content,
        "media_url": post.media_url,
        "post_type": post.post_type,
        "likes_count": post.likes_count,
        "comments_count": post.comments_count,
        "views_count": post.views_count,
        "is_liked": is_liked,
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "author": {
            "id": author.id,
            "first_name": author.first_name,
            "last_name": author.last_name,
            "profile_picture": author.profile_picture,
        } if author else None,
    }


@router.get("/feed")
async def get_feed(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    posts = db.query(Post).order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    return [build_post_response(p, db, current_user) for p in posts]


@router.get("/user/{user_id}")
async def get_user_posts(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    post_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    query = db.query(Post).filter(Post.user_id == user_id)
    if post_type:
        query = query.filter(Post.post_type == post_type)
    posts = query.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    return [build_post_response(p, db, current_user) for p in posts]


@router.post("")
async def create_post(
    content: Optional[str] = Form(None),
    post_type: str = Form("text"),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    media_url = None

    if file:
        ext = file.filename.split(".")[-1].lower()
        allowed = ["jpg", "jpeg", "png", "gif", "webp", "mp4", "mov", "avi", "webm"]
        if ext not in allowed:
            raise HTTPException(status_code=400, detail="Invalid file type")

        filename = f"post_{current_user.id}_{int(__import__('time').time())}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, "posts", filename)

        with open(filepath, "wb") as f:
            shutil.copyfileobj(file.file, f)

        media_url = f"/uploads/posts/{filename}"

        if ext in ["mp4", "mov", "avi", "webm"] and post_type == "text":
            post_type = "video"
        elif ext in ["jpg", "jpeg", "png", "gif", "webp"] and post_type == "text":
            post_type = "photo"

    post = Post(
        user_id=current_user.id,
        content=content,
        media_url=media_url,
        post_type=post_type
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    return build_post_response(post, db, current_user)


@router.get("/{post_id}")
async def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    post.views_count = (post.views_count or 0) + 1
    db.commit()

    return build_post_response(post, db, current_user)


@router.delete("/{post_id}")
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    db.delete(post)
    db.commit()
    return {"message": "Post deleted"}


@router.post("/{post_id}/like")
async def toggle_like(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first()

    if existing:
        db.delete(existing)
        post.likes_count = max(0, (post.likes_count or 0) - 1)
        db.commit()
        return {"liked": False, "likes_count": post.likes_count}

    like = Like(post_id=post_id, user_id=current_user.id)
    db.add(like)
    post.likes_count = (post.likes_count or 0) + 1

    if post.user_id != current_user.id:
        notif = Notification(
            user_id=post.user_id,
            type="like",
            content=f"{current_user.first_name} {current_user.last_name} liked your post",
            reference_id=post_id,
            actor_id=current_user.id
        )
        db.add(notif)

    db.commit()
    return {"liked": True, "likes_count": post.likes_count}


@router.get("/{post_id}/comments")
async def get_comments(
    post_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    comments = db.query(Comment).filter(Comment.post_id == post_id)\
        .order_by(Comment.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for c in comments:
        author = db.query(User).filter(User.id == c.user_id).first()
        result.append({
            "id": c.id,
            "post_id": c.post_id,
            "user_id": c.user_id,
            "content": c.content,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "author": {
                "id": author.id,
                "first_name": author.first_name,
                "last_name": author.last_name,
                "profile_picture": author.profile_picture,
            } if author else None,
        })
    return result


@router.post("/{post_id}/comments")
async def add_comment(
    post_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        content=comment_data.content
    )
    db.add(comment)
    post.comments_count = (post.comments_count or 0) + 1

    if post.user_id != current_user.id:
        notif = Notification(
            user_id=post.user_id,
            type="comment",
            content=f"{current_user.first_name} {current_user.last_name} commented on your post",
            reference_id=post_id,
            actor_id=current_user.id
        )
        db.add(notif)

    db.commit()
    db.refresh(comment)

    author = db.query(User).filter(User.id == current_user.id).first()
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "user_id": comment.user_id,
        "content": comment.content,
        "created_at": comment.created_at.isoformat() if comment.created_at else None,
        "author": {
            "id": author.id,
            "first_name": author.first_name,
            "last_name": author.last_name,
            "profile_picture": author.profile_picture,
        } if author else None,
    }
