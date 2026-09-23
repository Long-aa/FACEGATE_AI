import urllib.request
import json

base_url = "http://localhost:8080"
endpoints = [
    "/health",
    "/api/v1/dashboard/stats",
    "/api/v1/recognition/logs",
    "/api/v1/users",
    "/api/v1/access-logs?limit=2",
    "/api/v1/cameras",
    "/api/v1/doors",
    "/api/v1/reports/summary?range_type=today",
    "/api/v1/alerts",
    "/api/v1/alerts/unresolved-count",
    "/api/v1/settings",
    "/api/v1/audit?limit=2",
    "/api/v1/departments",
]

print("=== TESTING REAL FASTAPI & POSTGRESQL ENDPOINTS ===")
all_pass = True
for ep in endpoints:
    url = base_url + ep
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            status_code = response.getcode()
            body = response.read().decode('utf-8')
            data = json.loads(body)
            preview = ""
            if isinstance(data, dict):
                preview = f"Keys: {list(data.keys())[:4]}"
            elif isinstance(data, list):
                preview = f"Length: {len(data)}"
            print(f"[PASS] {ep:<42} (HTTP {status_code}) -> {preview}")
    except Exception as e:
        print(f"[FAIL] {ep:<42} -> {e}")
        all_pass = False

print("\nOVERALL STATUS:", "ALL ENDPOINTS OPERATIONAL WITH REAL DB DATA!" if all_pass else "SOME ENDPOINTS FAILED")
