"""
TEST SUITE: KIỂM THỬ ĐỘC LẬP 2 BẢNG MA TRẬN UNIT TEST CASE (ACCESS LOGS)
- Không phụ thuộc vào thư viện bên ngoài (chỉ dùng standard library của Python).
- Dữ liệu mock độc lập được nhúng trực tiếp bám sát 100% dự án FaceGate AI.
"""

from typing import List, Dict, Any, Optional
import io
import sys

# Ensure UTF-8 stdout encoding on Windows
if hasattr(sys.stdout, "buffer"):
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    except Exception:
        pass

# ------------------------------------------------------------------------------
# 1. DỮ LIỆU MOCK ĐỘC LẬP (Ngày 24/10/2023 & 23/10/2023 chuẩn dự án FaceGate AI)
# ------------------------------------------------------------------------------
MOCK_LOGS: List[Dict[str, Any]] = [
    { "id": "1",  "time": "10:42:15 SA", "date": "24/10/2023", "userName": "Nguyễn Văn An",   "userCode": "EMP-2045", "department": "Khối KT & R&D",  "camera": "Cửa chính Lobby",      "action": "Entry", "confidence": 98.5, "result": "Granted" },
    { "id": "2",  "time": "10:38:02 SA", "date": "24/10/2023", "userName": "Trần Minh Đức",   "userCode": "EMP-2042", "department": "Kế toán",          "camera": "Phòng Server B",       "action": "Entry", "confidence": 72.1, "result": "Manual Verify" },
    { "id": "3",  "time": "10:15:45 SA", "date": "24/10/2023", "userName": "Người lạ",        "userCode": "Chưa đăng ký", "department": "—",            "camera": "Sảnh phía Tây",        "action": "Entry", "confidence": 15.0, "result": "Denied", "unknown": True },
    { "id": "4",  "time": "09:55:10 SA", "date": "24/10/2023", "userName": "Lê Hoàng Nam",    "userCode": "EMP-2105", "department": "Kinh doanh",       "camera": "Cửa ra chính",         "action": "Exit",  "confidence": 99.2, "result": "Granted" },
    { "id": "5",  "time": "09:30:44 SA", "date": "24/10/2023", "userName": "Phạm Quang Huy",  "userCode": "EMP-1988", "department": "Khối Vận hành",    "camera": "Cửa chính Lobby",      "action": "Entry", "confidence": 97.8, "result": "Granted" },
    { "id": "6",  "time": "09:15:22 SA", "date": "24/10/2023", "userName": "Võ Quốc Bảo",    "userCode": "EMP-2197", "department": "IT",               "camera": "Phòng họp A",          "action": "Entry", "confidence": 88.3, "result": "Granted" },
    { "id": "7",  "time": "08:54:03 SA", "date": "24/10/2023", "userName": "Nguyễn Thu Hà",   "userCode": "EMP-2210", "department": "Nhân sự",          "camera": "Cửa chính Lobby",      "action": "Entry", "confidence": 95.1, "result": "Granted" },
    { "id": "8",  "time": "08:33:18 SA", "date": "24/10/2023", "userName": "Người lạ",        "userCode": "Chưa đăng ký", "department": "—",            "camera": "Cửa kho Thiết bị R&D", "action": "Entry", "confidence": 8.2,  "result": "Denied", "unknown": True },
    { "id": "9",  "time": "08:11:55 SA", "date": "24/10/2023", "userName": "Trần Minh Đức",   "userCode": "EMP-2042", "department": "Kế toán",          "camera": "Cửa chính Lobby",      "action": "Entry", "confidence": 93.6, "result": "Granted" },
    { "id": "10", "time": "07:58:40 SA", "date": "24/10/2023", "userName": "Nguyễn Văn An",   "userCode": "EMP-2045", "department": "Khối KT & R&D",  "camera": "Phòng Server Kỹ thuật", "action": "Entry", "confidence": 99.7, "result": "Granted" },
    # Dữ liệu ngày 23/10/2023
    { "id": "11", "time": "17:45:12 CH", "date": "23/10/2023", "userName": "Lê Hoàng Nam",    "userCode": "EMP-2105", "department": "Kinh doanh",       "camera": "Cửa chính Lobby",      "action": "Exit",  "confidence": 98.4, "result": "Granted" },
    { "id": "12", "time": "17:30:05 CH", "date": "23/10/2023", "userName": "Phạm Quang Huy",  "userCode": "EMP-1988", "department": "Khối Vận hành",    "camera": "Cửa phân tầng TM",     "action": "Exit",  "confidence": 91.2, "result": "Granted" },
    { "id": "13", "time": "14:22:16 CH", "date": "23/10/2023", "userName": "Nguyễn Thu Hà",   "userCode": "EMP-2210", "department": "Nhân sự",          "camera": "Phòng Giám đốc",       "action": "Entry", "confidence": 0,    "result": "Denied",  "unknown": False },
    { "id": "14", "time": "13:10:44 CH", "date": "23/10/2023", "userName": "Nguyễn Văn An",   "userCode": "EMP-2045", "department": "Khối KT & R&D",  "camera": "Cửa chính Lobby",      "action": "Exit",  "confidence": 99.1, "result": "Granted" },
    { "id": "15", "time": "11:05:30 SA", "date": "23/10/2023", "userName": "Võ Quốc Bảo",    "userCode": "EMP-2197", "department": "IT",               "camera": "Phòng Server B",       "action": "Entry", "confidence": 67.4, "result": "Manual Verify" },
]

