from pydantic import BaseModel, EmailStr
from typing import Optional

class RegisterRequest(BaseModel):
    fullName: str
    email: EmailStr
    password: str

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordVerifyRequest(BaseModel):
    email: EmailStr
    otp: str
    newPassword: str
