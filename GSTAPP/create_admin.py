"""
Quick script to create/reset an admin user directly in MongoDB.
Run: python create_admin.py
Credentials: admin@gstrecon.in / Admin@123
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from dotenv import load_dotenv
import os

load_dotenv(".env")

MONGODB_URI = os.getenv("MONGODB_URI")

EMAIL = "admin@gstrecon.in"
PASSWORD = "Admin@123"
NAME = "Admin User"

async def create_admin():
    client = AsyncIOMotorClient(
        MONGODB_URI,
        tlsAllowInvalidCertificates=True,
        tlsAllowInvalidHostnames=True,
        serverSelectionTimeoutMS=15000,
    )
    db = client.get_default_database("gstrecounciliation_user")
    users = db.users

    hashed = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()

    result = await users.update_one(
        {"email": EMAIL},
        {"$set": {"name": NAME, "email": EMAIL, "password": hashed, "active": True}},
        upsert=True,
    )

    if result.upserted_id:
        print(f"[OK] Created new admin user: {EMAIL}")
    else:
        print(f"[OK] Updated existing user to active: {EMAIL}")

    print(f"\nLogin credentials:")
    print(f"   Email:    {EMAIL}")
    print(f"   Password: {PASSWORD}")
    print(f"\nGo to: http://127.0.0.1:8000/login")

    client.close()

asyncio.run(create_admin())
