#!/usr/bin/env python3
"""
GST ReconGraph - EC2 Diagnostic Script
Run this INSIDE the Docker container or directly on EC2 to identify HTTP 500 root causes.

Usage (on EC2):
  # Option 1: inside the running container
  docker exec -it gstapp_web python /app/diagnose_ec2.py

  # Option 2: directly on EC2 (with venv active)
  python diagnose_ec2.py
"""
import sys
import os
import traceback

print("=" * 65)
print("   GST ReconGraph - EC2 HTTP 500 Diagnostic Tool")
print("=" * 65)

PASS = "[PASS]"
FAIL = "[FAIL]"
WARN = "[WARN]"
INFO = "[INFO]"

errors_found = []

# -- 1. Python version --
print(f"\n{INFO} Python: {sys.version}")

# -- 2. Check .env loading --
print("\n--- Environment Variables ---")
try:
    from dotenv import load_dotenv
    for env_path in [".env", "../.env", os.path.join(os.path.dirname(__file__), ".env")]:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            print(f"{PASS} .env loaded from: {os.path.abspath(env_path)}")
            break
    else:
        print(f"{WARN} No .env file found in common locations")
except ImportError:
    print(f"{FAIL} python-dotenv not installed")
    errors_found.append("python-dotenv missing")

jwt_secret = os.getenv("JWT_SECRET")
mongodb_uri = os.getenv("MONGODB_URI")
aws_key = os.getenv("AWS_ACCESS_KEY_ID")
aws_bucket = os.getenv("AWS_S3_BUCKET")

print(f"  JWT_SECRET       : {'SET' if jwt_secret else 'MISSING <<< CRITICAL'}")
print(f"  MONGODB_URI      : {'SET' if mongodb_uri else 'MISSING <<< CRITICAL'}")
print(f"  AWS_ACCESS_KEY_ID: {'SET' if aws_key else 'not set (optional)'}")
print(f"  AWS_S3_BUCKET    : {'SET' if aws_bucket else 'not set (optional)'}")
print(f"  FRONTEND_URL     : {os.getenv('FRONTEND_URL') or 'blank (ok for same-origin)'}")

if not jwt_secret:
    errors_found.append("JWT_SECRET not set -- utils.py raises ValueError on startup")
if not mongodb_uri:
    errors_found.append("MONGODB_URI not set -- database.py raises ValueError on startup")

# -- 3. Critical import chain --
print("\n--- Import Chain ---")

modules_to_test = [
    ("bcrypt",    "import bcrypt; bcrypt.hashpw(b'test', bcrypt.gensalt())"),
    ("passlib",   "from passlib.context import CryptContext"),   # may fail -- that is OK now
    ("jose",      "from jose import jwt"),
    ("fastapi",   "from fastapi import FastAPI"),
    ("motor",     "from motor.motor_asyncio import AsyncIOMotorClient"),
    ("boto3",     "import boto3"),
    ("openpyxl",  "import openpyxl"),
    ("slowapi",   "from slowapi import Limiter"),
    ("httpx",     "import httpx"),
]

for name, stmt in modules_to_test:
    try:
        exec(stmt)   # noqa: S102
        print(f"{PASS} {name}")
    except Exception as e:
        marker = WARN if name == "passlib" else FAIL
        print(f"{marker} {name}: {e}")
        if name != "passlib":
            errors_found.append(f"Import failed: {name} -- {e}")

# -- 4. utils.py import (the most common crash point) --
print("\n--- Backend Module Imports ---")

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

for mod_name in ["utils", "database"]:
    try:
        mod = __import__(mod_name)
        print(f"{PASS} {mod_name}.py imported OK")
    except Exception as e:
        print(f"{FAIL} {mod_name}.py FAILED to import:")
        traceback.print_exc()
        errors_found.append(f"{mod_name}.py import failed: {e}")

