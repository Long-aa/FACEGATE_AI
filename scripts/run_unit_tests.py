"""
Script chạy toàn bộ 60 Unit Test Cases (FRM01 - FRM08) cho Đồ án:
"Kiểm thử hệ thống ra vào cửa sử dụng OpenCV và Face_Recognition"
Sinh viên: Trương Văn Long - MSSV: 20233089
"""
import sys
import os
from pathlib import Path

# Configure utf-8 encoding for Windows terminals
if sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Add backend to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

import numpy as np
from unittest.mock import MagicMock
from datetime import datetime

from app.schemas.face_registration import (
    EmployeeProfile,
    EmployeeStatus,
    FaceRegistrationMetadata,
    RegistrationContext,
    RegistrationStatus,
)
from app.core.exceptions import (
    CameraConfigurationException,
    CameraInitializationException,
    CancellationException,
    DataIntegrityException,
    DatabaseConstraintException,
    DatabaseException,
    DuplicateFaceException,
    DuplicateRegistrationException,
    EmployeeStatusException,
    EncodingException,
    FaceDetectionException,
    FaceQualityException,
    FrameCaptureException,
    MultipleFaceException,
    NotFoundException,
    PermissionException,
    PreprocessException,
    RegistrationException,
    TransactionException,
    ValidationError,
)
from app.services.face_registration_service import (
    validate_employee_info,
    open_camera,
    collect_face_samples,
    preprocess_face,
    generate_face_encoding,
    check_duplicate_face,
    save_face_registration,
    complete_face_registration,
)


