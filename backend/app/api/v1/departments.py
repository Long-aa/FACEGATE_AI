"""
API routes for Department Management.
"""
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.audit import AuditLog
from app.models.department import Department
from app.models.user import User
from app.schemas.department import (
    DepartmentCreate,
    DepartmentListResponse,
    DepartmentMemberOut,
    DepartmentOut,
    DepartmentUpdate,
)

router = APIRouter()


@router.get("", response_model=DepartmentListResponse)
def list_departments(
    q: Optional[str] = Query(None, description="Tìm kiếm theo tên hoặc mã phòng ban"),
    access_level: Optional[str] = Query(None, description="Lọc theo cấp độ an ninh"),
    status: Optional[str] = Query(None, description="Lọc theo trạng thái ACTIVE / INACTIVE"),
    db: Session = Depends(get_db),
) -> Any:
    """
    List all departments with live member counts from PostgreSQL.
    """
    query = db.query(Department)

    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.filter((Department.name.ilike(search)) | (Department.code.ilike(search)))

    if access_level and access_level != "all":
        query = query.filter(Department.access_level == access_level)

    if status and status != "all":
        query = query.filter(Department.status == status)

    departments = query.order_by(Department.created_at.asc()).all()

    # Calculate member counts dynamically with robust matching
    all_user_depts = [u[0].strip() for u in db.query(User.department).filter(User.department.isnot(None)).all() if u[0]]

    items = []
    for dept in departments:
        out = DepartmentOut.from_orm(dept)
        d_name_lower = dept.name.lower()
        matched_cnt = sum(
            1 for ud in all_user_depts
            if ud == dept.name or ud.lower() in d_name_lower or d_name_lower in ud.lower()
        )
        out.member_count = matched_cnt
        items.append(out)

    return DepartmentListResponse(items=items, total=len(items))


@router.get("/{department_id}", response_model=DepartmentOut)
def get_department_detail(
    department_id: str,
    db: Session = Depends(get_db),
) -> Any:
    """
    Get detailed department information including assigned personnel.
    """
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phòng ban không tồn tại trong hệ thống.",
        )

    # Fetch users in this department with robust matching
    all_users = db.query(User).order_by(User.created_at.desc()).all()
    d_name_lower = dept.name.lower()
    users = [
        u for u in all_users
        if u.department and (
            u.department == dept.name
            or u.department.lower() in d_name_lower
            or d_name_lower in u.department.lower()
        )
    ]
    members = [
        DepartmentMemberOut(
            id=u.id,
            employee_id=u.employee_id,
            full_name=u.full_name,
            email=u.email,
            position=u.position or u.role,
            status=u.status,
            avatar_url=u.avatar_url,
        )
        for u in users
    ]

    out = DepartmentOut.from_orm(dept)
    out.member_count = len(members)
    out.members = members
    return out


@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
) -> Any:
    """
    Create a new department in the database.
    """
    # Check duplicate code
    if db.query(Department).filter(Department.code == payload.code.strip().upper()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã phòng ban '{payload.code}' đã tồn tại trong CSDL.",
        )

    # Check duplicate name
    if db.query(Department).filter(Department.name == payload.name.strip()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tên phòng ban '{payload.name}' đã tồn tại trong CSDL.",
        )

    dept = Department(
        code=payload.code.strip().upper(),
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        manager_name=payload.manager_name.strip() if payload.manager_name else None,
        contact_email=payload.contact_email.strip() if payload.contact_email else None,
        contact_phone=payload.contact_phone.strip() if payload.contact_phone else None,
        location=payload.location.strip() if payload.location else None,
        access_level=payload.access_level or "STANDARD",
        allowed_doors=payload.allowed_doors or [],
        color=payload.color or "#00D4AA",
        status=payload.status or "ACTIVE",
    )

    db.add(dept)
    audit = AuditLog(
        action="DEPARTMENT_CREATE",
        user_name="Admin Quản Trị",
        entity_type="department",
        entity_id=dept.id,
        details={"code": dept.code, "name": dept.name},
    )
    db.add(audit)
    db.commit()
    db.refresh(dept)

    out = DepartmentOut.from_orm(dept)
    out.member_count = 0
    return out


@router.put("/{department_id}", response_model=DepartmentOut)
def update_department(
    department_id: str,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
) -> Any:
    """
    Update an existing department and cascade name changes to employees.
    """
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phòng ban không tồn tại trong hệ thống.",
        )

    old_name = dept.name
    data = payload.dict(exclude_unset=True)

    if "code" in data and data["code"]:
        new_code = data["code"].strip().upper()
        existing = db.query(Department).filter(Department.code == new_code, Department.id != department_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã phòng ban '{new_code}' đã được sử dụng.",
            )
        dept.code = new_code

    if "name" in data and data["name"]:
        new_name = data["name"].strip()
        existing = db.query(Department).filter(Department.name == new_name, Department.id != department_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tên phòng ban '{new_name}' đã được sử dụng.",
            )
        dept.name = new_name

        # Cascade update to all users having this department name
        if new_name != old_name:
            db.query(User).filter(User.department == old_name).update(
                {User.department: new_name}, synchronize_session=False
            )

    for field in ["description", "manager_name", "contact_email", "contact_phone", "location", "access_level", "allowed_doors", "color", "status"]:
        if field in data and data[field] is not None:
            setattr(dept, field, data[field])

    audit = AuditLog(
        action="DEPARTMENT_UPDATE",
        user_name="Admin Quản Trị",
        entity_type="department",
        entity_id=dept.id,
        details={"code": dept.code, "name": dept.name, "updated_fields": list(data.keys())},
    )
    db.add(audit)
    db.commit()
    db.refresh(dept)

    # Compute member count
    count = db.query(User).filter(User.department == dept.name).count()
    out = DepartmentOut.from_orm(dept)
    out.member_count = count
    return out


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: str,
    force: bool = Query(False, description="Xóa cưỡng chế kể cả khi có nhân viên"),
    db: Session = Depends(get_db),
) -> None:
    """
    Delete a department from the database.
    """
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phòng ban không tồn tại trong hệ thống.",
        )

    user_count = db.query(User).filter(User.department == dept.name).count()
    if user_count > 0 and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phòng ban '{dept.name}' hiện đang có {user_count} nhân viên. Không thể xóa!",
        )

    # If force, set users' department to None
    if user_count > 0 and force:
        db.query(User).filter(User.department == dept.name).update(
            {User.department: None}, synchronize_session=False
        )

    audit = AuditLog(
        action="DEPARTMENT_DELETE",
        user_name="Admin Quản Trị",
        entity_type="department",
        entity_id=dept.id,
        details={"code": dept.code, "name": dept.name, "force": force},
    )
    db.add(audit)
    db.delete(dept)
    db.commit()
