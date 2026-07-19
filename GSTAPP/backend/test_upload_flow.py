import os
import json
import httpx
from datetime import timedelta
import sys

# Add backend directory to path to import utils
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils import create_access_token

def generate_test_token():
    return create_access_token(
        data={"sub": "testuser@example.com"},
        expires_delta=timedelta(minutes=15)
    )

def test_upload():
    print("\n--- Testing File Upload & Reconciliation Flow ---")
    
    # Generate mock token
    token = generate_test_token()
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Generated JWT token for testuser@example.com")

    # Create dummy GSTR-2B data
    gstr2b_data = [
        {
            "gstin": "29ABCDE1234F1Z5",
            "supplier": "Test Supplier",
            "invoice_no": "INV-001",
            "date": "01-07-2026",
            "taxable_value": 1000,
            "tax_amount": 180
        }
    ]
    
    # Save dummy data to a temporary file
    test_file_path = "dummy_gstr2b.json"
    with open(test_file_path, "w") as f:
        json.dump(gstr2b_data, f)
        
    print(f"Created temporary dummy file: {test_file_path}")

    # Send POST request
    upload_url = "http://127.0.0.1:8000/api/reconciliation/upload"
    print(f"Sending POST request to {upload_url}...")
    
    try:
        with open(test_file_path, "rb") as f:
            files = {'gstr2b': ('dummy_gstr2b.json', f, 'application/json')}
            response = httpx.post(upload_url, headers=headers, files=files, timeout=30.0)
            
        print(f"Response Status Code: {response.status_code}")
        print(f"Response Body: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("\nSUCCESS: Upload endpoint worked perfectly!")
        else:
            print("\nFAILED: Upload endpoint returned an error.")
    except Exception as e:
        print(f"\nFAILED: Exception occurred during request: {e}")
    finally:
        # Cleanup
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

if __name__ == "__main__":
    test_upload()
