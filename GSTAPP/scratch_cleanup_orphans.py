import os
import asyncio
import boto3
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
MONGODB_URI = os.getenv("MONGODB_URI")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")

async def main():
    client = AsyncIOMotorClient(
        MONGODB_URI,
        tlsAllowInvalidCertificates=True,
        tlsAllowInvalidHostnames=True,
    )
    db = client.get_database("gstrecounciliation_user")
    col = db.get_collection("uploads")
    
    # 1. Fetch active S3 keys from MongoDB
    active_keys = set()
    cursor = col.find({})
    async for doc in cursor:
        url = doc.get("s3_url")
        if url:
            # Extract key
            parts = url.split(".amazonaws.com/")
            if len(parts) >= 2:
                active_keys.add(parts[1])
                
    print(f"Active S3 keys in DB: {active_keys}")
    
    # 2. List S3 keys in the bucket
    s3 = boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION
    )
    
    try:
        response = s3.list_objects_v2(Bucket=AWS_S3_BUCKET)
        if "Contents" in response:
            for obj in response["Contents"]:
                key = obj["Key"]
                # Only clean files inside the uploads/ folder to avoid touching other files
                if key.startswith("uploads/") and key not in active_keys:
                    print(f"Deleting orphaned S3 object: {key}")
                    s3.delete_object(Bucket=AWS_S3_BUCKET, Key=key)
        else:
            print("No objects in S3 bucket.")
    except Exception as e:
        print(f"Error during S3 cleanup: {e}")

if __name__ == "__main__":
    asyncio.run(main())
