from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.dependencies import get_current_active_user, require_role
from app.models.models import PayrollApproval, Payroll, User, Employee
from app.schemas.schemas import PayrollApprovalCreate, PayrollApprovalResponse
from app.services.audit_service import log_action
from app.services.notification_service import create_notification

router = APIRouter(prefix="/api/approvals", tags=["Payroll Approvals"])


def _notify_employee_about_payroll_status(
    db: Session,
    payroll_id: int,
    status: str,
    remarks: str = ""
):
    """Send notification to the employee about payroll approval/rejection."""
    payroll = db.query(Payroll).filter(Payroll.id == payroll_id).first()
    if not payroll:
        return

    employee = db.query(Employee).filter(Employee.id == payroll.employee_id).first()
    if not employee or not employee.user_id:
        return

    # Payroll month is stored as a string "YYYY-MM", format it nicely
    try:
        month_date = datetime.strptime(payroll.month, "%Y-%m")
        month_display = month_date.strftime("%B %Y")
    except (ValueError, TypeError):
        month_display = payroll.month

    if status == "APPROVED":
        title = "✅ Payroll Approved"
        message = f"Your payroll for {month_display} has been approved."
    elif status == "REJECTED":
        title = "❌ Payroll Rejected"
        message = f"Your payroll for {month_display} was rejected."
        if remarks:
            message += f" Remarks: {remarks}"

    create_notification(db, employee.user_id, title, message)


@router.post("/", response_model=PayrollApprovalResponse)
def create_approval_request(
    approval: PayrollApprovalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    # Check payroll existence
    payroll = db.query(Payroll).filter(Payroll.id == approval.payroll_id).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")

    # Only one approval request per payroll
    existing = db.query(PayrollApproval).filter(
        PayrollApproval.payroll_id == approval.payroll_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Approval already exists for this payroll")

    db_approval = PayrollApproval(**approval.dict(), approved_by=None)
    db.add(db_approval)
    db.commit()
    db.refresh(db_approval)

    log_action(
        db,
        current_user.id,
        "CREATE_APPROVAL",
        "payroll_approvals",
        db_approval.id,
        f"Approval requested for payroll {payroll.id}"
    )
    return db_approval


@router.put("/{approval_id}/approve", response_model=PayrollApprovalResponse)
def approve_payroll(
    approval_id: int,
    remarks: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    approval = db.query(PayrollApproval).filter(PayrollApproval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != "PENDING":
        raise HTTPException(status_code=400, detail="Approval has already been processed")

    # Update approval
    approval.status = "APPROVED"
    approval.approved_by = current_user.id
    approval.remarks = remarks
    db.commit()
    db.refresh(approval)

    # Log action
    log_action(
        db,
        current_user.id,
        "APPROVE_PAYROLL",
        "payroll_approvals",
        approval.id,
        f"Approved payroll {approval.payroll_id}"
    )

    # Send notification to employee
    _notify_employee_about_payroll_status(db, approval.payroll_id, "APPROVED")

    return approval


@router.put("/{approval_id}/reject", response_model=PayrollApprovalResponse)
def reject_payroll(
    approval_id: int,
    remarks: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    approval = db.query(PayrollApproval).filter(PayrollApproval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != "PENDING":
        raise HTTPException(status_code=400, detail="Approval has already been processed")

    approval.status = "REJECTED"
    approval.approved_by = current_user.id
    approval.remarks = remarks
    db.commit()
    db.refresh(approval)

    log_action(
        db,
        current_user.id,
        "REJECT_PAYROLL",
        "payroll_approvals",
        approval.id,
        f"Rejected payroll {approval.payroll_id}"
    )

    # Send notification to employee
    _notify_employee_about_payroll_status(db, approval.payroll_id, "REJECTED", remarks)

    return approval


@router.get("/", response_model=list[PayrollApprovalResponse])
def get_approvals(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(PayrollApproval)
    if status:
        query = query.filter(PayrollApproval.status == status)
    return query.all()