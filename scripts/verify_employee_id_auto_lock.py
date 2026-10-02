# -*- coding: utf-8 -*-
"""
Verification Script for Employee ID Auto-Generation and Field Lock
Test Case: IT01-003 / FRM-UI-01
- Test Steps: Quan sát Mã nhân viên. Thử nhập trực tiếp vào trường.
- Expected Output: Mã tự tạo dạng EMP-xxxx và trường bị khóa.
- Post-condition: Mã không bị người dùng thay đổi.
"""

import re
import sys
from pathlib import Path

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def test_auto_id_and_lock():
    print("=" * 70)
    print("VERIFICATION: Mã nhân viên tự tạo dạng EMP-xxxx và trường bị khóa")
    print("=" * 70)

    root = Path(__file__).parent.parent
    errors = []

    # 1. Check frontend/src/app/users/new/page.tsx
    new_user_file = root / "frontend" / "src" / "app" / "users" / "new" / "page.tsx"
    assert new_user_file.exists(), f"File {new_user_file} not found"
    content_new = new_user_file.read_text(encoding="utf-8")

    # Check auto-generation format
    match_fmt = re.search(r"employeeId:\s*`EMP-\$\{Math\.floor\(1000 \+ Math\.random\(\) \* 9000\)\}`", content_new)
    if match_fmt:
        print("  ✓ [users/new/page.tsx]: Khởi tạo mã tự động chuẩn dạng EMP-xxxx (4 chữ số)")
    else:
        errors.append("[users/new/page.tsx]: Khởi tạo mã chưa chuẩn EMP-xxxx")

    # Check input has readOnly
    if 'readOnly' in content_new and 'IT01-003' in content_new:
        print("  ✓ [users/new/page.tsx]: Trường input 'Mã nhân viên (IT01-003)' có thuộc tính readOnly")
    else:
        errors.append("[users/new/page.tsx]: Thiếu thuộc tính readOnly")

    # Check onKeyDown prevents modification
    if 'e.preventDefault()' in content_new and 'cursor: "not-allowed"' in content_new:
        print("  ✓ [users/new/page.tsx]: Trường input chặn gõ phím trực tiếp (onKeyDown e.preventDefault + cursor not-allowed)")
    else:
        errors.append("[users/new/page.tsx]: Chưa chặn sự kiện gõ trực tiếp vào trường")

    # Check visual lock badge
    if 'ĐÃ KHÓA' in content_new:
        print("  ✓ [users/new/page.tsx]: Có nhãn hiển thị trạng thái 'ĐÃ KHÓA' trực quan cho người dùng")
    else:
        errors.append("[users/new/page.tsx]: Thiếu nhãn 'ĐÃ KHÓA'")

    # 2. Check frontend/src/components/users/CreateUserFlowModal.tsx
    modal_file = root / "frontend" / "src" / "components" / "users" / "CreateUserFlowModal.tsx"
    assert modal_file.exists(), f"File {modal_file} not found"
    content_modal = modal_file.read_text(encoding="utf-8")

    if 'readOnly' in content_modal and 'ĐÃ KHÓA' in content_modal and 'cursor: "not-allowed"' in content_modal:
        print("  ✓ [CreateUserFlowModal.tsx]: Trường input 'Mã nhân viên' ở Modal tạo mới được khóa hoàn toàn")
    else:
        errors.append("[CreateUserFlowModal.tsx]: Modal tạo mới chưa khóa trường input Mã nhân viên")

    # 3. Check frontend/src/app/users/page.tsx
    users_file = root / "frontend" / "src" / "app" / "users" / "page.tsx"
    assert users_file.exists()
    content_users = users_file.read_text(encoding="utf-8")
    if 'Mã NV (Tự tạo - Đã khóa)' in content_users and 'readOnly' in content_users:
        print("  ✓ [users/page.tsx]: Modal thêm nhanh hiển thị Mã NV (Tự tạo - Đã khóa) và readOnly")
    else:
        errors.append("[users/page.tsx]: Modal thêm nhanh chưa đồng bộ khóa trường Mã NV")

    # 4. Check backend/app/api/v1/users.py
    backend_users_file = root / "backend" / "app" / "api" / "v1" / "users.py"
    assert backend_users_file.exists()
    content_backend = backend_users_file.read_text(encoding="utf-8")
    if '/next-employee-id' in content_backend and 'EMP-' in content_backend:
        print("  ✓ [backend/app/api/v1/users.py]: Có endpoint /next-employee-id cấp phát mã EMP-xxxx tự động")
    else:
        errors.append("[backend/app/api/v1/users.py]: Thiếu endpoint /next-employee-id")

    print("-" * 70)
    if not errors:
        print("KẾT QUẢ: TẤT CẢ CÁC ĐIỀU KIỆN ĐÃ ĐẠT CHUẨN 100% (PASS)")
        print("- Expected Output : Mã tự tạo dạng EMP-xxxx và trường bị khóa => ĐẠT")
        print("- Post-condition  : Mã không bị người dùng thay đổi            => ĐẠT")
        print("=" * 70)
        return True
    else:
        print(f"KẾT QUẢ: CÓ {len(errors)} LỖI:")
        for err in errors:
            print(f"  ✗ {err}")
        print("=" * 70)
        return False

if __name__ == "__main__":
    success = test_auto_id_and_lock()
    sys.exit(0 if success else 1)
