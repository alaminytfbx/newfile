from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Notification
from ..auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def get_notifications(
    skip: int = 0,
    limit: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifications = db.query(Notification)\
        .filter(Notification.user_id == current_user.id)\
        .order_by(Notification.created_at.desc())\
        .offset(skip).limit(limit).all()

    result = []
    for notif in notifications:
        actor = db.query(User).filter(User.id == notif.actor_id).first() if notif.actor_id else None
        result.append({
            "id": notif.id,
            "type": notif.type,
            "content": notif.content,
            "reference_id": notif.reference_id,
            "is_read": notif.is_read,
            "created_at": notif.created_at.isoformat() if notif.created_at else None,
            "actor": {
                "id": actor.id,
                "first_name": actor.first_name,
                "last_name": actor.last_name,
                "profile_picture": actor.profile_picture,
            } if actor else None,
        })
    return result


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    count = db.query(Notification)\
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)\
        .count()
    return {"count": count}


@router.post("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification)\
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)\
        .update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if notif:
        notif.is_read = True
        db.commit()

    return {"message": "Notification marked as read"}
