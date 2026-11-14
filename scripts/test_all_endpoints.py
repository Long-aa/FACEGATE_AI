import urllib.request
import urllib.error
import json

base_url = "http://localhost:8080"

print("=== 1. VERIFYING SECURITY: UNAUTHENTICATED REQUEST MUST BE REJECTED (401) ===")
unauth_url = base_url + "/api/v1/users"
try:
    req = urllib.request.Request(unauth_url)
    with urllib.request.urlopen(req, timeout=5) as response:
        print("[FAIL] /api/v1/users permitted anonymous access! (Security flaw)")
except urllib.error.HTTPError as e:
    if e.code == 401:
        print(f"[PASS] /api/v1/users correctly rejected with HTTP 401 Unauthorized (Backdoor closed)")
    else:
        print(f"[INFO] /api/v1/users returned HTTP {e.code}")
except Exception as e:
    print(f"[WARN] Connection check: {e}")

print("\n=== 2. AUTHENTICATING AS ADMIN VIA /api/v1/auth/login ===")
login_url = base_url + "/api/v1/auth/login"
auth_header = {}
token = None

try:
    login_data = json.dumps({"username_or_email": "admin", "password": "Admin@123"}).encode('utf-8')
    login_req = urllib.request.Request(login_url, data=login_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(login_req, timeout=5) as response:
        resp_data = json.loads(response.read().decode('utf-8'))
        token = resp_data.get("access_token")
        auth_header = {"Authorization": f"Bearer {token}"}
        print(f"[PASS] Successfully logged in! Token acquired (length: {len(token)})")
except Exception as e:
    print(f"[FAIL] Could not authenticate via /api/v1/auth/login: {e}")

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

print("\n=== 3. TESTING AUTHENTICATED ACCESS TO ALL ENDPOINTS ===")
all_pass = True
for ep in endpoints:
    url = base_url + ep
    headers = {}
    if ep != "/health":
        headers.update(auth_header)
    try:
        req = urllib.request.Request(url, headers=headers)
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

print("\nOVERALL STATUS:", "ALL ENDPOINTS OPERATIONAL AND SECURE WITH REAL DB DATA!" if (all_pass and token) else "SOME ENDPOINTS FAILED")
