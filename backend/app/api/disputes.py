from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.api.dependencies import require_role, get_current_active_user
from app.models.models import PayrollDispute, Employee, User, Payroll          # ← changed
from app.schemas.schemas import DisputeCreate, DisputeUpdate, DisputeResponse   # schemas unchanged
from app.services.notification_service import (
    create_notification,
    create_notification_for_role
)

router = APIRouter(prefix="/api/disputes", tags=["Disputes"])


@router.post("/", response_model=DisputeResponse, status_code=201)
def raise_dispute(
    data: DisputeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify employee
    employee = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Verify payroll
    payroll = db.query(Payroll).filter(
        Payroll.id == data.payroll_id,
        Payroll.employee_id == data.employee_id
    ).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found or mismatch")

    # Create dispute – no resolution field
    dispute = PayrollDispute(                     # ← changed
        employee_id=data.employee_id,
        payroll_id=data.payroll_id,
        issue_title=data.issue_title,
        description=data.description,
        status="OPEN"
    )
    db.add(dispute)
    db.commit()
    db.refresh(dispute)

    # Notify all HR users
    create_notification_for_role(
        db,
        role="HR",
        title="❗ New Payroll Dispute",
        message=f"Dispute: {data.issue_title} – by {employee.full_name}"
    )

    return dispute


@router.put("/{dispute_id}", response_model=DisputeResponse)
def update_dispute(
    dispute_id: int,
    update: DisputeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    dispute = db.query(PayrollDispute).filter(PayrollDispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    # Update only those fields that are present in DisputeUpdate and valid
    if update.status:
        dispute.status = update.status
        # If status is resolved or closed, optionally set resolved_at
        from datetime import datetime
        if update.status.upper() in ("RESOLVED", "CLOSED"):
            dispute.resolved_at = datetime.utcnow()

    # Note: update.resolution is ignored because model has no such column

    db.commit()
    db.refresh(dispute)

    # Notify the employee who raised the dispute
    employee = db.query(Employee).filter(Employee.id == dispute.employee_id).first()
    if employee and employee.user_id:
        create_notification(
            db,
            user_id=employee.user_id,
            title=f"📢 Dispute {dispute.status}",
            message=f"Your dispute '{dispute.issue_title}' has been {dispute.status.lower()}."
        )

    return dispute


@router.get("/", response_model=list[DisputeResponse])
def list_disputes(
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(PayrollDispute)          # ← changed

    if current_user.role == "EMPLOYEE":
        employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee profile not found")
        query = query.filter(PayrollDispute.employee_id == employee.id)
    elif employee_id:
        query = query.filter(PayrollDispute.employee_id == employee_id)

    return query.order_by(PayrollDispute.created_at.desc()).all()