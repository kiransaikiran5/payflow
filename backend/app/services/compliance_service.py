from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.models import Compliance, Employee

def get_compliance_deductions(employee_id: int, db: Session) -> dict:
    """Return {'pf': float, 'esi': float} for an employee.
       Falls back to default percentages if no record exists."""
    compliance = db.query(Compliance).filter(Compliance.employee_id == employee_id).first()
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    base = float(employee.base_salary) if employee else 0

    if compliance:
        pf = float(compliance.pf_amount) if compliance.pf_amount else (base * 0.12)
        esi = float(compliance.esi_amount) if compliance.esi_amount else (base * 0.0075)
    else:
        pf = base * 0.12      # default: 12% of base
        esi = base * 0.0075   # default: 0.75% of base
    return {"pf": pf, "esi": esi}