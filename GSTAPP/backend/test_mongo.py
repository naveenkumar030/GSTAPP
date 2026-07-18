import os
import asyncio
import ssl
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
MONGODB_URI = os.getenv("MONGODB_URI")

async def test_conn(name, **kwargs):
    print(f"Testing connection strategy: {name}")
    try:
        client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000, **kwargs)
        # Trigger a command to test connectivity
        await client.admin.command('ping')
        print(f"-> SUCCESS: {name} worked!")
        return True
    except Exception as e:
        print(f"-> FAILED: {name} - Error: {e}")
        return False

async def main():
    if not MONGODB_URI:
        print("MONGODB_URI is not set in environment.")
        return

    # Try different options
    # 1. Standard client (default)
    await test_conn("Standard Default")

    # 2. With certifi
    try:
        import certifi
        await test_conn("With Certifi tlsCAFile", tlsCAFile=certifi.where())
    except ImportError:
        print("certifi is not installed.")

    # 3. With certifi + tls=True
    try:
        import certifi
        await test_conn("With Certifi + tls=True", tls=True, tlsCAFile=certifi.where())
    except ImportError:
        pass

    # 4. tlsAllowInvalidCertificates=True only
    await test_conn("tlsAllowInvalidCertificates=True only", tlsAllowInvalidCertificates=True)

    # 5. Without TLS parameters but tls=True
    await test_conn("tls=True only", tls=True)

    # 6. Disable TLS check completely using SSL Context
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        await test_conn("SSL Context CERT_NONE", ssl_context=ctx)
    except Exception as e:
        print(f"SSL Context setup failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
