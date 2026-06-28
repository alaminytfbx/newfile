import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..config import GMAIL_USER, GMAIL_APP_PASSWORD
from ..models import VerificationCode


def generate_verification_code(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        print(f"[EMAIL SERVICE - DEV MODE] To: {to_email} | Subject: {subject}")
        print(f"[EMAIL SERVICE - DEV MODE] Body preview: {html_body[:200]}")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"SocialConnect <{GMAIL_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"Email send error: {e}")
        return False


def send_verification_code(
    db: Session,
    identifier: str,
    purpose: str,
    identifier_type: str = "email"
) -> str:
    code = generate_verification_code()

    db.query(VerificationCode).filter(
        VerificationCode.identifier == identifier,
        VerificationCode.purpose == purpose,
        VerificationCode.is_used == False
    ).update({"is_used": True})
    db.commit()

    expires_at = datetime.utcnow() + timedelta(minutes=15)
    verification = VerificationCode(
        identifier=identifier,
        code=code,
        purpose=purpose,
        expires_at=expires_at
    )
    db.add(verification)
    db.commit()

    if identifier_type == "email":
        subject_map = {
            "registration": "Verify Your SocialConnect Account",
            "login": "Your SocialConnect Login Code",
            "password_reset": "Reset Your SocialConnect Password",
        }
        html = build_verification_email(code, purpose)
        send_email(identifier, subject_map.get(purpose, "Verification Code"), html)
    else:
        print(f"[SMS SERVICE - DEV MODE] Phone: {identifier} | Code: {code} | Purpose: {purpose}")

    print(f"[VERIFICATION CODE] {identifier} | {purpose} | Code: {code}")
    return code


def build_verification_email(code: str, purpose: str) -> str:
    action_map = {
        "registration": "complete your registration",
        "login": "log in to your account",
        "password_reset": "reset your password",
    }
    action = action_map.get(purpose, "verify your identity")

    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 20px; }}
    .container {{ max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }}
    .header h1 {{ color: white; margin: 0; font-size: 28px; letter-spacing: 1px; }}
    .body {{ padding: 30px; text-align: center; }}
    .body p {{ color: #333; font-size: 16px; line-height: 1.6; }}
    .code {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 40px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 12px; display: inline-block; margin: 20px 0; }}
    .warning {{ color: #888; font-size: 13px; margin-top: 20px; }}
    .footer {{ background: #f8f8f8; padding: 15px; text-align: center; color: #aaa; font-size: 12px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>SocialConnect</h1></div>
    <div class="body">
      <p>Your verification code to <strong>{action}</strong> is:</p>
      <div class="code">{code}</div>
      <p>Enter this code within <strong>15 minutes</strong>.</p>
      <p class="warning">If you did not request this code, please ignore this email.</p>
    </div>
    <div class="footer">© 2024 SocialConnect. All rights reserved.</div>
  </div>
</body>
</html>
"""


def verify_code(db: Session, identifier: str, code: str, purpose: str) -> bool:
    now = datetime.utcnow()
    record = db.query(VerificationCode).filter(
        VerificationCode.identifier == identifier,
        VerificationCode.code == code,
        VerificationCode.purpose == purpose,
        VerificationCode.is_used == False,
        VerificationCode.expires_at > now
    ).first()

    if not record:
        return False

    record.is_used = True
    db.commit()
    return True
