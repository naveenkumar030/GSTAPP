import os
import sys
import asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

MONGODB_URI = os.getenv("MONGODB_URI") or "mongodb://mongodb:27017/gstrecounciliation_user"

async def test_mongodb_connection():
    print("=" * 65)
    print("      MongoDB EC2 & Local Connection Diagnostic Tool")
    print("=" * 65)
    
    # Hide password in displayed URI for security output
    safe_uri = MONGODB_URI
    if "@" in safe_uri:
        prefix, rest = safe_uri.split("@", 1)
        safe_uri = prefix.split(":")[0] + ":****@" + rest
    print(f"[*] Target MongoDB URI : {safe_uri}")
    print("[*] Connecting to MongoDB...")

    try:
        client = AsyncIOMotorClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=10000,
            tlsAllowInvalidCertificates=True
        )
        
        # Ping administrative command
        ping_response = await client.admin.command("ping")
        print(f"[+] Ping Status        : SUCCESS (Response: {ping_response})")
        
        # Get target DB
        db = client.get_default_database("gstrecounciliation_user")
        print(f"[+] Active Database    : '{db.name}'")
        
        # List Collections
        collections = await db.list_collection_names()
        print(f"[+] Collections Found  : {collections}")
        
        # Count users in users collection
        if "users" in collections:
            user_count = await db.users.count_documents({})
            print(f"[+] Total Users Count  : {user_count}")
        else:
            print("[!] Note: 'users' collection does not exist yet (it will be created on first registration).")
            
        print("\n[SUCCESS] MongoDB connection is fully functional and responsive!")
        print("=" * 65)
        return True

    except Exception as e:
        print("\n[ERROR] Failed to connect to MongoDB!")
        print(f"Details: {e}")
        print("\nTroubleshooting Checklist for EC2:")
        print(" 1. Atlas Firewall: Ensure 0.0.0.0/0 or EC2 IP is added to MongoDB Atlas Network Access.")
        print(" 2. Security Group: Verify EC2 Inbound/Outbound rules allow HTTPS (443) and MongoDB (27017).")
        print(" 3. Docker setup: If using local container, check 'docker ps' and 'docker logs gstapp_mongodb'.")
        print("=" * 65)
        return False

if __name__ == "__main__":
    success = asyncio.run(test_mongodb_connection())
    sys.exit(0 if success else 1)
