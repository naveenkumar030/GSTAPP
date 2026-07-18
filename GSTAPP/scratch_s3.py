import os
import boto3
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")

def main():
    s3 = boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION
    )
    try:
        response = s3.list_objects_v2(Bucket=AWS_S3_BUCKET)
        print("--- Remaining Objects in S3 ---")
        if "Contents" in response:
            for obj in response["Contents"]:
                print(f"Key: {obj['Key']}, Size: {obj['Size']}")
        else:
            print("No objects found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
