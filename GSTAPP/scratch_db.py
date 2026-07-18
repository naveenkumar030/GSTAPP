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
    col = db.get_collection("reconciliation_results")
    count = await col.count_documents({})
    print(f"Collection: reconciliation_results -> Count: {count}")
    cursor = col.find({}).limit(5)
    async for doc in cursor:
        print(f"  Doc: {doc}")
                
if __name__ == "__main__":
    asyncio.run(main())

