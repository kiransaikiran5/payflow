from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import get_current_active_user, require_role
from app.models.models import SalaryHistory, Employee, User
from app.schemas.schemas import SalaryHistoryCreate, SalaryHistoryResponse
from app.services.audit_service import log_action
from app.services.notification_service import create_notification

router = APIRouter(prefix="/api/salary-history", tags=["Salary History"])


@router.post("/", response_model=SalaryHistoryResponse)
def record_salary_change(
    history: SalaryHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    # Fetch the employee and validate
    employee = db.query(Employee).filter(Employee.id == history.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    old_salary = employee.base_salary

    # Automatically update the employee's current base salary
    employee.base_salary = history.new_salary

    # Create salary history record
    db_hist = SalaryHistory(
        employee_id=history.employee_id,
        old_salary=old_salary,
        new_salary=history.new_salary,
        effective_date=history.effective_date,
        updated_by=current_user.id
    )
    db.add(db_hist)
    db.commit()
    db.refresh(db_hist)

    # Log the action
    log_action(
        db,
        current_user.id,
        "SALARY_REVISION",
        "employees",
        history.employee_id,
        f"Salary changed from {old_salary} to {history.new_salary}"
    )

    # Send notification to the employee
    if employee.user_id:
        effective_date_str = history.effective_date.strftime("%d %b %Y") if history.effective_date else "today"
        create_notification(
            db,
            employee.user_id,
            "💰 Salary Revised",
            f"Your base salary has been updated from ₹{old_salary:,.2f} to ₹{history.new_salary:,.2f} effective {effective_date_str}."
        )

    return db_hist


@router.get("/employee/{employee_id}", response_model=list[SalaryHistoryResponse])
def get_salary_history(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Employees can view their own history; HR/Admin can view any
    if current_user.role == "EMPLOYEE":
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not emp or emp.id != employee_id:
            raise HTTPException(status_code=403, detail="Access denied")

    return (
        db.query(SalaryHistory)
        .filter(SalaryHistory.employee_id == employee_id)
        .order_by(SalaryHistory.effective_date.desc())
        .all()
    )