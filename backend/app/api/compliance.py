from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.api.dependencies import get_current_active_user, require_role
from app.models.models import Compliance, Employee, User
from app.schemas.schemas import ComplianceCreate, ComplianceUpdate, ComplianceResponse
from app.services.audit_service import log_action
from app.services.notification_service import (
    create_notification,
    create_notification_for_role   # ← added for HR notifications
)

router = APIRouter(prefix="/api/compliance", tags=["Compliance"])


def _notify_employee_compliance(
    db: Session,
    employee_id: int,
    pf_amount: float,
    esi_amount: float,
    is_new: bool = False
):
    """Notify the employee that their statutory deductions have been updated."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee or not employee.user_id:
        return

    action = "set up" if is_new else "updated"
    message = (
        f"Your statutory deductions have been {action}:\n"
        f"PF: ₹{pf_amount:,.2f}/month\n"
        f"ESI: ₹{esi_amount:,.2f}/month"
    )

    create_notification(
        db,
        employee.user_id,
        "📋 Compliance Details Updated",
        message
    )


@router.get("/employee/{employee_id}", response_model=ComplianceResponse)
def get_employee_compliance(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get compliance (statutory deduction) details for a specific employee.
    Employees can view their own; HR/Admin can view any.
    """
    # Authorization
    if current_user.role == "EMPLOYEE":
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not emp or emp.id != employee_id:
            raise HTTPException(status_code=403, detail="Access denied")

    compliance = db.query(Compliance).filter(Compliance.employee_id == employee_id).first()
    if not compliance:
        # Return a zero‑filled response (id and updated_at will be None)
        return ComplianceResponse(
            employee_id=employee_id,
            pf_amount=0.0,
            esi_amount=0.0,
            tax_details=None,
            effective_from=None
        )
    return compliance


@router.put("/employee/{employee_id}", response_model=ComplianceResponse)
def update_employee_compliance(
    employee_id: int,
    compliance_update: ComplianceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """
    Update or create compliance settings for an employee.
    Only HR/Admin can modify.
    """
    # Check if employee exists
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    compliance = db.query(Compliance).filter(Compliance.employee_id == employee_id).first()
    is_new = False

    if not compliance:
        # Create new record
        compliance = Compliance(
            employee_id=employee_id,
            pf_amount=compliance_update.pf_amount or 0.0,
            esi_amount=compliance_update.esi_amount or 0.0,
            tax_details=compliance_update.tax_details,
            effective_from=compliance_update.effective_from
        )
        db.add(compliance)
        action = "CREATE_COMPLIANCE"
        is_new = True
    else:
        # Update existing record
        if compliance_update.pf_amount is not None:
            compliance.pf_amount = compliance_update.pf_amount
        if compliance_update.esi_amount is not None:
            compliance.esi_amount = compliance_update.esi_amount
        if compliance_update.tax_details is not None:
            compliance.tax_details = compliance_update.tax_details
        if compliance_update.effective_from is not None:
            compliance.effective_from = compliance_update.effective_from
        action = "UPDATE_COMPLIANCE"

    db.commit()
    db.refresh(compliance)

    # Log the action
    log_action(
        db,
        current_user.id,
        action,
        "compliance",
        compliance.id,
        f"Compliance updated for employee {employee_id}"
    )

    # Send notification to the employee
    _notify_employee_compliance(
        db,
        employee_id,
        compliance.pf_amount,
        compliance.esi_amount,
        is_new
    )

    # Send notification to HR
    action_str = "created" if is_new else "updated"
    create_notification_for_role(
        db,
        'HR',
        "📋 Compliance Updated",
        f"Compliance for {employee.full_name} has been {action_str}. "
        f"PF: ₹{compliance.pf_amount:,.2f}, ESI: ₹{compliance.esi_amount:,.2f}"
    )

    return compliance


@router.get("/", response_model=list[ComplianceResponse])
def get_all_compliance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """
    List compliance records for all employees (HR/Admin only).
    """
    return db.query(Compliance).all()