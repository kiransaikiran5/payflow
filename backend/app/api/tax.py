from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import require_role, get_current_active_user
from app.models.models import Tax, Employee, User
from app.schemas.schemas import TaxResponse, TaxUpdate
from typing import List, Optional

router = APIRouter(prefix="/api/tax", tags=["Tax"])

@router.get("/employee/{employee_id}", response_model=TaxResponse)
def get_tax_by_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get tax record for an employee (HR/ADMIN can view any; EMPLOYEE can view own)."""
    if current_user.role == "EMPLOYEE":
        employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not employee or employee.id != employee_id:
            raise HTTPException(status_code=403, detail="Access denied")
    tax = db.query(Tax).filter(Tax.employee_id == employee_id).first()
    if not tax:
        # Return a default tax record with 0%
        return TaxResponse(employee_id=employee_id, tax_percentage=0, tax_amount=0)
    return tax

@router.put("/employee/{employee_id}", response_model=TaxResponse)
def update_tax(
    employee_id: int,
    tax_data: TaxUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role("HR"))
):
    """Update tax percentage for an employee (HR/ADMIN only)."""
    tax = db.query(Tax).filter(Tax.employee_id == employee_id).first()
    if not tax:
        tax = Tax(employee_id=employee_id, tax_percentage=tax_data.tax_percentage, tax_amount=0)
        db.add(tax)
    else:
        tax.tax_percentage = tax_data.tax_percentage
    # Calculate tax_amount based on base salary (if you want auto-calc)
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee:
        tax.tax_amount = (employee.base_salary * tax_data.tax_percentage) / 100
    db.commit()
    db.refresh(tax)
    return tax