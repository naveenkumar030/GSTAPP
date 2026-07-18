import asyncio
import sys
from database import otps_collection

async def main():
    email = sys.argv[1] if len(sys.argv) > 1 else "testagent_12345@gmail.com"
    otp_record = await otps_collection.find_one({"email": email})
    if otp_record:
        print(f"OTP_FOUND: {otp_record.get('otp')}")
    else:
        print("OTP_NOT_FOUND")

if __name__ == "__main__":
    asyncio.run(main())
