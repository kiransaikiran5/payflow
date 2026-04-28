from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import require_role
from app.models.models import EmployeeSalary, Employee, SalaryComponent
from app.schemas.schemas import EmployeeSalaryCreate, EmployeeSalaryResponse

router = APIRouter(prefix="/api/employee-salary", tags=["Employee Salary Assignments"])

@router.get("/employee/{employee_id}", response_model=list[EmployeeSalaryResponse])
def get_employee_components(
    employee_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("HR"))
):
    return db.query(EmployeeSalary).filter(EmployeeSalary.employee_id == employee_id).all()

@router.post("/", response_model=EmployeeSalaryResponse)
def assign_component(
    assignment: EmployeeSalaryCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("HR"))
):
    # Check employee exists
    emp = db.query(Employee).filter(Employee.id == assignment.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    # Check component exists
    comp = db.query(SalaryComponent).filter(SalaryComponent.id == assignment.component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")
    # Check if already assigned
    existing = db.query(EmployeeSalary).filter(
        EmployeeSalary.employee_id == assignment.employee_id,
        EmployeeSalary.component_id == assignment.component_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Component already assigned")
    db_assignment = EmployeeSalary(**assignment.dict())
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

@router.put("/{assignment_id}")
def update_assignment_amount(
    assignment_id: int,
    amount: float,
    db: Session = Depends(get_db),
    _=Depends(require_role("HR"))
):
    assignment = db.query(EmployeeSalary).filter(EmployeeSalary.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    assignment.amount = amount
    db.commit()
    return {"message": "Updated"}

@router.delete("/{assignment_id}")
def remove_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("HR"))
):
    assignment = db.query(EmployeeSalary).filter(EmployeeSalary.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return {"message": "Removed"}