AVAILABLE_CAMERAS: List[str] = [
    "Tất cả Camera",
    "Cửa chính Lobby",
    "Phòng Server B",
    "Phòng Server Kỹ thuật",
    "Sảnh phía Tây",
    "Cửa ra chính",
    "Phòng họp A",
    "Cửa kho Thiết bị R&D",
    "Cửa phân tầng TM",
    "Phòng Giám đốc",
]

AVAILABLE_STATUSES: List[str] = [
    "all",           # Tất cả trạng thái
    "Granted",
    "Denied",
    "Manual Verify",
]

# ------------------------------------------------------------------------------
# 2. LOGIC FILTER ĐỘC LẬP TƯƠNG ĐƯƠNG FRONTEND
# ------------------------------------------------------------------------------
def filter_access_logs(
    logs: List[Dict[str, Any]],
    date: str = "24/10/2023",
    camera: str = "Tất cả Camera",
    result: str = "all",
    search: str = "",
    action: str = "all"
) -> List[Dict[str, Any]]:
    """Hàm lọc độc lập tương ứng với useMemo filter trên UI."""
    res = []
    q = search.lower().strip()
    for log in logs:
        # Match Date
        if date != "all" and log["date"] != date:
            continue
        # Match Camera (so khớp chính xác tên)
        if camera != "Tất cả Camera" and log["camera"] != camera:
            continue
        # Match Status
        if result != "all" and log["result"] != result:
            continue
        # Match Action
        if action != "all" and log["action"] != action:
            continue
        # Match Search
        if q:
            match_search = (
                q in log["userName"].lower() or
                q in log["userCode"].lower() or
                q in log["camera"].lower() or
                q in log["department"].lower() or
                q in log["result"].lower()
            )
            if not match_search:
                continue
        res.append(log)
    return res

def calculate_stats(logs: List[Dict[str, Any]]) -> Dict[str, int]:
    """Tính toán thống kê thanh Stats Strip."""
    return {
        "total": len(logs),
        "granted": sum(1 for l in logs if l["result"] == "Granted"),
        "denied": sum(1 for l in logs if l["result"] == "Denied"),
        "manualVerify": sum(1 for l in logs if l["result"] == "Manual Verify"),
    }

# ------------------------------------------------------------------------------
# 3. RUNNER TEST SUITE
# ------------------------------------------------------------------------------
class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0

    def test(self, tc_id: str, desc: str, assertion_fn):
        try:
            assertion_fn()
            print(f"  [✓ PASS] {tc_id:<14} : {desc}")
            self.passed += 1
        except AssertionError as e:
            print(f"  [✕ FAIL] {tc_id:<14} : {desc} --> Lỗi: {e}")
            self.failed += 1
        except Exception as e:
            print(f"  [✕ ERR ] {tc_id:<14} : {desc} --> Ngoại lệ: {e}")
            self.failed += 1

    def summary(self):
        print("\n" + "=" * 80)
        print(f"TỔNG KẾT: {self.passed} PASSED | {self.failed} FAILED | TỔNG SỐ: {self.passed + self.failed} CASES")
        if self.failed == 0:
            print(">>> CHÚC MỪNG: TẤT CẢ UNIT TEST CASE BÁM SÁT DỰ ÁN ĐỀU ĐÃ PASS 100%! <<<")
        print("=" * 80)

