import os
import json
import urllib.request
import uuid
from fastapi import APIRouter, HTTPException
from database import users_collection, otps_collection
from models import RegisterRequest, VerifyOTPRequest, LoginRequest, ResetPasswordRequest, ResetPasswordVerifyRequest, GoogleLoginRequest
from utils import get_password_hash, verify_password, create_access_token, generate_otp, send_email_async
from datetime import datetime, timedelta, timezone

router = APIRouter()

def utcnow():
    """Return current UTC time as a timezone-aware datetime (avoids deprecation warnings)."""
    return datetime.now(timezone.utc)

@router.post("/register")
async def register(req: RegisterRequest):
    # Validate fullName not empty
    if not req.fullName or not req.fullName.strip():
        raise HTTPException(status_code=422, detail="Full name is required")

    existing_user = await users_collection.find_one({"email": req.email})
    if existing_user and existing_user.get("active", False):
        raise HTTPException(status_code=400, detail="User already registered with this email")

    hashed_pw = get_password_hash(req.password)

    # Store user as inactive
    if not existing_user:
        await users_collection.insert_one({
            "name": req.fullName.strip(),
            "email": req.email,
            "password": hashed_pw,
            "active": False,
            "created_at": utcnow()
        })
    else:
        await users_collection.update_one(
            {"email": req.email},
            {"$set": {"name": req.fullName.strip(), "password": hashed_pw, "active": False}}
        )

    # Generate OTP and store it
    otp = generate_otp()
    await otps_collection.update_one(
        {"email": req.email},
        {"$set": {"otp": otp, "expires_at": utcnow() + timedelta(minutes=15)}},
        upsert=True
    )

    # Send email — awaited directly so any failure returns a 500 with a clear message
    try:
        await send_email_async(
            req.email,
            "Your OTP for GST ReconGraph Registration",
            otp,
            "Registration"
        )
    except RuntimeError as e:
        # Email failed — clean up the OTP record so user can retry
        await otps_collection.delete_one({"email": req.email})
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": "OTP sent successfully. Please check your email and enter the 6-digit code."}

@router.post("/verify-otp")
async def verify_otp(req: VerifyOTPRequest):
    otp_record = await otps_collection.find_one({"email": req.email})
    if not otp_record or otp_record.get("otp") != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please check the code and try again.")

    expires_at = otp_record.get("expires_at")
    # Handle both timezone-aware and naive datetimes stored in MongoDB
    now = utcnow()
    if expires_at is not None:
        if expires_at.tzinfo is None:
            # MongoDB stored a naive datetime — compare as naive UTC
            if expires_at < datetime.utcnow():
                await otps_collection.delete_one({"email": req.email})
                raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
        else:
            if expires_at < now:
                await otps_collection.delete_one({"email": req.email})
                raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    await users_collection.update_one({"email": req.email}, {"$set": {"active": True}})
    await otps_collection.delete_one({"email": req.email})

    return {"message": "Account verified successfully! You can now log in."}

@router.post("/login")
async def login(req: LoginRequest):
    user = await users_collection.find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.get("active", True):
        raise HTTPException(status_code=400, detail="Please verify your email first before logging in")

    token = create_access_token({"sub": req.email}, timedelta(days=1))
    return {
        "token": token,
        "message": "Login successful",
        "name": user.get("name", ""),
        "email": req.email,
    }

@router.post("/reset-password-request")
async def reset_password_request(req: ResetPasswordRequest):
    user = await users_collection.find_one({"email": req.email})
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email address")

    otp = generate_otp()
    await otps_collection.update_one(
        {"email": req.email},
        {"$set": {"otp": otp, "expires_at": utcnow() + timedelta(minutes=15)}},
        upsert=True
    )

    try:
        await send_email_async(
            req.email,
            "Your Password Reset OTP - GST ReconGraph",
            otp,
            "Password Reset"
        )
    except RuntimeError as e:
        await otps_collection.delete_one({"email": req.email})
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": "Password reset OTP sent. Please check your email."}

@router.post("/reset-password-verify")
async def reset_password_verify(req: ResetPasswordVerifyRequest):
    otp_record = await otps_collection.find_one({"email": req.email})
    if not otp_record or otp_record.get("otp") != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    expires_at = otp_record.get("expires_at")
    if expires_at is not None:
        if expires_at.tzinfo is None:
            if expires_at < datetime.utcnow():
                await otps_collection.delete_one({"email": req.email})
                raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
        else:
            if expires_at < utcnow():
                await otps_collection.delete_one({"email": req.email})
                raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if len(req.newPassword) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters long")

    hashed_pw = get_password_hash(req.newPassword)
    await users_collection.update_one({"email": req.email}, {"$set": {"password": hashed_pw}})
    await otps_collection.delete_one({"email": req.email})

    return {"message": "Password reset successfully. You can now log in."}

@router.post("/google-login")
async def google_login(req: GoogleLoginRequest):
    email = req.email
    name = req.name or email.split("@")[0].capitalize()
    
    # If a real token is supplied and GOOGLE_CLIENT_ID is configured in the environment
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    if req.token and google_client_id:
        try:
            url = f"https://oauth2.googleapis.com/tokeninfo?id_token={req.token}"
            req_obj = urllib.request.Request(url)
            with urllib.request.urlopen(req_obj) as response:
                token_info = json.loads(response.read().decode())
                
                if token_info.get("aud") != google_client_id:
                    raise HTTPException(status_code=400, detail="Invalid Google Client ID audience")
                
                email = token_info.get("email", email)
                name = token_info.get("name", name)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Google authentication failed: {str(e)}")

    # Check if user already exists
    user = await users_collection.find_one({"email": email})
    if not user:
        # Create a new active user
        dummy_password = str(uuid.uuid4())
        hashed_pw = get_password_hash(dummy_password)
        
        user_doc = {
            "name": name,
            "email": email,
            "password": hashed_pw,
            "active": True,
            "created_at": utcnow(),
            "sso_provider": "google"
        }
        await users_collection.insert_one(user_doc)
        user = user_doc
    else:
        # If user exists but is inactive, mark them active since Google verified their email
        if not user.get("active", False):
            await users_collection.update_one({"email": email}, {"$set": {"active": True}})
            user["active"] = True

    token = create_access_token({"sub": email}, timedelta(days=1))
    return {
        "token": token,
        "message": "Google Login successful",
        "name": user.get("name", name),
        "email": email,
    }
