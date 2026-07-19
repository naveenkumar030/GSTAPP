import pytest
import httpx
from httpx import ASGITransport
from main import app
from utils import create_access_token
import os

@pytest.mark.asyncio
async def test_large_file_upload_rejected():
    """Test that a file larger than 20MB is rejected by the /upload endpoint."""
    # Create a dummy payload larger than 20MB
    large_payload = b"0" * (21 * 1024 * 1024)
    
    # Generate a valid token
    valid_token = create_access_token({"sub": "testuser@example.com"})

    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/reconciliation/upload",
            files={"gstr2b": ("large_file.json", large_payload, "application/json")},
            data={"gstin": "29ABCDE1234F1Z5", "period": "2023-04"},
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        
    assert response.status_code == 413
    assert "File too large" in response.json().get("detail", "")

@pytest.mark.asyncio
async def test_rate_limiting():
    """Test that the rate limiter correctly rejects requests hitting the limit (10/minute)."""
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 10 successful requests
        for i in range(10):
            response = await client.post("/api/auth/login", json={"email": f"user{i}@example.com", "password": "Password123!"})
            assert response.status_code != 429
        
        # The 11th request should hit the rate limit
        response = await client.post("/api/auth/login", json={"email": "user11@example.com", "password": "Password123!"})
        assert response.status_code == 429
