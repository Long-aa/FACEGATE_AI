import json
import urllib.request
import time
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "http://localhost:8080/api/v1"

req = urllib.request.urlopen(f"{BASE_URL}/doors")
doors = json.loads(req.read().decode("utf-8"))
d001 = doors[0]
print(f"Testing Door: {d001['name']} ({d001['door_code']}, ID: {d001['id']})")

# 1. Unlock door
unlock_req = urllib.request.Request(
    f"{BASE_URL}/doors/{d001['id']}/unlock",
    data=b"{}",
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(unlock_req) as resp:
    res = json.loads(resp.read().decode("utf-8"))
print("Unlock API response:", res["lock_status"])

# 2. Check immediately
req_check = urllib.request.urlopen(f"{BASE_URL}/doors/{d001['id']}")
st_now = json.loads(req_check.read().decode("utf-8"))["lock_status"]
print("Status immediately after unlock:", st_now)

# 3. Wait 11s
print("Waiting 11 seconds for physical backend auto-lock timer...")
time.sleep(11)

# 4. Check status in DB after timer
req_after = urllib.request.urlopen(f"{BASE_URL}/doors/{d001['id']}")
st_after = json.loads(req_after.read().decode("utf-8"))["lock_status"]
print("Status after 11 seconds in DB:", st_after)

if st_after == "Locked":
    print("SUCCESS: Requirement 9 Verified! Door automatically transitioned to Locked in DB after 10s.")
    sys.exit(0)
else:
    print(f"FAILURE: Expected Locked, but got {st_after}")
    sys.exit(1)
