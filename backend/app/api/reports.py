from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from decimal import Decimal
from typing import List, Optional

from app.core.database import get_db
from app.api.dependencies import require_role, get_current_active_user
from app.models.models import Payroll, Employee, User
from app.schemas.schemas import PayrollSummary, DepartmentPayroll

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/monthly-summary", response_model=List[PayrollSummary])
def get_monthly_summary(
    month: Optional[date] = Query(None, description="Filter by specific month (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """
    Get monthly payroll summary with total earnings, deductions, and net payout.
    """
    query = db.query(
        Payroll.month,
        func.sum(Payroll.total_earnings).label("total_earnings"),
        func.sum(Payroll.total_deductions).label("total_deductions"),
        func.sum(Payroll.net_salary).label("net_payout"),
        func.count(Payroll.id).label("employee_count")
    ).group_by(Payroll.month)
    
    if month:
        query = query.filter(Payroll.month == month)
    
    results = query.order_by(Payroll.month.desc()).all()
    
    return [
        PayrollSummary(
            month=r.month,
            total_earnings=Decimal(str(r.total_earnings or 0)),
            total_deductions=Decimal(str(r.total_deductions or 0)),
            net_payout=Decimal(str(r.net_payout or 0)),
            employee_count=r.employee_count
        )
        for r in results
    ]


@router.get("/department-summary", response_model=List[DepartmentPayroll])
def get_department_summary(
    month: Optional[date] = Query(None, description="Filter by specific month (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """
    Get payroll summary grouped by department.
    """
    query = db.query(
        Employee.department,
        func.sum(Payroll.net_salary).label("total_salary"),
        func.count(func.distinct(Employee.id)).label("employee_count")
    ).join(Payroll, Employee.id == Payroll.employee_id)
    
    if month:
        query = query.filter(Payroll.month == month)
    
    results = query.group_by(Employee.department).order_by(Employee.department).all()
    
    return [
        DepartmentPayroll(
            department=r.department or "Unassigned",
            total_salary=Decimal(str(r.total_salary or 0)),
            employee_count=r.employee_count
        )
        for r in results
    ]


@router.get("/employee-summary/{employee_id}")
def get_employee_summary(
    employee_id: int,
    year: Optional[int] = Query(None, description="Filter by year (e.g., 2026)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get payroll summary for a specific employee.
    Employees can only view their own summary. HR/Admin can view any employee.
    """
    # Check if employee exists
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Permission check: Employee can only view own data
    if current_user.role == "EMPLOYEE":
        user_employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not user_employee or user_employee.id != employee_id:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Access denied")
    
    query = db.query(
        Payroll.month,
        Payroll.total_earnings,
        Payroll.total_deductions,
        Payroll.net_salary,
        Payroll.status
    ).filter(Payroll.employee_id == employee_id)
    
    if year:
        query = query.filter(func.extract('year', Payroll.month) == year)
    
    results = query.order_by(Payroll.month.desc()).all()
    
    # Calculate yearly totals
    yearly_earnings = sum(r.total_earnings for r in results)
    yearly_deductions = sum(r.total_deductions for r in results)
    yearly_net = sum(r.net_salary for r in results)
    
    return {
        "employee_id": employee_id,
        "employee_name": employee.full_name,
        "department": employee.department,
        "designation": employee.designation,
        "base_salary": float(employee.base_salary),
        "year": year,
        "yearly_totals": {
            "total_earnings": float(yearly_earnings),
            "total_deductions": float(yearly_deductions),
            "net_salary": float(yearly_net)
        },
        "monthly_breakdown": [
            {
                "month": r.month.isoformat(),
                "total_earnings": float(r.total_earnings),
                "total_deductions": float(r.total_deductions),
                "net_salary": float(r.net_salary),
                "status": r.status
            }
            for r in results
        ]
    }


@router.get("/yearly-comparison")
def get_yearly_comparison(
    year1: int = Query(..., description="First year to compare"),
    year2: int = Query(..., description="Second year to compare"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """
    Compare payroll data between two years.
    """
    def get_year_data(year: int):
        result = db.query(
            func.sum(Payroll.total_earnings).label("earnings"),
            func.sum(Payroll.total_deductions).label("deductions"),
            func.sum(Payroll.net_salary).label("net"),
            func.count(func.distinct(Payroll.employee_id)).label("employees")
        ).filter(func.extract('year', Payroll.month) == year).first()
        
        return {
            "year": year,
            "total_earnings": float(result.earnings or 0),
            "total_deductions": float(result.deductions or 0),
            "net_payout": float(result.net or 0),
            "employee_count": result.employees or 0
        }
    
    return {
        "year1": get_year_data(year1),
        "year2": get_year_data(year2)
    }


@router.get("/dashboard-stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """
    Get quick stats for the HR dashboard.
    """
    # Total employees
    total_employees = db.query(func.count(Employee.id)).scalar()
    
    # Current month payroll
    current_month = date.today().replace(day=1)
    month_payroll = db.query(
        func.sum(Payroll.net_salary).label("total"),
        func.count(Payroll.id).label("count")
    ).filter(Payroll.month == current_month).first()
    
    # Pending payslips (payroll generated but not paid)
    pending_count = db.query(func.count(Payroll.id)).filter(
        Payroll.status == "GENERATED"
    ).scalar()
    
    # Department count
    dept_count = db.query(func.count(func.distinct(Employee.department))).scalar()
    
    # Recent payrolls
    recent_payrolls = db.query(
        Payroll.month,
        func.sum(Payroll.net_salary).label("total")
    ).group_by(Payroll.month).order_by(Payroll.month.desc()).limit(6).all()
    
    return {
        "total_employees": total_employees,
        "current_month_payroll": float(month_payroll.total or 0),
        "employees_processed": month_payroll.count or 0,
        "pending_payslips": pending_count or 0,
        "total_departments": dept_count or 0,
        "recent_months": [
            {
                "month": r.month.isoformat(),
                "total": float(r.total or 0)
            }
            for r in recent_payrolls
        ]
    }