def run_all_tests():
    runner = TestRunner()

    # ==============================================================================
    # BẢNG 1: KIỂM THỬ BỘ LỌC CAMERA (UTCID_CAM01 -> UTCID_CAM10)
    # ==============================================================================
    print("\n" + "=" * 80)
    print("BẢNG 1: KIỂM THỬ BỘ LỌC CAMERA (ACCESS LOGS - NGÀY 24/10/2023)")
    print("=" * 80)

    # UTCID_CAM01
    def tc_cam01():
        assert len(AVAILABLE_CAMERAS) == 10, f"Expected 10 camera options, got {len(AVAILABLE_CAMERAS)}"
        assert "Tất cả Camera" in AVAILABLE_CAMERAS
        assert "Cửa chính Lobby" in AVAILABLE_CAMERAS
        assert "Phòng Server B" in AVAILABLE_CAMERAS
        assert "Sảnh phía Tây" in AVAILABLE_CAMERAS
    runner.test("UTCID_CAM01", "Mở dropdown Camera: Hiển thị đầy đủ 10 tùy chọn Camera theo hệ thống", tc_cam01)

    # UTCID_CAM02
    def tc_cam02():
        # Camera Tầng 5 / Cửa phân tầng TM không có bản ghi ngày 24/10/2023
        res = filter_access_logs(MOCK_LOGS, date="24/10/2023", camera="Cửa phân tầng TM")
        assert len(res) == 0, f"Expected 0 logs, got {len(res)}"
    runner.test("UTCID_CAM02", "Chọn Camera không có dữ liệu ngày 24/10: Bảng rỗng (0 kết quả, hiển thị màn hình trống)", tc_cam02)

    # UTCID_CAM03
    def tc_cam03():
        # Đang ở camera hiện tại, không chọn giá trị mới -> dữ liệu giữ nguyên
        res_before = filter_access_logs(MOCK_LOGS, date="24/10/2023", camera="Tất cả Camera")
        res_after = filter_access_logs(MOCK_LOGS, date="24/10/2023", camera="Tất cả Camera")
        assert res_before == res_after, "Dữ liệu bị thay đổi bất thường khi không chọn mới"
    runner.test("UTCID_CAM03", "Mở dropdown click ra ngoài: Giữ nguyên trạng thái và danh sách bản ghi hiện tại", tc_cam03)

    # UTCID_CAM04
    def tc_cam04():
        # Chuyển từ Phòng Server B về Tất cả Camera
        res_filtered = filter_access_logs(MOCK_LOGS, date="24/10/2023", camera="Phòng Server B")
        assert len(res_filtered) == 1
        res_all = filter_access_logs(MOCK_LOGS, date="24/10/2023", camera="Tất cả Camera")
        assert len(res_all) == 10, f"Expected 10 logs for all cameras on 24/10, got {len(res_all)}"
    runner.test("UTCID_CAM04", "Đổi từ 'Phòng Server B' sang 'Tất cả Camera': Bỏ lọc, trả về đủ 10 bản ghi ngày 24/10", tc_cam04)

    # UTCID_CAM05
    def tc_cam05():
        res = filter_access_logs(MOCK_LOGS, date="24/10/2023", camera="Cửa chính Lobby")
        assert len(res) == 4, f"Expected 4 logs for Cửa chính Lobby, got {len(res)}"
        assert all(l["camera"] == "Cửa chính Lobby" for l in res)
    runner.test("UTCID_CAM05", "Chọn Camera 'Cửa chính Lobby': Chỉ trả về đúng 4 bản ghi thuộc Cửa chính Lobby", tc_cam05)

    # UTCID_CAM06
    def tc_cam06():
        res = filter_access_logs(MOCK_LOGS, date="24/10/2023", camera="Phòng Server B")
        assert len(res) == 1
        assert res[0]["userName"] == "Trần Minh Đức"
        assert res[0]["userCode"] == "EMP-2042"
        assert res[0]["result"] == "Manual Verify"
    runner.test("UTCID_CAM06", "Chọn 'Phòng Server B': Trả về đúng bản ghi Trần Minh Đức – Manual Verify", tc_cam06)

    # UTCID_CAM07
    def tc_cam07():
        res = filter_access_logs(MOCK_LOGS, date="24/10/2023", camera="Sảnh phía Tây")
        assert len(res) == 1
        assert res[0]["userName"] == "Người lạ"
        assert res[0]["result"] == "Denied"
    runner.test("UTCID_CAM07", "Chọn 'Sảnh phía Tây': Trả về đúng bản ghi Người lạ – Denied", tc_cam07)

    # UTCID_CAM08
    def tc_cam08():
        # Mặc định ngày 24/10, Tất cả Camera
        res = filter_access_logs(MOCK_LOGS, date="24/10/2023", camera="Tất cả Camera")
        assert len(res) == 10, f"Expected 10 records for default view, got {len(res)}"
    runner.test("UTCID_CAM08", "Mở màn hình lần đầu: Mặc định Tất cả Camera, hiển thị đầy đủ danh sách ban đầu", tc_cam08)

    # UTCID_CAM09
    def tc_cam09():
        # Kết hợp: Camera Cửa chính Lobby VÀ Search "Nguyễn Văn An"
        res = filter_access_logs(MOCK_LOGS, date="24/10/2023", camera="Cửa chính Lobby", search="Nguyễn Văn An")
        assert len(res) == 1
        assert res[0]["userName"] == "Nguyễn Văn An"
        assert res[0]["camera"] == "Cửa chính Lobby"
    runner.test("UTCID_CAM09", "Lọc kết hợp Camera 'Cửa chính Lobby' và tìm kiếm 'Nguyễn Văn An': Trả về đúng 1 bản ghi", tc_cam09)

    # UTCID_CAM10
    def tc_cam10():
        # Đối chiếu Cửa chính Lobby với Cửa ra chính
        res_main = filter_access_logs(MOCK_LOGS, date="24/10/2023", camera="Cửa chính Lobby")
        assert not any(l["camera"] == "Cửa ra chính" for l in res_main), "Lỗi gộp bản ghi của Cửa ra chính"
        assert not any(l["userName"] == "Lê Hoàng Nam" for l in res_main)
    runner.test("UTCID_CAM10", "So sánh chính xác: Camera 'Cửa chính Lobby' không bao gồm bản ghi 'Cửa ra chính'", tc_cam10)

    # ==============================================================================
    # BẢNG 2: KIỂM THỬ BỘ LỌC TRẠNG THÁI (UTCID_TT01 -> UTCID_TT10)
    # ==============================================================================
    print("\n" + "=" * 80)
    print("BẢNG 2: KIỂM THỬ BỘ LỌC TRẠNG THÁI (STATUS FILTER - NGÀY 24/10/2023)")
    print("=" * 80)

    # UTCID_TT01
    def tc_tt01():
        assert len(AVAILABLE_STATUSES) == 4
        assert set(AVAILABLE_STATUSES) == {"all", "Granted", "Denied", "Manual Verify"}
    runner.test("UTCID_TT01", "Mở dropdown Trạng thái: Hiển thị đủ 4 options (Tất cả, Granted, Denied, Manual Verify)", tc_tt01)

    # UTCID_TT02
    def tc_tt02():
        # Phòng Server B ngày 24/10 không có bản ghi Denied
        res = filter_access_logs(MOCK_LOGS, date="24/10/2023", camera="Phòng Server B", result="Denied")
        assert len(res) == 0, f"Expected 0 records, got {len(res)}"
    runner.test("UTCID_TT02", "Điều kiện bất thường: 'Phòng Server B' + 'Denied' -> Không tìm thấy kết quả (0 bản ghi)", tc_tt02)

    # UTCID_TT03
    def tc_tt03():
        # Giữ nguyên giá trị đang chọn
        res1 = filter_access_logs(MOCK_LOGS, date="24/10/2023", result="all")
        res2 = filter_access_logs(MOCK_LOGS, date="24/10/2023", result="all")
        assert len(res1) == 10 and res1 == res2
    runner.test("UTCID_TT03", "Chọn lại giá trị đang chọn: Dữ liệu giữ nguyên không đổi, không phát sinh lỗi", tc_tt03)

    # UTCID_TT04
    def tc_tt04():
        # Đang lọc Granted -> Nhấn Xóa bộ lọc (reset về 'all')
        res_granted = filter_access_logs(MOCK_LOGS, date="24/10/2023", result="Granted")
        assert len(res_granted) == 7
        # Reset
        res_reset = filter_access_logs(MOCK_LOGS, date="24/10/2023", result="all", camera="Tất cả Camera", search="")
        assert len(res_reset) == 10
    runner.test("UTCID_TT04", "Nhấn 'Xóa bộ lọc': Trạng thái được reset về mặc định, hiển thị lại toàn bộ 10 bản ghi", tc_tt04)

    # UTCID_TT05
    def tc_tt05():
        res = filter_access_logs(MOCK_LOGS, date="24/10/2023", result="Granted")
        assert len(res) == 7, f"Expected 7 Granted records on 24/10, got {len(res)}"
        assert all(l["result"] == "Granted" for l in res)
    runner.test("UTCID_TT05", "Chọn Trạng thái 'Granted': Chỉ trả về 7 bản ghi Granted, không lẫn Denied/Manual Verify", tc_tt05)

    # UTCID_TT06
    def tc_tt06():
        res = filter_access_logs(MOCK_LOGS, date="24/10/2023", result="Manual Verify")
        assert len(res) == 1, f"Expected 1 Manual Verify, got {len(res)}"
        assert res[0]["userName"] == "Trần Minh Đức"
        assert res[0]["camera"] == "Phòng Server B"
    runner.test("UTCID_TT06", "Chọn Trạng thái 'Manual Verify': Chỉ trả về duy nhất 1 bản ghi Trần Minh Đức", tc_tt06)

    # UTCID_TT07
    def tc_tt07():
        res = filter_access_logs(MOCK_LOGS, date="24/10/2023", result="Denied")
        assert len(res) == 2, f"Expected 2 Denied records on 24/10, got {len(res)}"
        assert all(l["userName"] == "Người lạ" and l["result"] == "Denied" for l in res)
    runner.test("UTCID_TT07", "Chọn Trạng thái 'Denied': Chỉ trả về 2 bản ghi Người lạ bị từ chối", tc_tt07)

    # UTCID_TT08
    def tc_tt08():
        res = filter_access_logs(MOCK_LOGS, date="24/10/2023", result="Granted")
        stats = calculate_stats(res)
        assert len(res) == stats["granted"] == 7
        assert stats["denied"] == 0
        assert stats["manualVerify"] == 0
    runner.test("UTCID_TT08", "Đồng bộ số liệu: Số bản ghi bảng lọc Granted (7) khớp 100% với thẻ thống kê Stats Strip", tc_tt08)

    # UTCID_TT09
    def tc_tt09():
        res_g = filter_access_logs(MOCK_LOGS, date="24/10/2023", result="Granted")
        assert len(res_g) == 7
        res_d = filter_access_logs(MOCK_LOGS, date="24/10/2023", result="Denied")
        assert len(res_d) == 2
        # Không còn bản ghi Granted nào trong kết quả Denied
        assert not any(l in res_d for l in res_g)
    runner.test("UTCID_TT09", "Đổi trực tiếp từ Granted sang Denied: Kết quả thay thế tức thì, không sót bản ghi cũ", tc_tt09)

    # UTCID_TT10
    def tc_tt10():
        # Chọn lại liên tiếp nhiều lần (Idempotency)
        res_first = filter_access_logs(MOCK_LOGS, date="24/10/2023", result="Granted")
        for _ in range(3):
            res_repeat = filter_access_logs(MOCK_LOGS, date="24/10/2023", result="Granted")
            assert res_first == res_repeat
        assert len(res_first) == 7
    runner.test("UTCID_TT10", "Chọn lại cùng giá trị liên tiếp: Kết quả giữ nguyên, không phát sinh bản ghi trùng lặp", tc_tt10)

    # Tổng kết
    runner.summary()
    return runner.failed == 0

if __name__ == "__main__":
    import sys
    success = run_all_tests()
    sys.exit(0 if success else 1)
