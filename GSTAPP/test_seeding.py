import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def main():
    print("Testing reconciliation run without authentication (default_user)...")
    # No Auth header
    response = requests.post(f"{BASE_URL}/api/reconciliation/run")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

if __name__ == "__main__":
    main()
