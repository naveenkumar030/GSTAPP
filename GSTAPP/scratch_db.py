import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
MONGODB_URI = os.getenv("MONGODB_URI")

async def main():
    client = AsyncIOMotorClient(
        MONGODB_URI,
        tlsAllowInvalidCertificates=True,
        tlsAllowInvalidHostnames=True,
    )
    db = client.get_database("gstrecounciliation_user")
    col = db.get_collection("uploads")
    
    print("--- All Uploads in Collection ---")
    cursor = col.find({})
    async for doc in cursor:
        print({
            "user_email": doc.get("user_email"),
            "type": doc.get("type"),
            "filename": doc.get("filename"),
            "s3_url": doc.get("s3_url"),
            "uploaded_at": doc.get("uploaded_at")
        })
                
if __name__ == "__main__":
    asyncio.run(main())
