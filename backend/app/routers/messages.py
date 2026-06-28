from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List
from ..database import get_db
from ..models import User, Message, MessagePin
from ..schemas import MessageCreate, MessagePinCreate, MessagePinVerify
from ..auth import get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.get("/conversations")
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subquery = db.query(
        func.max(Message.id).label("max_id")
    ).filter(
        or_(
            Message.sender_id == current_user.id,
            Message.receiver_id == current_user.id
        )
    ).group_by(
        func.case(
            (Message.sender_id == current_user.id, Message.receiver_id),
            else_=Message.sender_id
        )
    ).subquery()

    messages = db.query(Message).filter(Message.id.in_(subquery)).all()

    conversations = []
    seen_users = set()

    for msg in sorted(messages, key=lambda x: x.created_at, reverse=True):
        other_id = msg.receiver_id if msg.sender_id == current_user.id else msg.sender_id
        if other_id in seen_users:
            continue
        seen_users.add(other_id)

        other_user = db.query(User).filter(User.id == other_id).first()
        if not other_user:
            continue

        unread = db.query(Message).filter(
            Message.sender_id == other_id,
            Message.receiver_id == current_user.id,
            Message.is_read == False
        ).count()

        conversations.append({
            "user": {
                "id": other_user.id,
                "first_name": other_user.first_name,
                "last_name": other_user.last_name,
                "profile_picture": other_user.profile_picture,
            },
            "last_message": {
                "id": msg.id,
                "content": msg.content,
                "sender_id": msg.sender_id,
                "is_read": msg.is_read,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
            },
            "unread_count": unread,
        })

    return conversations


@router.get("/{user_id}")
async def get_messages(
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user.id, Message.receiver_id == user_id),
            and_(Message.sender_id == user_id, Message.receiver_id == current_user.id)
        )
    ).order_by(Message.created_at.desc()).offset(skip).limit(limit).all()

    db.query(Message).filter(
        Message.sender_id == user_id,
        Message.receiver_id == current_user.id,
        Message.is_read == False
    ).update({"is_read": True})
    db.commit()

    result = []
    for msg in reversed(messages):
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        result.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "content": msg.content,
            "is_read": msg.is_read,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            "sender": {
                "id": sender.id,
                "first_name": sender.first_name,
                "last_name": sender.last_name,
                "profile_picture": sender.profile_picture,
            } if sender else None,
        })
    return result


@router.post("/send")
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if message_data.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")

    receiver = db.query(User).filter(User.id == message_data.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")

    message = Message(
        sender_id=current_user.id,
        receiver_id=message_data.receiver_id,
        content=message_data.content
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "content": message.content,
        "is_read": message.is_read,
        "created_at": message.created_at.isoformat() if message.created_at else None,
    }


@router.get("/pin/status")
async def get_pin_status(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pin_record = db.query(MessagePin).filter(
        MessagePin.user_id == current_user.id,
        MessagePin.device_id == device_id
    ).first()

    has_pin = db.query(MessagePin).filter(
        MessagePin.user_id == current_user.id
    ).first() is not None

    return {
        "has_pin": has_pin,
        "device_verified": pin_record is not None,
    }


@router.post("/pin/create")
async def create_pin(
    pin_data: MessagePinCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if len(pin_data.pin) != 4 or not pin_data.pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be exactly 4 digits")

    existing_any = db.query(MessagePin).filter(
        MessagePin.user_id == current_user.id
    ).first()

    if existing_any:
        raise HTTPException(status_code=400, detail="PIN already set. Use verify or reset.")

    hashed = hash_password(pin_data.pin)
    pin_record = MessagePin(
        user_id=current_user.id,
        device_id=pin_data.device_id,
        hashed_pin=hashed
    )
    db.add(pin_record)
    db.commit()

    return {"message": "PIN created successfully"}


@router.post("/pin/verify")
async def verify_pin(
    pin_data: MessagePinVerify,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    any_pin = db.query(MessagePin).filter(
        MessagePin.user_id == current_user.id
    ).first()

    if not any_pin:
        raise HTTPException(status_code=400, detail="No PIN set. Please create one first.")

    if not verify_password(pin_data.pin, any_pin.hashed_pin):
        raise HTTPException(status_code=401, detail="Invalid PIN")

    existing_device = db.query(MessagePin).filter(
        MessagePin.user_id == current_user.id,
        MessagePin.device_id == pin_data.device_id
    ).first()

    if not existing_device:
        new_pin = MessagePin(
            user_id=current_user.id,
            device_id=pin_data.device_id,
            hashed_pin=any_pin.hashed_pin
        )
        db.add(new_pin)
        db.commit()

    return {"message": "PIN verified successfully", "verified": True}
