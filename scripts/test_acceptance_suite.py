import json
import urllib.request
import urllib.error
import time
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "http://localhost:8080/api/v1"

def get_face_profiles():
    req = urllib.request.urlopen(f"{BASE_URL}/faces")
    return json.loads(req.read().decode("utf-8"))

def get_face_detail(employee_id):
    req = urllib.request.urlopen(f"{BASE_URL}/faces/{employee_id}")
    return json.loads(req.read().decode("utf-8"))

def get_doors():
    req = urllib.request.urlopen(f"{BASE_URL}/doors")
    return json.loads(req.read().decode("utf-8"))

def verify_face(payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/recognition/verify",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_door_status(door_id):
    req = urllib.request.urlopen(f"{BASE_URL}/doors/{door_id}")
    return json.loads(req.read().decode("utf-8"))

def run_acceptance_tests():
    print("=" * 70)
    print("FACEGATE AI ACCEPTANCE TEST SUITE - ALL 8 TESTS (REAL PIPELINE)")
    print("=" * 70)

    faces = get_face_profiles()
    doors = get_doors()

    print(f"Total Face Profiles in DB: {len(faces)}")
    print(f"Total Doors in DB: {len(doors)}")

    main_door = next((d for d in doors if "Lobby" in d["name"] or "chính" in d["name"]), doors[0])
    server_door = next((d for d in doors if "Server" in d["name"]), doors[1])

    print(f"Main Door: {main_door['name']} (ID: {main_door['id']})")
    print(f"Server Door: {server_door['name']} (ID: {server_door['id']})")

    # User 1: Nguyễn Văn An (EMP-2045) - R&D Department (Has access to main door & server room)
    an_detail = get_face_detail("EMP-2045")
    an_vector = an_detail["encoding_vector"]
    print(f"User 1: {an_detail['user_name']} ({an_detail['employee_id']}) - Vector len: {len(an_vector)}")

    # User 2: Lê Hoàng Nam (EMP-2105) - Marketing Department (Has access to main door, but NOT server room)
    nam_detail = get_face_detail("EMP-2105")
    nam_vector = nam_detail["encoding_vector"]
    print(f"User 2: {nam_detail['user_name']} ({nam_detail['employee_id']}) - Vector len: {len(nam_vector)}")

    test_results = {}

    # TEST 01: Valid user -> Recognize PASS -> Liveness PASS -> Permission PASS -> Door OPEN (10s)
    print("\n[TEST 01] Valid User at Main Door -> GRANTED -> Door OPEN for 10s")
    payload_01 = {
        "camera_id": "cam-01",
        "door_id": main_door["id"],
        "face_vector": an_vector,
        "liveness_passed": True,
        "liveness_score": 0.98,
        "multi_frame_count": 3,
        "face_count": 1,
        "threshold": 0.60
    }
    res_01 = verify_face(payload_01)
    print(f"  Result: {res_01['result']}, Confidence: {res_01['confidence']}%, Door Unlocked: {res_01['door_unlocked']}, Auto-lock: {res_01['auto_lock_seconds']}s")
    door_after_01 = get_door_status(main_door["id"])
    print(f"  Physical Door Lock Status: {door_after_01['lock_status']}")
    
    t01_pass = (
        res_01["result"] == "GRANTED" and
        res_01["employee_id"] == "EMP-2045" and
        res_01["door_unlocked"] is True and
        res_01["auto_lock_seconds"] == 10 and
        door_after_01["lock_status"] == "Unlocked"
    )
    test_results["TEST 01 (Authorized Entry)"] = "PASS" if t01_pass else "FAIL"

    # TEST 02: Unregistered person -> UNKNOWN -> Door LOCKED
    print("\n[TEST 02] Unregistered Person -> UNKNOWN -> Door LOCKED")
    unknown_vector = [0.01 * ((i * 7) % 11 - 5) for i in range(128)]
    payload_02 = {
        "camera_id": "cam-01",
        "door_id": main_door["id"],
        "face_vector": unknown_vector,
        "liveness_passed": True,
        "liveness_score": 0.95,
        "multi_frame_count": 3,
        "face_count": 1,
        "threshold": 0.60
    }
    res_02 = verify_face(payload_02)
    print(f"  Result: {res_02['result']}, User: {res_02['user_name']}, Door Unlocked: {res_02['door_unlocked']}")
    t02_pass = (
        res_02["result"] == "UNKNOWN" and
        res_02["door_unlocked"] is False and
        res_02["employee_id"] is None
    )
    test_results["TEST 02 (Unknown Person)"] = "PASS" if t02_pass else "FAIL"

    # TEST 03: Recognized in DB but NO DOOR PERMISSION -> UNAUTHORIZED -> Door LOCKED
    print("\n[TEST 03] Marketing Staff at Server Room -> UNAUTHORIZED -> Door LOCKED")
    payload_03 = {
        "camera_id": "cam-04",
        "door_id": server_door["id"],
        "face_vector": nam_vector,  # Lê Hoàng Nam from Marketing
        "liveness_passed": True,
        "liveness_score": 0.97,
        "multi_frame_count": 3,
        "face_count": 1,
        "threshold": 0.60
    }
    res_03 = verify_face(payload_03)
    print(f"  Result: {res_03['result']}, User: {res_03['user_name']}, Reason: {res_03['message']}")
    t03_pass = (
        res_03["result"] == "UNAUTHORIZED" and
        res_03["employee_id"] == "EMP-2105" and
        res_03["door_unlocked"] is False
    )
    test_results["TEST 03 (No Door Permission)"] = "PASS" if t03_pass else "FAIL"

    # TEST 04: Spoofed Face (Fake Photo / Video) -> LIVENESS FAIL -> Door LOCKED
    print("\n[TEST 04] Spoof Attack (Photo/Screen) -> LIVENESS FAIL -> Door LOCKED")
    payload_04 = {
        "camera_id": "cam-01",
        "door_id": main_door["id"],
        "face_vector": an_vector,
        "liveness_passed": False,
        "liveness_score": 0.18,
        "multi_frame_count": 3,
        "face_count": 1,
        "threshold": 0.60
    }
    res_04 = verify_face(payload_04)
    print(f"  Result: {res_04['result']}, Liveness Passed: {res_04['liveness_passed']}, Door Unlocked: {res_04['door_unlocked']}")
    t04_pass = (
        res_04["result"] == "LIVENESS_FAILED" and
        res_04["door_unlocked"] is False and
        res_04["liveness_passed"] is False
    )
    test_results["TEST 04 (Anti-Spoofing Liveness)"] = "PASS" if t04_pass else "FAIL"

    # TEST 05: Multiple Faces in Frame -> WAIT / BLOCK -> Door LOCKED
    print("\n[TEST 05] Multiple Faces in Frame -> MULTIPLE_FACES -> Door LOCKED")
    payload_05 = {
        "camera_id": "cam-01",
        "door_id": main_door["id"],
        "face_vector": an_vector,
        "liveness_passed": True,
        "liveness_score": 0.95,
        "multi_frame_count": 3,
        "face_count": 2,  # 2 faces detected simultaneously
        "threshold": 0.60
    }
    res_05 = verify_face(payload_05)
    print(f"  Result: {res_05['result']}, User: {res_05['user_name']}, Door Unlocked: {res_05['door_unlocked']}")
    t05_pass = (
        res_05["result"] == "MULTIPLE_FACES" and
        res_05["door_unlocked"] is False
    )
    test_results["TEST 05 (Multiple Faces Defense)"] = "PASS" if t05_pass else "FAIL"

    # TEST 06: Insufficient Frames (Only 1 frame, requires >= 3) -> UNCONFIRMED -> Door LOCKED
    print("\n[TEST 06] Insufficient Frame Confirmation (1/3 frames) -> UNCONFIRMED -> Door LOCKED")
    payload_06 = {
        "camera_id": "cam-01",
        "door_id": main_door["id"],
        "face_vector": an_vector,
        "liveness_passed": True,
        "liveness_score": 0.95,
        "multi_frame_count": 1,  # Only 1 frame accumulated so far
        "face_count": 1,
        "threshold": 0.60
    }
    res_06 = verify_face(payload_06)
    print(f"  Result: {res_06['result']}, User: {res_06['user_name']}, Door Unlocked: {res_06['door_unlocked']}")
    t06_pass = (
        res_06["result"] == "UNCONFIRMED_FRAME" and
        res_06["door_unlocked"] is False
    )
    test_results["TEST 06 (Multi-Frame Stability)"] = "PASS" if t06_pass else "FAIL"

    # TEST 07: Door Manual Lock Control & DB State
    print("\n[TEST 07] Manual Lock / Verification of Locked State")
    lock_req = urllib.request.Request(
        f"{BASE_URL}/doors/{main_door['id']}/lock",
        data=b"{}",
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(lock_req) as resp:
        lock_res = json.loads(resp.read().decode("utf-8"))
    door_locked = get_door_status(main_door["id"])
    print(f"  Door lock response: {lock_res['lock_status']}, DB status: {door_locked['lock_status']}")
    t07_pass = (door_locked["lock_status"] == "Locked")
    test_results["TEST 07 (Door Hardware Control)"] = "PASS" if t07_pass else "FAIL"

    # TEST 08: Subsequent User Evaluation
    print("\n[TEST 08] Independent Subsequent Verification -> GRANTED")
    payload_08 = {
        "camera_id": "cam-01",
        "door_id": main_door["id"],
        "face_vector": an_vector,
        "liveness_passed": True,
        "liveness_score": 0.99,
        "multi_frame_count": 4,
        "face_count": 1,
        "threshold": 0.60
    }
    res_08 = verify_face(payload_08)
    print(f"  Result: {res_08['result']}, User: {res_08['user_name']}, Door Unlocked: {res_08['door_unlocked']}")
    t08_pass = (
        res_08["result"] == "GRANTED" and
        res_08["door_unlocked"] is True and
        res_08["auto_lock_seconds"] == 10
    )
    test_results["TEST 08 (Subsequent User Flow)"] = "PASS" if t08_pass else "FAIL"

    print("\n" + "=" * 70)
    print("FINAL ACCEPTANCE TEST RESULTS SUMMARY")
    print("=" * 70)
    for name, st in test_results.items():
        print(f"  {st:4} | {name}")

    all_ok = all(s == "PASS" for s in test_results.values())
    print("\nOVERALL STATUS:", "ALL 8 ACCEPTANCE TESTS PASSED SUCCESSFULLY! ✓" if all_ok else "SOME TESTS FAILED ✗")
    return all_ok

if __name__ == "__main__":
    success = run_acceptance_tests()
    sys.exit(0 if success else 1)
