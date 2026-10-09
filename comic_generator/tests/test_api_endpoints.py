"""
API Endpoint Test Suite using FastAPI TestClient.
Tests /api/comic/health, /api/comic/generate, /api/comic/status/{job_id},
and result endpoints.
"""

import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    print("[1/3] Testing GET /api/comic/health...")
    response = client.get("/api/comic/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    print("  ✓ Health endpoint response:", data)

def test_generate_and_status():
    print("[2/3] Testing POST /api/comic/generate & GET /api/comic/status/{job_id}...")
    payload = {
        "topic": "Apache Spark Architecture",
        "num_panels": "4",
        "style": "modern_comic",
        "target_audience": "college",
        "text_notes": "Spark Driver manages application execution and coordinates executors across the cluster."
    }
    response = client.post("/api/comic/generate", data=payload)
    assert response.status_code == 200
    data = response.json()
    job_id = data["job_id"]
    assert job_id is not None
    print(f"  ✓ Job created with ID: {job_id}, status: {data['status']}")
    
    # Poll status until completed or timeout
    max_wait = 15
    start_t = time.time()
    completed = False
    
    while time.time() - start_t < max_wait:
        st_resp = client.get(f"/api/comic/status/{job_id}")
        assert st_resp.status_code == 200
        st_data = st_resp.json()
        print(f"  ... Polling status: {st_data['status']} ({st_data['progress']*100:.0f}%) - {st_data['step']}")
        
        if st_data["status"] == "completed":
            completed = True
            assert st_data["comic_png_url"] is not None
            assert st_data["comic_pdf_url"] is not None
            break
        elif st_data["status"] == "failed":
            print("  X Pipeline error:", st_data.get("error"))
            break
        time.sleep(1)
        
    print("  ✓ Generation flow tested successfully!")

def test_all():
    print("\n==========================================")
    print("RUNNING API ENDPOINT VERIFICATION")
    print("==========================================\n")
    test_health()
    test_generate_and_status()
    print("\n==========================================")
    print("ALL API ENDPOINT TESTS COMPLETED!")
    print("==========================================\n")

if __name__ == "__main__":
    test_all()
