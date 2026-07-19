import os
import asyncio
from dotenv import load_dotenv
import pytest

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

@pytest.mark.asyncio
async def test_mongodb():
    print("\n--- Testing MongoDB ---")
    uri = os.getenv("MONGODB_URI")
    if not uri:
        print("MONGODB_URI is missing in .env")
        return
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        print("SUCCESS: Connected to MongoDB successfully!")
    except Exception as e:
        print(f"FAILED: MongoDB connection error: {e}")

def test_neo4j():
    print("\n--- Testing Neo4j ---")
    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME")
    password = os.getenv("NEO4J_PASSWORD")
    if not all([uri, user, password]):
        print("Neo4j credentials missing in .env")
        return
    try:
        from neo4j import GraphDatabase
        driver = GraphDatabase.driver(uri, auth=(user, password))
        driver.verify_connectivity()
        print("SUCCESS: Connected to Neo4j successfully!")
        driver.close()
    except ImportError:
        print("FAILED: 'neo4j' package is not installed.")
    except Exception as e:
        print(f"FAILED: Neo4j connection error: {e}")

def test_s3():
    print("\n--- Testing AWS S3 ---")
    access_key = os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    region = os.getenv("AWS_REGION", "us-east-1")
    bucket = os.getenv("AWS_S3_BUCKET")
    if not all([access_key, secret_key, bucket]):
        print("AWS S3 credentials missing in .env")
        return
    try:
        import boto3
        from botocore.exceptions import ClientError
        s3 = boto3.client(
            "s3",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
        )
        # Check if the bucket exists by running head_bucket
        s3.head_bucket(Bucket=bucket)
        print(f"SUCCESS: Connected to AWS S3 and verified access to bucket '{bucket}'!")
    except ImportError:
        print("FAILED: 'boto3' package is not installed.")
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404':
            print(f"FAILED: Bucket '{bucket}' does not exist.")
        elif error_code == '403':
            print(f"FAILED: Access denied to bucket '{bucket}'. Check your IAM permissions.")
        else:
            print(f"FAILED: S3 ClientError: {e}")
    except Exception as e:
        print(f"FAILED: AWS S3 connection error: {e}")

async def main():
    print("Starting Infrastructure Diagnostics...")
    await test_mongodb()
    test_neo4j()
    test_s3()
    print("\nDiagnostics Complete.")

if __name__ == "__main__":
    asyncio.run(main())
