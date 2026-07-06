import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables from the parent directory where .env is located
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI is not set in the environment variables.")

client = AsyncIOMotorClient(MONGODB_URI)
# Try to get the default database from the URI, fallback to 'gstrecounciliation_user'
try:
    db = client.get_default_database()
except Exception:
    db = client.get_database("gstrecounciliation_user")

# Collections
users_collection = db.users
otps_collection = db.otps
