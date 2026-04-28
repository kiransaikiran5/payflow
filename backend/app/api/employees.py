from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.api.dependencies import get_current_active_user, require_role
from app.models.models import User, Employee
from app.schemas.schemas import EmployeeCreate, EmployeeUpdate, EmployeeResponse

router = APIRouter(prefix="/api/employees", tags=["Employees"])

# ==================== IMPORTANT: Static routes first ====================
@router.get("/me", response_model=EmployeeResponse)
def read_my_employee_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Return the Employee record linked to the currently authenticated user."""
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    return employee

# ==================== Then dynamic routes ====================
@router.post("/", response_model=EmployeeResponse)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """Create a new employee (HR only)."""
    db_employee = Employee(**employee.dict())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

@router.get("/", response_model=List[EmployeeResponse])
def read_employees(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all employees (HR/ADMIN) or only the current user's own profile."""
    if current_user.role in ["HR", "ADMIN"]:
        return db.query(Employee).offset(skip).limit(limit).all()
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    return [employee] if employee else []

@router.get("/{employee_id}", response_model=EmployeeResponse)
def read_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a single employee by ID."""
    if current_user.role == "EMPLOYEE":
        employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not employee or employee.id != employee_id:
            raise HTTPException(status_code=403, detail="Access denied")
        return employee
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    employee_update: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """Update an employee (HR only)."""
    db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    for key, value in employee_update.dict(exclude_unset=True).items():
        setattr(db_employee, key, value)
    db.commit()
    db.refresh(db_employee)
    return db_employee

@router.delete("/{employee_id}", status_code=204)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """Delete an employee (HR only)."""
    db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(db_employee)
    db.commit()
    return None