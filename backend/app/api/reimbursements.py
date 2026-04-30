from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.dependencies import require_role, get_current_active_user
from app.models.models import Reimbursement, Employee, User
from app.schemas.schemas import ReimbursementResponse
from app.services.notification_service import create_notification

router = APIRouter(prefix="/api/reimbursements", tags=["Reimbursements"])

UPLOAD_DIR = "uploads/reimbursements"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/", response_model=ReimbursementResponse, status_code=201)
async def create_reimbursement(
    employee_id: int = Form(...),
    title: str = Form(...),
    amount: float = Form(...),
    receipt: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Validate employee
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # ---------- DUPLICATE PREVENTION ----------
    # Check if a PENDING reimbursement with identical employee, title, amount
    # exists within the last 5 minutes (prevents accidental double‑submit)
    recent = datetime.utcnow() - timedelta(minutes=5)
    existing = (
        db.query(Reimbursement)
        .filter(
            Reimbursement.employee_id == employee_id,
            Reimbursement.title == title,
            Reimbursement.amount == amount,
            Reimbursement.status == "PENDING",
            Reimbursement.submitted_at >= recent
        )
        .first()
    )
    if existing:
        # Return the existing one instead of creating a duplicate
        return existing
    # -----------------------------------------

    # Save receipt file if provided
    receipt_path = None
    if receipt:
        filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{receipt.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(await receipt.read())
        receipt_path = f"/files/reimbursements/{filename}"

    # Create record
    reimbursement = Reimbursement(
        employee_id=employee_id,
        title=title,
        amount=amount,
        receipt_file=receipt_path,
        status="PENDING"
    )
    db.add(reimbursement)
    db.commit()
    db.refresh(reimbursement)

    # Notify employee
    if employee.user_id:
        create_notification(
            db,
            user_id=employee.user_id,
            title="📄 Reimbursement Submitted",
            message=f"Your reimbursement '{title}' for ₹{amount:,.2f} has been submitted."
        )

    return reimbursement


@router.put("/{reimbursement_id}/status", response_model=ReimbursementResponse)
def update_status(
    reimbursement_id: int,
    status: str = Form(...),     # "APPROVED" or "REJECTED"
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    reimbursement = db.query(Reimbursement).filter(Reimbursement.id == reimbursement_id).first()
    if not reimbursement:
        raise HTTPException(status_code=404, detail="Reimbursement not found")
    reimbursement.status = status
    db.commit()
    db.refresh(reimbursement)

    employee = db.query(Employee).filter(Employee.id == reimbursement.employee_id).first()
    if employee and employee.user_id:
        create_notification(
            db,
            user_id=employee.user_id,
            title=f"📋 Reimbursement {status}",
            message=f"Your reimbursement '{reimbursement.title}' has been {status.lower()}."
        )

    return reimbursement


@router.get("/", response_model=list[ReimbursementResponse])
def list_reimbursements(
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Reimbursement)
    if current_user.role == "EMPLOYEE":
        employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee profile not found")
        query = query.filter(Reimbursement.employee_id == employee.id)
    elif employee_id:
        query = query.filter(Reimbursement.employee_id == employee_id)
    return query.order_by(Reimbursement.submitted_at.desc()).all()