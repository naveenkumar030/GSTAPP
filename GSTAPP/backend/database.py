import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables from the parent directory where .env is located
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI is not set in the environment variables.")

# Configure the client securely with standard TLS verification
client = AsyncIOMotorClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=30000,
)

# Target the database specified in the URI, fallback to 'gstrecounciliation_user'
db = client.get_default_database("gstrecounciliation_user")

# Collections
users_collection = db.users
otps_collection = db.otps
