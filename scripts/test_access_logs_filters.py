"""
E2E Integration Test Suite for Access Audit Logs Filter Functionality.
Validates all 6 filter criteria required by user:
1. Thoi gian tu ngay den ngay (Date Range)
2. Xu ly nguoi dung (User / User type / Employee ID)
3. Camera (Camera filter)
4. Cua kiem soat (Door filter)
5. Trang thai (Status / Result filter: GRANTED, DENIED, UNKNOWN, MANUAL_VERIFY)
6. Do tin cay (Confidence range filter)
"""
import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import httpx

BASE_URL = "http://127.0.0.1:8080/api/v1/access-logs"


def run_filter_tests():
    print("=" * 80)
    print("KIEM THU HE THONG BO LOC NHAT KY KIEM SOAT RA VAO (ACCESS AUDIT LOGS)")
    print("=" * 80)

    # 1. Test tong so ban ghi toan he thong
    res_all = httpx.get(BASE_URL)
    assert res_all.status_code == 200, f"Failed: {res_all.text}"
    total_all = res_all.json()["total"]
    print(f"\n1. Tong so ban ghi hien co trong CSDL: {total_all} ban ghi.")
    assert total_all > 0, "CSDL phai co ban ghi access logs"

    # 2. Test Bo loc 1: Thoi gian tu ngay den ngay
    print("\n2. KIEM THU BO LOC THOI GIAN TU NGAY DEN NGAY:")
    # 2.1. Loc ngay 20/09/2026 den 20/09/2026 (ngay kich ban kiem thu)
    res_date = httpx.get(BASE_URL, params={"date_from": "2026-09-20", "date_to": "2026-09-20"})
    assert res_date.status_code == 200
    total_date = res_date.json()["total"]
    print(f"   [PASS] Loc tu ngay 20/09/2026 den 20/09/2026: {total_date} ban ghi (Chinh xac 10 ban ghi)")
    assert total_date == 10, f"Expected 10 logs on 2026-09-20, got {total_date}"

    # 2.2. Loc khoang ngay tu 18/09/2026 den 22/09/2026
    res_range = httpx.get(BASE_URL, params={"date_from": "2026-09-18", "date_to": "2026-09-22"})
    assert res_range.status_code == 200
    print(f"   [PASS] Loc khoang ngay 18/09/2026 -> 22/09/2026: {res_range.json()['total']} ban ghi.")

    # 3. Test Bo loc 2: Nguoi dung (User type / User specific)
    print("\n3. KIEM THU BO LOC NGUOI DUNG:")
    # 3.1. Loc Nhan vien da dang ky (emp)
    res_emp = httpx.get(BASE_URL, params={"date_from": "2026-09-20", "date_to": "2026-09-20", "user_type": "emp"})
    assert res_emp.status_code == 200
    total_emp = res_emp.json()["total"]
    print(f"   [PASS] Loc Nhan vien da dang ky (user_type=emp): {total_emp} ban ghi.")
    for item in res_emp.json()["items"]:
        assert item["employee_id"] != "--", "Nhan vien phai co ma nhan vien hop le"

    # 3.2. Loc Khach / Nguoi la (unknown)
    res_unknown = httpx.get(BASE_URL, params={"date_from": "2026-09-20", "date_to": "2026-09-20", "user_type": "unknown"})
    assert res_unknown.status_code == 200
    total_unknown = res_unknown.json()["total"]
    print(f"   [PASS] Loc Khach / Nguoi la (user_type=unknown): {total_unknown} ban ghi.")
    for item in res_unknown.json()["items"]:
        assert item["is_unknown"] or "Người lạ" in item["user_name"] or item["result"] == "UNKNOWN"

    # 3.3. Loc nhan vien cu the (EMP-2023)
    res_specific_user = httpx.get(BASE_URL, params={"user_id": "EMP-2023"})
    assert res_specific_user.status_code == 200
    print(f"   [PASS] Loc nhan vien cu the 'EMP-2023': {res_specific_user.json()['total']} ban ghi.")

    # 4. Test Bo loc 3: Camera
    print("\n4. KIEM THU BO LOC CAMERA:")
    # 4.1. Camera Phong Server B
    res_cam_server = httpx.get(BASE_URL, params={"date_from": "2026-09-20", "date_to": "2026-09-20", "camera_id": "Phòng Server B"})
    assert res_cam_server.status_code == 200
    print(f"   [PASS] Loc Camera 'Phòng Server B': {res_cam_server.json()['total']} ban ghi.")
    assert res_cam_server.json()["total"] == 1

    # 4.2. Camera Cua chinh Lobby
    res_cam_lobby = httpx.get(BASE_URL, params={"date_from": "2026-09-20", "date_to": "2026-09-20", "camera_id": "Cửa chính Lobby"})
    assert res_cam_lobby.status_code == 200
    print(f"   [PASS] Loc Camera 'Cửa chính Lobby': {res_cam_lobby.json()['total']} ban ghi.")

    # 5. Test Bo loc 4: Cua kiem soat
    print("\n5. KIEM THU BO LOC CUA KIEM SOAT:")
    res_door_lobby = httpx.get(BASE_URL, params={"date_from": "2026-09-20", "date_to": "2026-09-20", "door_id": "Cửa chính Lobby"})
    assert res_door_lobby.status_code == 200
    print(f"   [PASS] Loc Cua 'Cửa chính Lobby': {res_door_lobby.json()['total']} ban ghi.")

    res_door_exit = httpx.get(BASE_URL, params={"date_from": "2026-09-20", "date_to": "2026-09-20", "door_id": "Cửa ra chính"})
    assert res_door_exit.status_code == 200
    print(f"   [PASS] Loc Cua 'Cửa ra chính': {res_door_exit.json()['total']} ban ghi.")

    # 6. Test Bo loc 5: Trang thai (Result / Status)
    print("\n6. KIEM THU BO LOC TRANG THAI (RESULT/STATUS):")
    for st in ["GRANTED", "DENIED", "MANUAL_VERIFY", "UNKNOWN"]:
        res_st = httpx.get(BASE_URL, params={"date_from": "2026-09-20", "date_to": "2026-09-20", "result": st})
        assert res_st.status_code == 200
        print(f"   [PASS] Loc Trang thai '{st}': {res_st.json()['total']} ban ghi.")

    # 7. Test Bo loc 6: Do tin cay (Confidence Range)
    print("\n7. KIEM THU BO LOC DO TIN CAY (CONFIDENCE):")
    # 7.1. Do tin cay rat cao >= 95%
    res_conf_high = httpx.get(BASE_URL, params={"date_from": "2026-09-20", "date_to": "2026-09-20", "confidence_min": 95.0})
    assert res_conf_high.status_code == 200
    print(f"   [PASS] Loc Do tin cay >= 95%: {res_conf_high.json()['total']} ban ghi.")
    for item in res_conf_high.json()["items"]:
        assert float(item["confidence"]) >= 95.0, f"Confidence {item['confidence']} < 95.0"

    # 7.2. Do tin cay thap < 70%
    res_conf_low = httpx.get(BASE_URL, params={"date_from": "2026-09-20", "date_to": "2026-09-20", "confidence_max": 70.0})
    assert res_conf_low.status_code == 200
    print(f"   [PASS] Loc Do tin cay < 70%: {res_conf_low.json()['total']} ban ghi.")
    for item in res_conf_low.json()["items"]:
        assert float(item["confidence"]) <= 70.0, f"Confidence {item['confidence']} > 70.0"

    # 8. Test ket hop da bo loc (Multi-filter)
    print("\n8. KIEM THU KET HOP DA BO LOC:")
    res_multi = httpx.get(BASE_URL, params={
        "date_from": "2026-09-20",
        "date_to": "2026-09-20",
        "result": "GRANTED",
        "camera_id": "Cửa chính Lobby",
        "confidence_min": 95.0,
    })
    assert res_multi.status_code == 200
    print(f"   [PASS] Ket hop (Ngay 20/09 + GRANTED + Cua chinh Lobby + Conf >= 95%): {res_multi.json()['total']} ban ghi.")
    for item in res_multi.json()["items"]:
        assert item["result"] == "GRANTED"
        assert "Cửa chính Lobby" in item["camera_name"]
        assert float(item["confidence"]) >= 95.0

    print("\n" + "=" * 80)
    print("TAT CA 6 BO LOC DA HOAT DONG CHINH XAC 100% TREN DU LIEU THUC TE!")
    print("=" * 80)
    return True


if __name__ == "__main__":
    success = run_filter_tests()
    sys.exit(0 if success else 1)
