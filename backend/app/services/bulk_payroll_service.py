from sqlalchemy.orm import Session
from app.models.models import Employee, Payroll
from app.services.payroll_service import generate_payroll_for_employee
from app.schemas.schemas import BulkPayrollCreate, BulkPayrollResponse

def process_bulk_payroll(data: BulkPayrollCreate, db: Session):
    if data.employee_ids:
        employees = db.query(Employee).filter(Employee.id.in_(data.employee_ids)).all()
    else:
        employees = db.query(Employee).all()
    successful, failed = [], []
    for emp in employees:
        try:
            existing = db.query(Payroll).filter(Payroll.employee_id == emp.id, Payroll.month == data.month).first()
            if existing:
                failed.append({"employee_id": emp.id, "reason": "Already exists"})
                continue
            generate_payroll_for_employee(emp.id, data.month, db)
            successful.append(emp.id)
        except Exception as e:
            failed.append({"employee_id": emp.id, "reason": str(e)})
    return BulkPayrollResponse(successful=successful, failed=failed, total_processed=len(employees))