# -- 5. JWT round-trip --
print("\n--- JWT Token Round-trip ---")
try:
    import importlib
    utils = importlib.import_module("utils")
    token = utils.create_access_token({"sub": "test@example.com"})
    payload = utils.decode_access_token(token)
    assert payload and payload.get("sub") == "test@example.com"
    print(f"{PASS} JWT create + decode works correctly")
except Exception as e:
    print(f"{FAIL} JWT round-trip failed: {e}")
    errors_found.append(f"JWT failure: {e}")

# -- 6. bcrypt round-trip --
print("\n--- Password Hash Round-trip ---")
try:
    import bcrypt
    hashed = bcrypt.hashpw(b"testpassword", bcrypt.gensalt())
    ok = bcrypt.checkpw(b"testpassword", hashed)
    assert ok
    ver = getattr(bcrypt, "__version__", "unknown")
    print(f"{PASS} bcrypt hash + verify works (version: {ver})")
except Exception as e:
    print(f"{FAIL} bcrypt failed: {e}")
    errors_found.append(f"bcrypt failure: {e}")

# -- 7. MongoDB connectivity --
print("\n--- MongoDB Connectivity ---")
try:
    import asyncio
    from motor.motor_asyncio import AsyncIOMotorClient

    async def ping_mongo():
        uri = mongodb_uri or "mongodb://localhost:27017/gstrecounciliation_user"
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
        return await client.admin.command("ping")

    result = asyncio.run(ping_mongo())
    print(f"{PASS} MongoDB ping: {result}")
except Exception as e:
    print(f"{WARN} MongoDB ping failed (app uses local file fallback): {e}")

# -- 8. Local data directory and JSON integrity --
print("\n--- Local Data Directory ---")
data_dir = os.path.join(backend_dir, "data")
os.makedirs(data_dir, exist_ok=True)
print(f"{INFO} Data dir: {data_dir}")
import json
files = os.listdir(data_dir)
print(f"{PASS} Data dir exists. Files: {files or '(empty)'}")
for fname in files:
    if fname.endswith(".json"):
        fpath = os.path.join(data_dir, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                json.load(f)
            fsize = os.path.getsize(fpath) / 1024
            print(f"  {PASS} {fname} -- valid JSON ({fsize:.1f} KB)")
        except Exception as je:
            print(f"  {FAIL} {fname} -- CORRUPT JSON: {je}")
            errors_found.append(f"Corrupt JSON data file: {fname} -- {je}")

# -- 9. Core dataset cache --
print("\n--- Core Dataset Cache ---")
routers_dir = os.path.join(backend_dir, "routers")
cache_file = os.path.join(routers_dir, "core_dataset_cache.csv")
if os.path.exists(cache_file):
    size_mb = os.path.getsize(cache_file) / (1024 * 1024)
    print(f"{PASS} core_dataset_cache.csv found ({size_mb:.1f} MB)")
else:
    print(f"{WARN} core_dataset_cache.csv NOT found -- will download from S3 on first run")

# -- 10. S3 connectivity (optional) --
print("\n--- AWS S3 Connectivity ---")
if aws_key and aws_bucket:
    try:
        import boto3
        s3 = boto3.client(
            "s3",
            aws_access_key_id=aws_key,
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION", "us-east-1"),
        )
        s3.head_bucket(Bucket=aws_bucket)
        print(f"{PASS} S3 bucket '{aws_bucket}' is accessible")
    except Exception as e:
        print(f"{WARN} S3 check failed: {e}")
else:
    print(f"{INFO} S3 not configured -- local file fallback will be used")

# -- Summary --
print("\n" + "=" * 65)
if errors_found:
    print(f"  {len(errors_found)} CRITICAL ISSUE(S) FOUND:")
    for i, err in enumerate(errors_found, 1):
        print(f"  {i}. {err}")
    print("\n  Fix these issues, then rebuild and restart the container.")
else:
    print("  ALL CHECKS PASSED -- no critical issues found.")
    print("  If you still see HTTP 500, check uvicorn logs:")
    print("    docker logs gstapp_web --tail 100")
print("=" * 65 + "\n")
