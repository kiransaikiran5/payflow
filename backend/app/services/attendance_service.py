from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.models import Attendance, AttendanceSummary, Employee
import calendar

def calculate_salary_adjustment(
    employee_id: int,
    month: date,
    db: Session
) -> Decimal:
    """
    Calculate salary adjustment based on attendance.
    Returns positive value for deduction, negative for bonus (overtime).
    """
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        return Decimal("0.00")
    
    # Get attendance summary
    summary = db.query(AttendanceSummary).filter(
        AttendanceSummary.employee_id == employee_id,
        AttendanceSummary.month == month
    ).first()
    
    if not summary:
        # Calculate from attendance records
        return calculate_from_attendance_records(employee_id, month, db)
    
    # Per day salary
    days_in_month = calendar.monthrange(month.year, month.month)[1]
    per_day_salary = employee.base_salary / Decimal(days_in_month)
    
    # Deduction for absences
    absence_deduction = Decimal(summary.absent_days) * per_day_salary
    half_day_deduction = Decimal(summary.half_days) * (per_day_salary / Decimal("2"))
    
    # Overtime bonus (assume 1.5x hourly rate for overtime)
    hourly_rate = per_day_salary / Decimal("8")  # 8 hours per day
    overtime_bonus = Decimal(summary.total_overtime_hours) * hourly_rate * Decimal("1.5")
    
    # Net adjustment (positive = deduction, negative = bonus)
    net_adjustment = absence_deduction + half_day_deduction - overtime_bonus
    
    return net_adjustment


def calculate_from_attendance_records(
    employee_id: int,
    month: date,
    db: Session
) -> Decimal:
    """Calculate adjustment directly from attendance records."""
    start_date = month.replace(day=1)
    end_date = month.replace(day=calendar.monthrange(month.year, month.month)[1])
    
    records = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.date >= start_date,
        Attendance.date <= end_date
    ).all()
    
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    days_in_month = calendar.monthrange(month.year, month.month)[1]
    per_day_salary = employee.base_salary / Decimal(days_in_month)
    hourly_rate = per_day_salary / Decimal("8")
    
    total_deduction = Decimal("0.00")
    total_overtime_bonus = Decimal("0.00")
    
    for record in records:
        if record.status == "ABSENT":
            total_deduction += per_day_salary
        elif record.status == "HALF_DAY":
            total_deduction += (per_day_salary / Decimal("2"))
        
        if record.overtime_hours > 0:
            total_overtime_bonus += Decimal(record.overtime_hours) * hourly_rate * Decimal("1.5")
    
    return total_deduction - total_overtime_bonus


def generate_monthly_summary(
    employee_id: int,
    month: date,
    db: Session
) -> AttendanceSummary:
    """Generate or update monthly attendance summary."""
    start_date = month.replace(day=1)
    end_date = month.replace(day=calendar.monthrange(month.year, month.month)[1])
    
    records = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.date >= start_date,
        Attendance.date <= end_date
    ).all()
    
    summary_data = {
        "total_days": 0,
        "present_days": 0,
        "absent_days": 0,
        "half_days": 0,
        "leave_days": 0,
        "holiday_days": 0,
        "total_overtime_hours": Decimal("0.00")
    }
    
    for record in records:
        summary_data["total_days"] += 1
        if record.status == "PRESENT":
            summary_data["present_days"] += 1
        elif record.status == "ABSENT":
            summary_data["absent_days"] += 1
        elif record.status == "HALF_DAY":
            summary_data["half_days"] += 1
        elif record.status == "LEAVE":
            summary_data["leave_days"] += 1
        elif record.status == "HOLIDAY":
            summary_data["holiday_days"] += 1
        
        summary_data["total_overtime_hours"] += record.overtime_hours or Decimal("0.00")
    
    # Calculate salary adjustment
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    days_in_month = calendar.monthrange(month.year, month.month)[1]
    per_day_salary = employee.base_salary / Decimal(days_in_month)
    hourly_rate = per_day_salary / Decimal("8")
    
    absence_deduction = Decimal(summary_data["absent_days"]) * per_day_salary
    half_day_deduction = Decimal(summary_data["half_days"]) * (per_day_salary / Decimal("2"))
    overtime_bonus = summary_data["total_overtime_hours"] * hourly_rate * Decimal("1.5")
    
    salary_adjustment = absence_deduction + half_day_deduction - overtime_bonus
    
    # Check if summary exists
    existing = db.query(AttendanceSummary).filter(
        AttendanceSummary.employee_id == employee_id,
        AttendanceSummary.month == month
    ).first()
    
    if existing:
        existing.total_days = summary_data["total_days"]
        existing.present_days = summary_data["present_days"]
        existing.absent_days = summary_data["absent_days"]
        existing.half_days = summary_data["half_days"]
        existing.leave_days = summary_data["leave_days"]
        existing.holiday_days = summary_data["holiday_days"]
        existing.total_overtime_hours = summary_data["total_overtime_hours"]
        existing.salary_adjustment = salary_adjustment
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_summary = AttendanceSummary(
            employee_id=employee_id,
            month=month,
            total_days=summary_data["total_days"],
            present_days=summary_data["present_days"],
            absent_days=summary_data["absent_days"],
            half_days=summary_data["half_days"],
            leave_days=summary_data["leave_days"],
            holiday_days=summary_data["holiday_days"],
            total_overtime_hours=summary_data["total_overtime_hours"],
            salary_adjustment=salary_adjustment
        )
        db.add(new_summary)
        db.commit()
        db.refresh(new_summary)
        return new_summary