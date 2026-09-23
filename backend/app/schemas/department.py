"""
Pydantic schemas for Department management.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class DepartmentBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=50, description="Mã định danh phòng ban")
    name: str = Field(..., min_length=2, max_length=100, description="Tên phòng ban")
    description: Optional[str] = Field(None, description="Mô tả chức năng nhiệm vụ")
    manager_name: Optional[str] = Field(None, max_length=100, description="Trưởng phòng ban")
    contact_email: Optional[str] = Field(None, max_length=100, description="Email liên hệ")
    contact_phone: Optional[str] = Field(None, max_length=50, description="Số điện thoại / Hotline")
    location: Optional[str] = Field(None, max_length=100, description="Vị trí văn phòng / Tầng")
    access_level: str = Field("STANDARD", description="Cấp độ an ninh: STANDARD | RESTRICTED | HIGH_SECURITY")
    allowed_doors: List[str] = Field(default_factory=list, description="Danh mục cửa được phép truy cập")
    color: str = Field("#00D4AA", description="Màu nhận diện badge hex")
    status: str = Field("ACTIVE", description="Trạng thái: ACTIVE | INACTIVE")


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    manager_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    location: Optional[str] = None
    access_level: Optional[str] = None
    allowed_doors: Optional[List[str]] = None
    color: Optional[str] = None
    status: Optional[str] = None


class DepartmentMemberOut(BaseModel):
    id: str
    employee_id: str
    full_name: str
    email: Optional[str] = None
    position: Optional[str] = None
    status: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class DepartmentOut(DepartmentBase):
    id: str
    member_count: int = 0
    members: Optional[List[DepartmentMemberOut]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DepartmentListResponse(BaseModel):
    items: List[DepartmentOut]
    total: int
