from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import List, Optional
import calendar

from app.core.database import get_db
from app.api.dependencies import require_role, get_current_active_user, get_current_employee
from app.models.models import Attendance, AttendanceSummary, Employee, User
from app.schemas.schemas import (
    AttendanceCreate, AttendanceUpdate, AttendanceResponse,
    AttendanceSummaryResponse, AttendanceBulkCreate
)
from app.services.attendance_service import (
    calculate_salary_adjustment, generate_monthly_summary
)

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.get("/employee/{employee_id}", response_model=List[AttendanceResponse])
def get_employee_attendance(
    employee_id: int,
    month: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get attendance records for an employee."""
    # Authorization
    if current_user.role == "EMPLOYEE":
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not emp or emp.id != employee_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    query = db.query(Attendance).filter(Attendance.employee_id == employee_id)
    if month:
        start_date = month.replace(day=1)
        end_date = month.replace(day=calendar.monthrange(month.year, month.month)[1])
        query = query.filter(Attendance.date >= start_date, Attendance.date <= end_date)
    
    return query.order_by(Attendance.date.desc()).all()


@router.post("/", response_model=AttendanceResponse)
def mark_attendance(
    attendance: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """Mark attendance for an employee."""
    # Check if already marked for this date
    existing = db.query(Attendance).filter(
        Attendance.employee_id == attendance.employee_id,
        Attendance.date == attendance.date
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Attendance already marked for this date")
    
    db_attendance = Attendance(**attendance.dict())
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance


@router.post("/bulk", response_model=dict)
def bulk_mark_attendance(
    data: AttendanceBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """Bulk mark attendance for a month."""
    year = data.month.year
    month = data.month.month
    days_in_month = calendar.monthrange(year, month)[1]
    
    created = 0
    for day in range(1, days_in_month + 1):
        current_date = date(year, month, day)
        
        # Check if already exists
        existing = db.query(Attendance).filter(
            Attendance.employee_id == data.employee_id,
            Attendance.date == current_date
        ).first()
        
        if existing:
            continue
        
        # Determine status
        if day in data.holidays:
            status = "HOLIDAY"
        elif day in data.working_days:
            status = data.default_status
        else:
            # Weekend (Saturday=5, Sunday=6)
            weekday = current_date.weekday()
            status = "HOLIDAY" if weekday >= 5 else data.default_status
        
        attendance = Attendance(
            employee_id=data.employee_id,
            date=current_date,
            status=status,
            overtime_hours=0
        )
        db.add(attendance)
        created += 1
    
    db.commit()
    return {"message": f"Created {created} attendance records"}


@router.put("/{attendance_id}", response_model=AttendanceResponse)
def update_attendance(
    attendance_id: int,
    attendance_update: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """Update an attendance record."""
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance not found")
    
    for key, value in attendance_update.dict(exclude_unset=True).items():
        setattr(attendance, key, value)
    
    db.commit()
    db.refresh(attendance)
    return attendance


@router.get("/summary/{employee_id}", response_model=AttendanceSummaryResponse)
def get_attendance_summary(
    employee_id: int,
    month: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get monthly attendance summary for an employee."""
    # Authorization
    if current_user.role == "EMPLOYEE":
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not emp or emp.id != employee_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    summary = db.query(AttendanceSummary).filter(
        AttendanceSummary.employee_id == employee_id,
        AttendanceSummary.month == month
    ).first()
    
    if not summary:
        # Generate on the fly
        summary = generate_monthly_summary(employee_id, month, db)
    
    return summary


@router.get("/adjustment/{employee_id}")
def get_salary_adjustment(
    employee_id: int,
    month: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """Calculate salary adjustment based on attendance."""
    adjustment = calculate_salary_adjustment(employee_id, month, db)
    
    summary = db.query(AttendanceSummary).filter(
        AttendanceSummary.employee_id == employee_id,
        AttendanceSummary.month == month
    ).first()
    
    return {
        "employee_id": employee_id,
        "month": month,
        "adjustment_amount": float(adjustment),
        "absent_days": summary.absent_days if summary else 0,
        "half_days": summary.half_days if summary else 0,
        "overtime_hours": float(summary.total_overtime_hours) if summary else 0
    }


@router.get("/my-attendance", response_model=List[AttendanceResponse])
def get_my_attendance(
    month: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    current_employee: Employee = Depends(get_current_employee)
):
    """Employee gets their own attendance."""
    if not current_employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    query = db.query(Attendance).filter(Attendance.employee_id == current_employee.id)
    if month:
        start_date = month.replace(day=1)
        end_date = month.replace(day=calendar.monthrange(month.year, month.month)[1])
        query = query.filter(Attendance.date >= start_date, Attendance.date <= end_date)
    
    return query.order_by(Attendance.date.desc()).all()