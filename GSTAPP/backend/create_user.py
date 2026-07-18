import asyncio
from database import db
from utils import get_password_hash

async def main():
    users = db.users
    name = "Default User"
    email = "bayyanaveen15@gmail.com"
    password = "password123"
    hashed_pw = get_password_hash(password)
    
    existing = await users.find_one({"email": email})
    if existing:
        await users.update_one({"email": email}, {"$set": {"name": name, "password": hashed_pw, "active": True}})
        print(f"User {email} updated and activated with password: {password}")
    else:
        await users.insert_one({
            "name": name,
            "email": email,
            "password": hashed_pw,
            "active": True
        })
        print(f"User {email} created and activated with password: {password}")

if __name__ == "__main__":
    asyncio.run(main())
