import json
import urllib.request
import urllib.error
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "http://localhost:8080/api/v1"

def run_user_delete_tests():
    print("=" * 60)
    print("TESTING USER DELETE FUNCTIONALITY (FACEGATE AI)")
    print("=" * 60)

    # 1. Test prevention of root admin deletion (EMP-0001)
    print("\n--- Subtest 1: Attempt to delete Root Admin (EMP-0001) ---")
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/users/EMP-0001",
            headers={"Content-Type": "application/json"},
            method="DELETE"
        )
        with urllib.request.urlopen(req) as resp:
            print("ERROR: Root Admin deletion was NOT blocked!")
            sys.exit(1)
    except urllib.error.HTTPError as e:
        print(f"PASS: Correctly blocked deletion with HTTP {e.code}: {e.read().decode('utf-8')}")

    # 2. Create a test user for deletion
    print("\n--- Subtest 2: Create a temporary user 'Test Deletion User' ---")
    create_payload = {
        "full_name": "Test Deletion User",
        "employee_id": "EMP-DEL-01",
        "email": "test.delete@facegate.ai",
        "department": "Khối Kỹ thuật & R&D",
        "position": "Tester",
        "phone": "0999888777",
        "password": "Password@123"
    }
    create_req = urllib.request.Request(
        f"{BASE_URL}/users",
        data=json.dumps(create_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(create_req) as resp:
        created_user = json.loads(resp.read().decode("utf-8"))
    
    user_id = created_user["id"]
    print(f"Created temporary user ID: {user_id}, Code: {created_user['employee_id']}")

    # 3. Enroll dummy face profile for this user
    print("\n--- Subtest 3: Enroll face profile for temporary user ---")
    dummy_vec = [0.05] * 128
    enroll_payload = {
        "employee_id": created_user["employee_id"],
        "encoding_vector": dummy_vec,
        "quality_score": 0.95
    }
    enroll_req = urllib.request.Request(
        f"{BASE_URL}/faces/enroll",
        data=json.dumps(enroll_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(enroll_req) as resp:
        enrolled_face = json.loads(resp.read().decode("utf-8"))
    print(f"Enrolled face profile ID: {enrolled_face['id']}")

    # Verify face profile exists
    verify_req = urllib.request.urlopen(f"{BASE_URL}/faces/{created_user['employee_id']}")
    assert verify_req.status == 200, "Face profile should exist before delete"
    print("Verified face profile exists in DB.")

    # 4. Perform DELETE on temporary user
    print("\n--- Subtest 4: Delete temporary user via DELETE /api/v1/users/{user_id} ---")
    del_req = urllib.request.Request(
        f"{BASE_URL}/users/{user_id}",
        headers={"Content-Type": "application/json"},
        method="DELETE"
    )
    with urllib.request.urlopen(del_req) as resp:
        del_resp = json.loads(resp.read().decode("utf-8"))
    print("Delete response:", json.dumps(del_resp, ensure_ascii=False))
    assert del_resp["success"] is True

    # 5. Verify user no longer exists in DB
    print("\n--- Subtest 5: Verify user is deleted from users table ---")
    try:
        urllib.request.urlopen(f"{BASE_URL}/users/{user_id}")
        print("ERROR: User still exists!")
        sys.exit(1)
    except urllib.error.HTTPError as e:
        print(f"PASS: User retrieval returned HTTP {e.code} (Not Found)")

    # 6. Verify associated FaceProfile is also completely purged
    print("\n--- Subtest 6: Verify associated FaceProfile is purged ---")
    try:
        urllib.request.urlopen(f"{BASE_URL}/faces/{created_user['employee_id']}")
        print("ERROR: FaceProfile still exists!")
        sys.exit(1)
    except urllib.error.HTTPError as e:
        print(f"PASS: Face profile retrieval returned HTTP {e.code} (Purged)")

    print("\n" + "=" * 60)
    print("ALL USER DELETE BACKEND TESTS PASSED SUCCESSFULLY! ✓")
    print("=" * 60)

if __name__ == "__main__":
    run_user_delete_tests()
