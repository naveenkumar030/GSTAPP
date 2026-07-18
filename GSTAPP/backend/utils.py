import os
import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import random
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt
from dotenv import load_dotenv

# Load env vars
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Secrets
JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey_change_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 day

EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

# AWS Credentials & Config
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")

import boto3

def upload_file_to_s3_sync(file_content: bytes, filename: str, content_type: str = None, user_email: str = None) -> str | None:
    """
    Uploads file contents to the configured AWS S3 bucket.
    Files are namespaced per user when user_email is provided.
    Returns the S3 URL of the file if successful, otherwise None.
    """
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY or not AWS_S3_BUCKET:
        print("S3 Warning: AWS credentials or S3 bucket not configured. Skipping S3 upload.")
        return None
    try:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
        
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        # Namespace the S3 key by user email so each user's files are isolated
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        if user_email:
            # Sanitize email for use as a folder name (replace @ and . with safe chars)
            safe_email = user_email.replace("@", "_at_").replace(".", "_")
            s3_key = f"uploads/{safe_email}/{timestamp}_{filename}"
        else:
            s3_key = f"uploads/{timestamp}_{filename}"
        
        s3.put_object(
            Bucket=AWS_S3_BUCKET,
            Key=s3_key,
            Body=file_content,
            **extra_args
        )
        s3_url = f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
        print(f"Successfully uploaded {filename} to S3 bucket {AWS_S3_BUCKET} as {s3_key}")
        return s3_url
    except Exception as e:
        print(f"Error uploading file to S3: {e}")
        return None

async def upload_file_to_s3_async(file_content: bytes, filename: str, content_type: str = None, user_email: str = None) -> str | None:
    """Async wrapper to upload files to S3 without blocking the event loop."""
    import functools
    loop = asyncio.get_event_loop()
    fn = functools.partial(upload_file_to_s3_sync, file_content, filename, content_type, user_email)
    return await loop.run_in_executor(None, fn)


def download_file_from_s3_sync(s3_url: str) -> bytes | None:
    """
    Downloads file contents from S3 given its S3 URL.
    """
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY or not AWS_S3_BUCKET:
        print("S3 Warning: AWS credentials or S3 bucket not configured. Skipping S3 download.")
        return None
    try:
        # Extract s3 key from URL
        # URL structure: https://<bucket>.s3.<region>.amazonaws.com/<key>
        url_parts = s3_url.split(".amazonaws.com/")
        if len(url_parts) < 2:
            print(f"S3 Error: Invalid S3 URL structure: {s3_url}")
            return None
        s3_key = url_parts[1]
        
        s3 = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
        response = s3.get_object(Bucket=AWS_S3_BUCKET, Key=s3_key)
        return response["Body"].read()
    except Exception as e:
        print(f"Error downloading file from S3: {e}")
        return None


async def download_file_from_s3_async(s3_url: str) -> bytes | None:
    """Async wrapper to download files from S3 without blocking the event loop."""
    import functools
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, download_file_from_s3_sync, s3_url)


def delete_file_from_s3_sync(s3_url: str) -> bool:
    """
    Deletes a file from S3 given its S3 URL.
    """
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY or not AWS_S3_BUCKET:
        print("S3 Warning: AWS credentials or S3 bucket not configured. Skipping S3 delete.")
        return False
    try:
        url_parts = s3_url.split(".amazonaws.com/")
        if len(url_parts) < 2:
            print(f"S3 Error: Invalid S3 URL structure for deletion: {s3_url}")
            return False
        s3_key = url_parts[1]
        
        s3 = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
        s3.delete_object(Bucket=AWS_S3_BUCKET, Key=s3_key)
        print(f"Successfully deleted {s3_key} from S3 bucket {AWS_S3_BUCKET}")
        return True
    except Exception as e:
        print(f"Error deleting file from S3: {e}")
        return False


async def delete_file_from_s3_async(s3_url: str) -> bool:
    """Async wrapper to delete files from S3 without blocking the event loop."""
    import functools
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, delete_file_from_s3_sync, s3_url)



import bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except jwt.JWTError:
        return None

def get_user_email(request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return "default_user@gstapp.com"
    token = auth_header.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return "default_user@gstapp.com"
    return payload["sub"]

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

def send_email_sync(to_email: str, subject: str, otp_code: str, purpose: str = "Registration"):
    """Send an OTP email using SMTP SSL. Raises on failure so callers are aware."""
    if not EMAIL_USER or not EMAIL_PASS:
        print("WARNING: Email credentials not configured in .env (EMAIL_USER / EMAIL_PASS). Cannot send OTP.")
        raise RuntimeError("Email service is not configured. Please contact the administrator.")

    # Build HTML email for a better look
    html_body = f"""\
    <html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:30px;">
      <div style="max-width:480px;margin:auto;background:#fff;border-radius:10px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <h2 style="color:#3c2ada;margin-bottom:8px;">GST ReconGraph</h2>
        <p style="color:#444;font-size:15px;">Your <b>{purpose}</b> OTP code is:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#3c2ada;margin:24px 0;text-align:center;">{otp_code}</div>
        <p style="color:#888;font-size:12px;">This code expires in <b>15 minutes</b>. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#aaa;font-size:11px;">If you did not request this, please ignore this email.</p>
      </div>
    </body></html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = EMAIL_USER
    msg["To"] = to_email
    msg.attach(MIMEText(f"Your OTP is: {otp_code}. It expires in 15 minutes.", "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
        print(f"OTP email sent successfully to {to_email}")
    except smtplib.SMTPAuthenticationError:
        print(f"SMTP Authentication failed for {EMAIL_USER}. Check EMAIL_USER and EMAIL_PASS in .env")
        raise RuntimeError("Email authentication failed. Please contact the administrator.")
    except Exception as e:
        print(f"Error sending email to {to_email}: {e}")
        raise RuntimeError(f"Failed to send OTP email: {str(e)}")

async def send_email_async(to_email: str, subject: str, otp_code: str, purpose: str = "Registration"):
    """Async wrapper: runs send_email_sync in a thread pool so it doesn't block the event loop."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, send_email_sync, to_email, subject, otp_code, purpose)