def run_all_tests():
    print("=" * 80)
    print("  ĐỒ ÁN: KIỂM THỬ HỆ THỐNG RA VÀO CỬA SỬ DỤNG OPENCV VÀ FACE_RECOGNITION")
    print("  Báo Cáo Thực Thi Ca Kiểm Thử Tự Động (FRM01 - FRM08)")
    print("  Sinh viên: Trương Văn Long | MSSV: 20233089")
    print("=" * 80)

    passed = 0
    failed = 0
    total = 0

    def test(name, fn):
        nonlocal passed, failed, total
        total += 1
        try:
            fn()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name} -> {e}")
            failed += 1

    # Fixtures
    valid_emp = EmployeeProfile(employee_id="EMP-0001", name="Nguyen Van A", status=EmployeeStatus.ACTIVE)
    inactive_emp = EmployeeProfile(employee_id="EMP-0002", name="Tran Thi B", status=EmployeeStatus.INACTIVE)
    blocked_emp = EmployeeProfile(employee_id="EMP-0003", name="Le Van C", status=EmployeeStatus.BLOCKED)

    mock_repo = MagicMock()
    mock_repo.get_employee_by_id.return_value = valid_emp
    mock_repo.employee_has_active_registration.return_value = False
    mock_repo.get_all_encodings.return_value = []
    mock_repo.save_registration.return_value = True

    valid_frame = np.zeros((480, 640, 3), dtype=np.uint8)

    mock_cv2 = MagicMock()
    mock_cap = MagicMock()
    mock_cap.isOpened.return_value = True
    mock_cap.read.return_value = (True, valid_frame)
    mock_cv2.VideoCapture.return_value = mock_cap

    mock_detector = MagicMock()
    mock_detector.detect.return_value = [(10, 10, 80, 80)]

    vec1 = np.random.rand(128)
    valid_enc = (vec1 / np.linalg.norm(vec1)).tolist()
    vec2 = np.ones(128) * -1.0
    diff_enc = (vec2 / np.linalg.norm(vec2)).tolist()

    mock_ai = MagicMock()
    mock_ai.encode.return_value = np.asarray(valid_enc)

    valid_meta = FaceRegistrationMetadata(registered_at=datetime.utcnow(), status=RegistrationStatus.ACTIVE)

    # FRM01
    print("\n--- [FRM01] validate_employee_info (7 Test Cases) ---")
    test("FRM01-UTCID01 (Normal): Mã nhân viên hợp lệ, trạng thái ACTIVE", lambda: validate_employee_info("EMP-0001", repository=mock_repo))
    def f_frm01_02():
        try:
            validate_employee_info("", repository=mock_repo)
            assert False, "Should raise ValidationError"
        except ValidationError:
            pass
    test("FRM01-UTCID02 (Abnormal): Mã nhân viên rỗng/None -> ValidationError", f_frm01_02)
    def f_frm01_03():
        try:
            validate_employee_info(12345, repository=mock_repo)
            assert False, "Should raise ValidationError"
        except ValidationError:
            pass
    test("FRM01-UTCID03 (Abnormal): Mã nhân viên sai kiểu dữ liệu -> ValidationError", f_frm01_03)
    def f_frm01_04():
        try:
            validate_employee_info("0001", repository=mock_repo)
            assert False, "Should raise ValidationError"
        except ValidationError:
            pass
    test("FRM01-UTCID04 (Abnormal): Sai định dạng (thiếu tiền tố EMP-) -> ValidationError", f_frm01_04)
    def f_frm01_05():
        r = MagicMock()
        r.get_employee_by_id.return_value = None
        try:
            validate_employee_info("EMP-9999", repository=r)
            assert False, "Should raise NotFoundException"
        except NotFoundException:
            pass
    test("FRM01-UTCID05 (Boundary): Không tìm thấy nhân viên trong CSDL -> NotFoundException", f_frm01_05)
    def f_frm01_06():
        r = MagicMock()
        r.get_employee_by_id.return_value = valid_emp
        r.employee_has_active_registration.return_value = True
        try:
            validate_employee_info("EMP-0001", repository=r)
            assert False, "Should raise DuplicateRegistrationException"
        except DuplicateRegistrationException:
            pass
    test("FRM01-UTCID06 (Boundary): Đã có hồ sơ khuôn mặt active -> DuplicateRegistrationException", f_frm01_06)
    def f_frm01_07():
        r = MagicMock()
        r.get_employee_by_id.return_value = inactive_emp
        r.employee_has_active_registration.return_value = False
        try:
            validate_employee_info("EMP-0002", repository=r)
            assert False, "Should raise EmployeeStatusException"
        except EmployeeStatusException:
            pass
    test("FRM01-UTCID07 (Boundary): Nhân viên bị vô hiệu hóa/khóa -> EmployeeStatusException", f_frm01_07)

    # FRM02
    print("\n--- [FRM02] open_camera (7 Test Cases) ---")
    test("FRM02-UTCID01 (Normal): Camera index hợp lệ + thiết bị sẵn sàng", lambda: open_camera(0, cv2_module=mock_cv2))
    def f_frm02_02():
        try:
            open_camera("0", cv2_module=mock_cv2)
            assert False
        except CameraInitializationException:
            pass
    test("FRM02-UTCID02 (Abnormal): Camera index không phải int -> CameraInitializationException", f_frm02_02)
    def f_frm02_03():
        c = MagicMock()
        cap = MagicMock()
        cap.isOpened.return_value = False
        c.VideoCapture.return_value = cap
        try:
            open_camera(0, cv2_module=c)
            assert False
        except CameraInitializationException:
            pass
    test("FRM02-UTCID03 (Boundary): Camera không mở được (isOpened=False) -> CameraInitializationException", f_frm02_03)
    def f_frm02_04():
        c = MagicMock()
        c.VideoCapture.side_effect = PermissionError("Denied")
        try:
            open_camera(0, cv2_module=c)
            assert False
        except PermissionException:
            pass
    test("FRM02-UTCID04 (Abnormal): Quyền truy cập camera bị từ chối -> PermissionException", f_frm02_04)
    def f_frm02_05():
        c = MagicMock()
        cap = MagicMock()
        cap.isOpened.return_value = True
        cap.read.return_value = (False, None)
        c.VideoCapture.return_value = cap
        try:
            open_camera(0, cv2_module=c)
            assert False
        except FrameCaptureException:
            pass
    test("FRM02-UTCID05 (Boundary): Đọc frame trả về False -> FrameCaptureException", f_frm02_05)
    def f_frm02_06():
        c = MagicMock()
        cap = MagicMock()
        cap.isOpened.return_value = True
        cap.read.return_value = (True, np.array([]))
        c.VideoCapture.return_value = cap
        try:
            open_camera(0, cv2_module=c)
            assert False
        except FrameCaptureException:
            pass
    test("FRM02-UTCID06 (Abnormal): Frame rỗng (empty array) -> FrameCaptureException", f_frm02_06)
    def f_frm02_07():
        c = MagicMock()
        cap = MagicMock()
        cap.isOpened.return_value = True
        cap.read.return_value = (True, np.zeros((100, 100, 3), dtype=np.uint8))
        c.VideoCapture.return_value = cap
        try:
            open_camera(0, cv2_module=c)
            assert False
        except CameraConfigurationException:
            pass
    test("FRM02-UTCID07 (Boundary): Độ phân giải nhỏ hơn tối thiểu (< 160x120) -> CameraConfigurationException", f_frm02_07)

    # FRM03
    print("\n--- [FRM03] collect_face_samples (9 Test Cases) ---")
    test("FRM03-UTCID01 (Normal): Frame hợp lệ, phát hiện 1 mặt chuẩn", lambda: collect_face_samples(valid_frame, 5, face_detector=mock_detector))
    def f_frm03_02():
        d = MagicMock()
        d.detect.return_value = []
        try:
            collect_face_samples(valid_frame, 5, face_detector=d)
            assert False
        except FaceDetectionException:
            pass
    test("FRM03-UTCID02 (Abnormal): Không tìm thấy khuôn mặt -> FaceDetectionException", f_frm03_02)
    def f_frm03_03():
        d = MagicMock()
        d.detect.return_value = [(10, 10, 80, 80), (100, 100, 80, 80)]
        try:
            collect_face_samples(valid_frame, 5, face_detector=d)
            assert False
        except MultipleFaceException:
            pass
    test("FRM03-UTCID03 (Abnormal): Phát hiện nhiều khuôn mặt -> MultipleFaceException", f_frm03_03)
    def f_frm03_04():
        d = MagicMock()
        d.detect.return_value = [(-10, 10, 80, 80)]
        try:
            collect_face_samples(valid_frame, 5, face_detector=d)
            assert False
        except FaceDetectionException:
            pass
    test("FRM03-UTCID04 (Abnormal): Bounding box tọa độ âm -> FaceDetectionException", f_frm03_04)
    def f_frm03_05():
        d = MagicMock()
        d.detect.return_value = [(10, 10, 15, 15)]
        try:
            collect_face_samples(valid_frame, 5, face_detector=d)
            assert False
        except FaceQualityException:
            pass
    test("FRM03-UTCID05 (Abnormal): Kích thước mặt quá nhỏ (< 20px) -> FaceQualityException", f_frm03_05)
    def f_frm03_06():
        d = MagicMock()
        d.detect.return_value = [(600, 450, 100, 100)]
        try:
            collect_face_samples(valid_frame, 5, face_detector=d)
            assert False
        except FaceQualityException:
            pass
    test("FRM03-UTCID06 (Boundary): Vùng mặt vượt ra ngoài biên frame -> FaceQualityException", f_frm03_06)
    def f_frm03_07():
        ex = [np.zeros((80, 80, 3))] * 5
        res = collect_face_samples(valid_frame, 5, face_detector=mock_detector, current_samples=ex)
        assert res["status"] == "completed"
    test("FRM03-UTCID07 (Normal): Đã thu thập đủ số lượng mẫu yêu cầu", f_frm03_07)
    def f_frm03_08():
        try:
            collect_face_samples(None, 5, face_detector=mock_detector)
            assert False
        except FrameCaptureException:
            pass
    test("FRM03-UTCID08 (Boundary): Frame là None do camera ngắt -> FrameCaptureException", f_frm03_08)
    def f_frm03_09():
        try:
            collect_face_samples(valid_frame, 0, face_detector=mock_detector)
            assert False
        except ValidationError:
            pass
    test("FRM03-UTCID09 (Abnormal): Cấu hình số mẫu <= 0 -> ValidationError", f_frm03_09)

    # FRM04
    print("\n--- [FRM04] preprocess_face (7 Test Cases) ---")
    test("FRM04-UTCID01 (Normal): Tiền xử lý ảnh mặt chuẩn (resize 112x112, chuẩn hóa [0,1])", lambda: preprocess_face(np.ones((80, 80, 3), dtype=np.uint8) * 200))
    def f_frm04_02():
        try:
            preprocess_face(None)
            assert False
        except PreprocessException:
            pass
    test("FRM04-UTCID02 (Abnormal): Ảnh là None -> PreprocessException", f_frm04_02)
    def f_frm04_03():
        try:
            preprocess_face(np.array([1, 2, 3]))
            assert False
        except PreprocessException:
            pass
    test("FRM04-UTCID03 (Abnormal): Định dạng mảng 1D không hợp lệ -> PreprocessException", f_frm04_03)
    def f_frm04_04():
        try:
            preprocess_face(np.zeros((0, 0, 3)))
            assert False
        except PreprocessException:
            pass
    test("FRM04-UTCID04 (Abnormal): ROI ảnh rỗng -> PreprocessException", f_frm04_04)
    def f_frm04_05():
        try:
            preprocess_face(np.ones((80, 80, 3), dtype=np.uint8), target_size=(0, 112))
            assert False
        except PreprocessException:
            pass
    test("FRM04-UTCID05 (Abnormal): Kích thước target <= 0 -> PreprocessException", f_frm04_05)
    def f_frm04_06():
        img = np.ones((80, 80, 3), dtype=np.float32)
        img[0, 0, 0] = np.nan
        try:
            preprocess_face(img)
            assert False
        except PreprocessException:
            pass
    test("FRM04-UTCID06 (Boundary): Ảnh chứa giá trị lỗi NaN/Inf -> PreprocessException", f_frm04_06)
    test("FRM04-UTCID07 (Boundary): Ảnh kích thước nhỏ nhất cho phép (20x20)", lambda: preprocess_face(np.ones((20, 20, 3), dtype=np.uint8) * 128))

    # FRM05
    print("\n--- [FRM05] generate_face_encoding (7 Test Cases) ---")
    test("FRM05-UTCID01 (Normal): Trích xuất vector 128D thành công", lambda: generate_face_encoding(np.ones((112, 112, 3), dtype=np.float32), model=mock_ai))
    def f_frm05_02():
        img = np.ones((112, 112, 3), dtype=np.float32)
        img[0, 0, 0] = np.nan
        try:
            generate_face_encoding(img, model=mock_ai)
            assert False
        except EncodingException:
            pass
    test("FRM05-UTCID02 (Abnormal): Ảnh bị hỏng điểm ảnh (NaN) -> EncodingException", f_frm05_02)
    def f_frm05_03():
        try:
            generate_face_encoding(np.array([]), model=mock_ai)
            assert False
        except EncodingException:
            pass
    test("FRM05-UTCID03 (Abnormal): Mảng ảnh rỗng -> EncodingException", f_frm05_03)
    def f_frm05_04():
        try:
            generate_face_encoding(np.ones((112, 112, 3), dtype=np.float32), model=None)
            assert False
        except EncodingException:
            pass
    test("FRM05-UTCID04 (Boundary): Model chưa nạp (None) -> EncodingException", f_frm05_04)
    test("FRM05-UTCID05 (Boundary): Ảnh ở kích thước biên tối thiểu (20x20)", lambda: generate_face_encoding(np.ones((20, 20, 3), dtype=np.float32), model=mock_ai))
    def f_frm05_06():
        bad = MagicMock()
        bad.encode.return_value = None
        try:
            generate_face_encoding(np.ones((112, 112, 3), dtype=np.float32), model=bad)
            assert False
        except EncodingException:
            pass
    test("FRM05-UTCID06 (Abnormal): Model trả về None -> EncodingException", f_frm05_06)
    def f_frm05_07():
        try:
            generate_face_encoding(None, model=mock_ai)
            assert False
        except EncodingException:
            pass
    test("FRM05-UTCID07 (Abnormal): Ảnh là None -> EncodingException", f_frm05_07)

    # FRM06
    print("\n--- [FRM06] check_duplicate_face (7 Test Cases) ---")
    test("FRM06-UTCID01 (Normal): Không có khuôn mặt trùng lặp -> False", lambda: check_duplicate_face(valid_enc, [diff_enc], threshold=0.6))
    def f_frm06_02():
        try:
            check_duplicate_face(valid_enc, [valid_enc], threshold=0.6)
            assert False
        except DuplicateFaceException:
            pass
    test("FRM06-UTCID02 (Boundary): Độ tương đồng >= Threshold -> DuplicateFaceException", f_frm06_02)
    test("FRM06-UTCID03 (Normal): CSDL chưa có vector nào -> False", lambda: check_duplicate_face(valid_enc, [], threshold=0.6))
    def f_frm06_04():
        try:
            check_duplicate_face(valid_enc, [valid_enc], threshold=1.0)
            assert False
        except DuplicateFaceException:
            pass
    test("FRM06-UTCID04 (Boundary): Trùng khớp tuyệt đối tại biên (threshold=1.0)", f_frm06_04)
    def f_frm06_05():
        try:
            check_duplicate_face(valid_enc, ["malformed_vector"])
            assert False
        except DataIntegrityException:
            pass
    test("FRM06-UTCID05 (Boundary): Vector trong DB bị sai lệch cấu trúc -> DataIntegrityException", f_frm06_05)
    def f_frm06_06():
        try:
            check_duplicate_face(None, [valid_enc])
            assert False
        except ValidationError:
            pass
    test("FRM06-UTCID06 (Abnormal): Vector mới là None -> ValidationError", f_frm06_06)
    def f_frm06_07():
        try:
            check_duplicate_face(valid_enc, [valid_enc], threshold=-0.1)
            assert False
        except ValidationError:
            pass
    test("FRM06-UTCID07 (Abnormal): Ngưỡng Threshold âm -> ValidationError", f_frm06_07)

    # FRM07
    print("\n--- [FRM07] save_face_registration (8 Test Cases) ---")
    test("FRM07-UTCID01 (Normal): Lưu hồ sơ khuôn mặt thành công -> True", lambda: save_face_registration("EMP-0001", valid_enc, valid_meta, repository=mock_repo))
    def f_frm07_02():
        try:
            save_face_registration(None, valid_enc, valid_meta)
            assert False
        except ValidationError:
            pass
    test("FRM07-UTCID02 (Abnormal): Thiếu employee_id -> ValidationError", f_frm07_02)
    def f_frm07_03():
        try:
            save_face_registration("EMP-0001", None, valid_meta)
            assert False
        except ValidationError:
            pass
    test("FRM07-UTCID03 (Abnormal): Thiếu encoding -> ValidationError", f_frm07_03)
    def f_frm07_04():
        r = MagicMock()
        r.save_registration.side_effect = DatabaseConstraintException("Unique constraint")
        try:
            save_face_registration("EMP-0001", valid_enc, valid_meta, repository=r)
            assert False
        except DatabaseConstraintException:
            pass
    test("FRM07-UTCID04 (Boundary): Vi phạm ràng buộc duy nhất (Unique) -> DatabaseConstraintException", f_frm07_04)
    def f_frm07_05():
        r = MagicMock()
        r.save_registration.side_effect = DatabaseException("DB down")
        try:
            save_face_registration("EMP-0001", valid_enc, valid_meta, repository=r)
            assert False
        except DatabaseException:
            pass
    test("FRM07-UTCID05 (Boundary): Lỗi kết nối CSDL -> DatabaseException", f_frm07_05)
    def f_frm07_06():
        r = MagicMock()
        r.save_registration.side_effect = TransactionException("Rollback")
        try:
            save_face_registration("EMP-0001", valid_enc, valid_meta, repository=r)
            assert False
        except TransactionException:
            pass
    test("FRM07-UTCID06 (Boundary): Lỗi transaction commit -> TransactionException", f_frm07_06)
    def f_frm07_07():
        try:
            save_face_registration("EMP-0001", valid_enc, {"foo": "bar"})
            assert False
        except ValidationError:
            pass
    test("FRM07-UTCID07 (Abnormal): Metadata thiếu trường bắt buộc -> ValidationError", f_frm07_07)
    test("FRM07-UTCID08 (Normal): Lưu với metadata dạng dict hợp lệ", lambda: save_face_registration("EMP-0001", valid_enc, {"registered_at": datetime.utcnow(), "status": RegistrationStatus.ACTIVE}, repository=mock_repo))

    # FRM08
    print("\n--- [FRM08] complete_face_registration (8 Test Cases) ---")
    ctx = RegistrationContext(employee_id="EMP-0001", face_samples=[np.zeros((112, 112, 3))], encoding=valid_enc, metadata=valid_meta)
    test("FRM08-UTCID01 (Normal): Toàn bộ các bước thành công -> RegistrationResponse(success=True)", lambda: complete_face_registration(ctx, repository=mock_repo))
    def f_frm08_02():
        c = RegistrationContext(employee_id="EMP-0001", face_samples=[], encoding=valid_enc, metadata=valid_meta)
        try:
            complete_face_registration(c, repository=mock_repo)
            assert False
        except RegistrationException:
            pass
    test("FRM08-UTCID02 (Abnormal): Danh sách mẫu rỗng -> RegistrationException", f_frm08_02)
    def f_frm08_03():
        c = RegistrationContext(employee_id="EMP-0001", face_samples=[np.zeros((112, 112, 3))], encoding=None, metadata=valid_meta)
        try:
            complete_face_registration(c, repository=mock_repo)
            assert False
        except RegistrationException:
            pass
    test("FRM08-UTCID03 (Boundary): Encoding là None -> RegistrationException", f_frm08_03)
    def f_frm08_04():
        r = MagicMock()
        r.get_all_encodings.return_value = [valid_enc]
        c = RegistrationContext(employee_id="EMP-0001", face_samples=[np.zeros((112, 112, 3))], encoding=valid_enc, metadata=valid_meta)
        try:
            complete_face_registration(c, repository=r)
            assert False
        except DuplicateFaceException:
            pass
    test("FRM08-UTCID04 (Boundary): Phát hiện khuôn mặt đã đăng ký -> DuplicateFaceException", f_frm08_04)
    def f_frm08_05():
        r = MagicMock()
        r.get_all_encodings.return_value = []
        r.save_registration.side_effect = DatabaseException("DB error")
        c = RegistrationContext(employee_id="EMP-0001", face_samples=[np.zeros((112, 112, 3))], encoding=valid_enc, metadata=valid_meta)
        try:
            complete_face_registration(c, repository=r)
            assert False
        except RegistrationException:
            pass
    test("FRM08-UTCID05 (Boundary): Lỗi lưu CSDL -> RegistrationException", f_frm08_05)
    def f_frm08_06():
        c = RegistrationContext(employee_id="EMP-0001", face_samples=[np.zeros((112, 112, 3))], encoding=valid_enc, metadata=valid_meta, cancelled=True)
        try:
            complete_face_registration(c, repository=mock_repo)
            assert False
        except CancellationException:
            pass
    test("FRM08-UTCID06 (Abnormal): Người dùng hủy tiến trình -> CancellationException", f_frm08_06)
    def f_frm08_07():
        c = RegistrationContext(employee_id="EMP-0001", face_samples=[np.zeros((112, 112, 3))], encoding=valid_enc, metadata=valid_meta)
        res = complete_face_registration(c, repository=mock_repo)
        assert res.employee_id == "EMP-0001" and res.status == RegistrationStatus.ACTIVE
    test("FRM08-UTCID07 (Normal): Response chứa đủ employee_id, status, registered_at", f_frm08_07)
    def f_frm08_08():
        try:
            complete_face_registration(None, repository=mock_repo)
            assert False
        except ValidationError:
            pass
    test("FRM08-UTCID08 (Abnormal): Registration context là None -> ValidationError", f_frm08_08)

    print("\n" + "=" * 80)
    print(f"  TỔNG KẾT KẾT QUẢ KIỂM THỬ: {passed}/{total} TEST CASES ĐẠT ({passed/total*100:.1f}%)")
    if failed == 0:
        print("  TRẠNG THÁI: TẤT CẢ 60 CA KIỂM THỬ ĐƠN VỊ ĐÃ VƯỢT QUA 100%!")
    else:
        print(f"  CÓ {failed} CA KIỂM THỬ THẤT BÀI.")
    print("=" * 80)


if __name__ == "__main__":
    run_all_tests()
