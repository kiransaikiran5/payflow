from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.api.dependencies import require_role, get_current_active_user
from app.models.models import Overtime, Employee, User
from app.schemas.schemas import OvertimeCreate, OvertimeResponse
from app.services.notification_service import create_notification

router = APIRouter(prefix="/api/overtime", tags=["Overtime"])


@router.post("/", response_model=OvertimeResponse, status_code=201)
def create_overtime(
    data: OvertimeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    # Validate employee
    employee = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Calculate total amount
    total = data.hours_worked * data.overtime_rate

    # Create record
    overtime = Overtime(
        employee_id=data.employee_id,
        hours_worked=data.hours_worked,
        overtime_rate=data.overtime_rate,
        total_amount=total,
        month=data.month
    )
    db.add(overtime)
    db.commit()
    db.refresh(overtime)

    # Notify the employee
    if employee.user_id:
        create_notification(
            db,
            user_id=employee.user_id,
            title="⏱ Overtime Recorded",
            message=f"{data.hours_worked} hours of overtime for {data.month} added. Amount: ₹{total:,.2f}"
        )

    return overtime


@router.get("/", response_model=list[OvertimeResponse])
def list_overtime(
    employee_id: Optional[int] = None,
    month: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Overtime)

    # Restrict for employees
    if current_user.role == "EMPLOYEE":
        employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee profile not found")
        query = query.filter(Overtime.employee_id == employee.id)
    elif employee_id:
        query = query.filter(Overtime.employee_id == employee_id)

    if month:
        query = query.filter(Overtime.month == month)

    return query.order_by(Overtime.month.desc(), Overtime.id.desc()).all()