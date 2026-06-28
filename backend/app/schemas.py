from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime


class UserRegisterStep1(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    date_of_birth: str
    age: int
    gender: str


class VerifyCodeRequest(BaseModel):
    identifier: str
    code: str
    purpose: str


class SetPasswordRequest(BaseModel):
    identifier: str
    code: str
    password: str
    confirm_password: str


class UserLogin(BaseModel):
    identifier: str
    password: str


class LoginVerifyRequest(BaseModel):
    identifier: str
    code: str
    session_token: str


class ForgotPasswordRequest(BaseModel):
    identifier: str


class ResetPasswordRequest(BaseModel):
    identifier: str
    code: str
    new_password: str
    confirm_password: str


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    hobbies: Optional[str] = None
    education: Optional[str] = None
    date_of_birth: Optional[str] = None
    age: Optional[int] = None


class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: str
    date_of_birth: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    hobbies: Optional[str] = None
    education: Optional[str] = None
    profile_picture: Optional[str] = None
    cover_photo: Optional[str] = None
    is_email_verified: bool
    is_active: bool
    views_count: int
    created_at: datetime
    followers_count: Optional[int] = 0
    following_count: Optional[int] = 0
    likes_count: Optional[int] = 0

    class Config:
        from_attributes = True


class PostCreate(BaseModel):
    content: Optional[str] = None
    post_type: str = "text"


class PostResponse(BaseModel):
    id: int
    user_id: int
    content: Optional[str] = None
    media_url: Optional[str] = None
    post_type: str
    likes_count: int
    comments_count: int
    views_count: int
    created_at: datetime
    author: Optional[UserResponse] = None
    is_liked: Optional[bool] = False

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    post_id: int
    user_id: int
    content: str
    created_at: datetime
    author: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    receiver_id: int
    content: str


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    is_read: bool
    created_at: datetime
    sender: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    user: UserResponse
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0


class NotificationResponse(BaseModel):
    id: int
    type: str
    content: str
    reference_id: Optional[int] = None
    is_read: bool
    actor_id: Optional[int] = None
    created_at: datetime
    actor: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class StoryCreate(BaseModel):
    text_content: Optional[str] = None


class StoryResponse(BaseModel):
    id: int
    user_id: int
    media_url: Optional[str] = None
    text_content: Optional[str] = None
    expires_at: datetime
    created_at: datetime
    author: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class MessagePinCreate(BaseModel):
    pin: str
    device_id: str


class MessagePinVerify(BaseModel):
    pin: str
    device_id: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class AdminUserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: str
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    age: Optional[int] = None
    is_email_verified: bool
    is_active: bool
    created_at: datetime
    posts_count: Optional[int] = 0
    followers_count: Optional[int] = 0

    class Config:
        from_attributes = True
