from fastapi import APIRouter, HTTPException, BackgroundTasks
from database import users_collection, otps_collection
from models import RegisterRequest, VerifyOTPRequest, LoginRequest, ResetPasswordRequest, ResetPasswordVerifyRequest
from utils import get_password_hash, verify_password, create_access_token, generate_otp, send_email_sync
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/register")
async def register(req: RegisterRequest, bg_tasks: BackgroundTasks):
    existing_user = await users_collection.find_one({"email": req.email})
    if existing_user and existing_user.get("active", False):
        raise HTTPException(status_code=400, detail="User already registered")

    hashed_pw = get_password_hash(req.password)
    
    # Store user as inactive if they don't exist
    if not existing_user:
        await users_collection.insert_one({
            "name": req.fullName,
            "email": req.email,
            "password": hashed_pw,
            "active": False,
            "created_at": datetime.utcnow()
        })
    else:
        await users_collection.update_one(
            {"email": req.email},
            {"$set": {"name": req.fullName, "password": hashed_pw, "active": False}}
        )

    # Generate OTP
    otp = generate_otp()
    await otps_collection.update_one(
        {"email": req.email},
        {"$set": {"otp": otp, "expires_at": datetime.utcnow() + timedelta(minutes=15)}},
        upsert=True
    )
    
    # Send email
    bg_tasks.add_task(send_email_sync, req.email, "Your OTP for Registration", f"Your OTP is: {otp}")

    return {"message": "OTP sent successfully. Please verify to continue."}

@router.post("/verify-otp")
async def verify_otp(req: VerifyOTPRequest):
    otp_record = await otps_collection.find_one({"email": req.email})
    if not otp_record or otp_record.get("otp") != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if otp_record.get("expires_at") < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    await users_collection.update_one({"email": req.email}, {"$set": {"active": True}})
    await otps_collection.delete_one({"email": req.email})
    
    return {"message": "Account verified successfully"}

@router.post("/login")
async def login(req: LoginRequest):
    user = await users_collection.find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("active", True):
        raise HTTPException(status_code=400, detail="Please verify your email first")

    token = create_access_token({"sub": req.email}, timedelta(days=1))
    return {"token": token, "message": "Login successful"}

@router.post("/reset-password-request")
async def reset_password_request(req: ResetPasswordRequest, bg_tasks: BackgroundTasks):
    user = await users_collection.find_one({"email": req.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    otp = generate_otp()
    await otps_collection.update_one(
        {"email": req.email},
        {"$set": {"otp": otp, "expires_at": datetime.utcnow() + timedelta(minutes=15)}},
        upsert=True
    )
    
    bg_tasks.add_task(send_email_sync, req.email, "Password Reset OTP", f"Your OTP to reset password is: {otp}")
    
    return {"message": "Password reset OTP sent"}

@router.post("/reset-password-verify")
async def reset_password_verify(req: ResetPasswordVerifyRequest):
    otp_record = await otps_collection.find_one({"email": req.email})
    if not otp_record or otp_record.get("otp") != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if otp_record.get("expires_at") < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    hashed_pw = get_password_hash(req.newPassword)
    await users_collection.update_one({"email": req.email}, {"$set": {"password": hashed_pw}})
    await otps_collection.delete_one({"email": req.email})
    
    return {"message": "Password reset successfully"}
