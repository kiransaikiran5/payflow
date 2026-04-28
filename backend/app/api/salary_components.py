from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import require_role
from app.models.models import SalaryComponent
from app.schemas.schemas import SalaryComponentCreate, SalaryComponentResponse

router = APIRouter(prefix="/api/components", tags=["Salary Components"])

@router.get("/", response_model=list[SalaryComponentResponse])
def get_components(db: Session = Depends(get_db), _=Depends(require_role("HR"))):
    return db.query(SalaryComponent).all()

@router.post("/", response_model=SalaryComponentResponse)
def create_component(
    component: SalaryComponentCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("HR"))
):
    db_comp = SalaryComponent(**component.dict())
    db.add(db_comp)
    db.commit()
    db.refresh(db_comp)
    return db_comp

@router.put("/{component_id}", response_model=SalaryComponentResponse)
def update_component(
    component_id: int,
    component: SalaryComponentCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("HR"))
):
    db_comp = db.query(SalaryComponent).filter(SalaryComponent.id == component_id).first()
    if not db_comp:
        raise HTTPException(status_code=404, detail="Component not found")
    for key, value in component.dict().items():
        setattr(db_comp, key, value)
    db.commit()
    db.refresh(db_comp)
    return db_comp

@router.delete("/{component_id}")
def delete_component(
    component_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("HR"))
):
    db_comp = db.query(SalaryComponent).filter(SalaryComponent.id == component_id).first()
    if not db_comp:
        raise HTTPException(status_code=404, detail="Component not found")
    db.delete(db_comp)
    db.commit()
    return {"message": "Component deleted"}