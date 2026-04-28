from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from decimal import Decimal
from typing import List, Optional

from app.core.database import get_db
from app.api.dependencies import require_role, get_current_active_user
from app.models.models import Payroll, Employee, User
from app.schemas.schemas import PayrollCreate, PayrollResponse, PayrollSummary, DepartmentPayroll
from app.services.payroll_service import generate_payroll_for_employee
from app.services.notification_service import (
    create_notification,
    create_notification_for_role   # <-- added
)
from sqlalchemy import func

router = APIRouter(prefix="/api/payroll", tags=["Payroll"])


@router.get("/", response_model=List[PayrollResponse])
def get_payrolls(
    month: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get payroll records.
    - HR/ADMIN: see all payrolls (optionally filtered by month)
    - EMPLOYEE: see only their own payrolls (requires employee profile)
    """
    query = db.query(Payroll)

    if current_user.role == "EMPLOYEE":
        employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee profile not found")
        query = query.filter(Payroll.employee_id == employee.id)

    if month:
        query = query.filter(Payroll.month == month)

    return query.all()


@router.post("/", response_model=PayrollResponse)
def generate_payroll(
    payroll_data: PayrollCreate,
    attendance_adjustment: Decimal = Query(0.00, description="Attendance adjustment amount (positive = deduction)"),
    db: Session = Depends(get_db),
    _=Depends(require_role("HR"))
):
    try:
        payroll = generate_payroll_for_employee(
            payroll_data.employee_id,
            payroll_data.month,
            db,
            attendance_adjustment
        )

        # Look up the employee for notification purposes
        employee = db.query(Employee).filter(Employee.id == payroll.employee_id).first()

        # 1. Notify the employee their payslip is ready
        if employee and employee.user_id:
            create_notification(
                db,
                user_id=employee.user_id,
                title="📄 Payslip Generated",
                message=f"Your payslip for {payroll.month.strftime('%B %Y')} is ready. "
                        f"Net salary: ₹{payroll.net_salary:,.2f}"
            )

        # 2. Notify HR that a new payroll was generated
        if employee:
            create_notification_for_role(
                db,
                'HR',
                "📊 Payroll Generated",
                f"Payroll for {employee.full_name} ({payroll.month}) has been generated. "
                f"Net: ₹{payroll.net_salary:,.2f}"
            )

        return payroll
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{payroll_id}/paid")
def mark_as_paid(
    payroll_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("HR"))
):
    payroll = db.query(Payroll).filter(Payroll.id == payroll_id).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")

    payroll.status = "PAID"
    db.commit()

    # Notify employee
    employee = db.query(Employee).filter(Employee.id == payroll.employee_id).first()
    if employee and employee.user_id:
        create_notification(
            db,
            user_id=employee.user_id,
            title="💰 Salary Credited",
            message=f"Your salary for {payroll.month.strftime('%B %Y')} has been credited to your account."
        )

        # Optionally, also notify HR that a salary has been marked as paid
        create_notification_for_role(
            db,
            'HR',
            "💵 Salary Paid",
            f"Salary for {employee.full_name} ({payroll.month.strftime('%B %Y')}) has been marked as paid."
        )

    return {"message": "Marked as paid"}


@router.get("/summary", response_model=List[PayrollSummary])
def payroll_summary(
    month: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_role("HR"))
):
    query = db.query(
        Payroll.month,
        func.sum(Payroll.total_earnings).label("total_earnings"),
        func.sum(Payroll.total_deductions).label("total_deductions"),
        func.sum(Payroll.net_salary).label("net_payout"),
        func.count(Payroll.id).label("employee_count")
    ).group_by(Payroll.month)

    if month:
        query = query.filter(Payroll.month == month)

    results = query.all()
    return [
        PayrollSummary(
            month=r.month,
            total_earnings=r.total_earnings or 0,
            total_deductions=r.total_deductions or 0,
            net_payout=r.net_payout or 0,
            employee_count=r.employee_count or 0
        ) for r in results
    ]


@router.get("/by-department", response_model=List[DepartmentPayroll])
def payroll_by_department(
    month: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_role("HR"))
):
    # Try payroll-based data first
    query = db.query(
        Employee.department,
        func.sum(Payroll.net_salary).label("total_salary"),
        func.count(Payroll.id).label("employee_count")
    ).join(Payroll, Employee.id == Payroll.employee_id)

    if month:
        query = query.filter(Payroll.month == month)

    results = query.group_by(Employee.department).all()

    # Fallback to base salaries if no payroll data
    if not results:
        fallback = db.query(
            Employee.department,
            func.sum(Employee.base_salary).label("total_salary"),
            func.count(Employee.id).label("employee_count")
        ).group_by(Employee.department).all()
        results = fallback

    return [
        DepartmentPayroll(
            department=r.department or "Unassigned",
            total_salary=r.total_salary or 0,
            employee_count=r.employee_count or 0
        ) for r in results
    ]