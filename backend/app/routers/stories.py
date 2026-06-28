import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from ..database import get_db
from ..models import User, Story, Follow
from ..auth import get_current_user
from ..config import UPLOAD_DIR

router = APIRouter(prefix="/api/stories", tags=["stories"])


@router.get("")
async def get_stories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()

    following_ids = [f.following_id for f in db.query(Follow).filter(Follow.follower_id == current_user.id).all()]
    following_ids.append(current_user.id)

    stories = db.query(Story).filter(
        Story.user_id.in_(following_ids),
        Story.expires_at > now
    ).order_by(Story.created_at.desc()).all()

    result = []
    for story in stories:
        author = db.query(User).filter(User.id == story.user_id).first()
        result.append({
            "id": story.id,
            "user_id": story.user_id,
            "media_url": story.media_url,
            "text_content": story.text_content,
            "expires_at": story.expires_at.isoformat(),
            "created_at": story.created_at.isoformat() if story.created_at else None,
            "author": {
                "id": author.id,
                "first_name": author.first_name,
                "last_name": author.last_name,
                "profile_picture": author.profile_picture,
            } if author else None,
        })
    return result


@router.post("")
async def create_story(
    text_content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    media_url = None

    if file:
        ext = file.filename.split(".")[-1].lower()
        if ext not in ["jpg", "jpeg", "png", "gif", "webp", "mp4", "mov"]:
            raise HTTPException(status_code=400, detail="Invalid file type")

        filename = f"story_{current_user.id}_{int(__import__('time').time())}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, "posts", filename)

        with open(filepath, "wb") as f:
            shutil.copyfileobj(file.file, f)

        media_url = f"/uploads/posts/{filename}"

    if not media_url and not text_content:
        raise HTTPException(status_code=400, detail="Story must have media or text content")

    story = Story(
        user_id=current_user.id,
        media_url=media_url,
        text_content=text_content,
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    db.add(story)
    db.commit()
    db.refresh(story)

    return {
        "id": story.id,
        "user_id": story.user_id,
        "media_url": story.media_url,
        "text_content": story.text_content,
        "expires_at": story.expires_at.isoformat(),
        "created_at": story.created_at.isoformat() if story.created_at else None,
    }


@router.delete("/{story_id}")
async def delete_story(
    story_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    story = db.query(Story).filter(
        Story.id == story_id,
        Story.user_id == current_user.id
    ).first()

    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    db.delete(story)
    db.commit()
    return {"message": "Story deleted"}
