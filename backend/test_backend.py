import os
import sys
from fastapi.testclient import TestClient

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app

client = TestClient(app)

def test_status_endpoint():
    print("Testing /api/status endpoint...")
    response = client.get("/api/status")
    print(f"Status code: {response.status_code}")
    print(f"Response JSON: {response.json()}")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "gee_connected" in data
    print("[PASS] Status endpoint test passed.")

def test_invalid_aoi_handling():
    print("\nTesting /api/gee/map-id with invalid coordinates...")
    # Empty coords should fail validation or GEE call
    response = client.post(
        "/api/gee/map-id",
        json={
            "coords": [],
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
            "cloud_cover": 20.0
        }
    )
    print(f"Status code: {response.status_code}")
    print(f"Response JSON: {response.json()}")
    # Should get a validation error (422) or GEE initialization error (503 if not initialized)
    assert response.status_code in [422, 503, 500]
    print("[PASS] Invalid coordinates handling test completed.")

if __name__ == "__main__":
    print("Running backend tests...")
    try:
        test_status_endpoint()
        test_invalid_aoi_handling()
        print("\nAll backend integration smoke tests passed successfully!")
    except AssertionError as e:
        print(f"\nAssertion Error: Test failed! {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected error during testing: {e}")
        sys.exit(1)
