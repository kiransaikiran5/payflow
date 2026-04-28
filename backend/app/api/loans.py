from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import require_role, get_current_active_user
from app.models.models import Loan, Employee, User
from app.schemas.schemas import LoanCreate, LoanResponse
from app.services.audit_service import log_action
from app.services.notification_service import (
    create_notification,
    create_notification_for_role          # ← added for HR notifications
)

router = APIRouter(prefix="/api/loans", tags=["Loans"])


@router.post("/", response_model=LoanResponse)
def apply_loan(
    loan: LoanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    # Check employee exists
    employee = db.query(Employee).filter(Employee.id == loan.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Create loan
    db_loan = Loan(
        employee_id=loan.employee_id,
        loan_amount=loan.loan_amount,
        remaining_amount=loan.loan_amount,
        installment_amount=loan.installment_amount,
        status="ACTIVE"
    )
    db.add(db_loan)
    db.commit()
    db.refresh(db_loan)

    # Audit log
    log_action(
        db,
        current_user.id,
        "LOAN_CREATED",
        "loans",
        db_loan.id,
        f"Loan of {loan.loan_amount} for employee {loan.employee_id}"
    )

    # Notify employee
    if employee.user_id:
        create_notification(
            db,
            employee.user_id,
            "🏦 Loan Issued",
            f"A loan of ₹{db_loan.loan_amount:,.2f} has been issued to you. "
            f"Monthly instalment: ₹{db_loan.installment_amount:,.2f}."
        )

    # Notify HR
    create_notification_for_role(
        db,
        'HR',
        "🏦 Loan Issued",
        f"Loan of ₹{loan.loan_amount:,.2f} issued to {employee.full_name}. "
        f"Monthly instalment: ₹{loan.installment_amount:,.2f}."
    )

    return db_loan


@router.get("/", response_model=list[LoanResponse])
def get_loans(
    employee_id: int = Query(None),
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Loan)

    # Restrict access for EMPLOYEE role to their own loans
    if current_user.role == "EMPLOYEE":
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not emp:
            raise HTTPException(status_code=404, detail="Employee profile not found")
        query = query.filter(Loan.employee_id == emp.id)
    elif employee_id:
        query = query.filter(Loan.employee_id == employee_id)

    if status:
        query = query.filter(Loan.status == status)

    return query.all()


@router.patch("/{loan_id}/repay")
def repay_installment(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Loan is not active")

    # Deduct installment
    loan.remaining_amount -= loan.installment_amount
    if loan.remaining_amount <= 0:
        loan.remaining_amount = 0
        loan.status = "PAID"
    db.commit()

    # Audit log
    log_action(
        db,
        current_user.id,
        "LOAN_REPAYMENT",
        "loans",
        loan.id,
        f"Repaid installment, remaining: {loan.remaining_amount}"
    )

    # Notify employee
    employee = db.query(Employee).filter(Employee.id == loan.employee_id).first()
    if employee and employee.user_id:
        create_notification(
            db,
            employee.user_id,
            "💳 Loan Repayment",
            f"An instalment of ₹{loan.installment_amount:,.2f} was repaid. "
            f"Remaining balance: ₹{loan.remaining_amount:,.2f}."
        )

        # Notify HR
        create_notification_for_role(
            db,
            'HR',
            "💳 Loan Repayment",
            f"Loan repayment for {employee.full_name}: ₹{loan.installment_amount:,.2f}. "
            f"Remaining balance: ₹{loan.remaining_amount:,.2f}."
        )

    return {
        "message": "Instalment repaid",
        "remaining_amount": float(loan.remaining_amount),
        "status": loan.status
    }