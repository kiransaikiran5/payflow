from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os

from app.core.database import get_db
from app.api.dependencies import require_role, get_current_active_user
from app.models.models import Payslip, Payroll, User, Employee
from app.schemas.schemas import PayslipResponse
from app.services.payslip_service import generate_payslip_pdf
from app.services.notification_service import create_notification

router = APIRouter(prefix="/api/payslips", tags=["Payslips"])

PAYSLIP_DIR = "payslips"


# ✅ Generate or Get Payslip
@router.post("/{payroll_id}/generate", response_model=PayslipResponse)
def generate_or_get_payslip(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    # 1. Check payroll exists
    payroll = db.query(Payroll).filter(Payroll.id == payroll_id).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")

    # 2. Return existing payslip if already generated and file exists
    existing = db.query(Payslip).filter(Payslip.payroll_id == payroll_id).first()
    if existing and existing.file_url:
        # Verify the file still exists on disk
        filename = os.path.basename(existing.file_url)
        full_path = os.path.join(PAYSLIP_DIR, filename)
        if os.path.exists(full_path):
            return existing

    try:
        # 3. Generate PDF (creates/updates the Payslip record and commits)
        file_url = generate_payslip_pdf(payroll_id, db)
        if not file_url:
            raise HTTPException(status_code=500, detail="Failed to generate payslip PDF")

        # 4. Fetch the freshly created/updated record
        payslip = db.query(Payslip).filter(Payslip.payroll_id == payroll_id).first()
        if not payslip:
            raise HTTPException(status_code=500, detail="Payslip record not found after generation")

        # 5. Notify the employee
        employee = db.query(Employee).filter(Employee.id == payroll.employee_id).first()
        if employee and employee.user_id:
            month_str = payroll.month.strftime('%B %Y') if payroll.month else "this month"
            create_notification(
                db=db,
                user_id=employee.user_id,
                title="📄 Payslip Available",
                message=f"Your payslip for {month_str} is ready."
            )

        # 6. Commit again to be safe (notification might have been created inside the function)
        db.commit()
        db.refresh(payslip)
        return payslip

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ✅ Download Payslip
@router.get("/{payslip_id}/download")
def download_payslip(
    payslip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    payslip = db.query(Payslip).filter(Payslip.id == payslip_id).first()
    if not payslip:
        raise HTTPException(status_code=404, detail="Payslip not found")
    if not payslip.file_url:
        raise HTTPException(status_code=400, detail="Payslip not generated")

    payroll = db.query(Payroll).filter(Payroll.id == payslip.payroll_id).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")

    # Access control for employees
    if current_user.role == "EMPLOYEE":
        employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not employee or employee.id != payroll.employee_id:
            raise HTTPException(status_code=403, detail="Access denied")

    filename = os.path.basename(payslip.file_url)
    file_path = os.path.join(PAYSLIP_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=f"payslip_{payslip_id}.pdf"
    )


# ✅ Get Payslip by Payroll ID
@router.get("/by-payroll/{payroll_id}", response_model=PayslipResponse)
def get_payslip_by_payroll(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    payslip = db.query(Payslip).filter(Payslip.payroll_id == payroll_id).first()
    if not payslip:
        raise HTTPException(status_code=404, detail="Payslip not found")
    return payslip


# ✅ Get All Payslips (HR only)
@router.get("/", response_model=List[PayslipResponse])
def get_all_payslips(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    return db.query(Payslip).order_by(Payslip.generated_at.desc()).all()


# ✅ Get Payslips by Employee ID
@router.get("/employee/{employee_id}", response_model=List[PayslipResponse])
def get_payslips_by_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Employees can only see their own
    if current_user.role == "EMPLOYEE":
        employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not employee or employee.id != employee_id:
            raise HTTPException(status_code=403, detail="Access denied")

    payslips = (
        db.query(Payslip)
        .join(Payroll, Payslip.payroll_id == Payroll.id)
        .filter(Payroll.employee_id == employee_id)
        .order_by(Payslip.generated_at.desc())
        .all()
    )
    return payslips