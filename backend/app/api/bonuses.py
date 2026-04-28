from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import require_role
from app.models.models import Bonus, Employee
from app.schemas.schemas import BonusCreate, BonusResponse
from app.services.notification_service import (
    create_notification,
    create_notification_for_role      # ← added
)
from app.services.audit_service import log_action   # optional – uncomment if you need


router = APIRouter(prefix="/api/bonuses", tags=["Bonuses"])


@router.get("/", response_model=list[BonusResponse])
def get_bonuses(
    employee_id: int = Query(None),
    db: Session = Depends(get_db),
    _ = Depends(require_role("HR"))
):
    query = db.query(Bonus)
    if employee_id:
        query = query.filter(Bonus.employee_id == employee_id)
    return query.all()


@router.post("/", response_model=BonusResponse)
def add_bonus(
    bonus: BonusCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("HR"))
):
    # 1. Ensure the employee exists
    employee = db.query(Employee).filter(Employee.id == bonus.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # 2. Create bonus
    db_bonus = Bonus(**bonus.dict())
    db.add(db_bonus)
    db.commit()
    db.refresh(db_bonus)

    # 3. Notify employee
    if employee.user_id:
        reason = bonus.reason or "N/A"
        create_notification(
            db,
            user_id=employee.user_id,
            title="🎁 Bonus Awarded",
            message=f"A bonus of ₹{bonus.bonus_amount:,.2f} has been added to your account. Reason: {reason}"
        )

    # 4. Notify HR
    create_notification_for_role(
        db,
        'HR',
        "🎁 Bonus Awarded",
        f"Bonus of ₹{bonus.bonus_amount:,.2f} awarded to {employee.full_name}. Reason: {bonus.reason or 'N/A'}"
    )

    # Optional: audit log (uncomment if you want to track)
    # log_action(db, current_user.id, "BONUS_CREATED", "bonuses", db_bonus.id, f"Bonus of {bonus.bonus_amount} for employee {bonus.employee_id}")

    return db_bonus


@router.delete("/{bonus_id}")
def delete_bonus(
    bonus_id: int,
    db: Session = Depends(get_db),
    _ = Depends(require_role("HR"))
):
    bonus = db.query(Bonus).filter(Bonus.id == bonus_id).first()
    if not bonus:
        raise HTTPException(status_code=404, detail="Bonus not found")
    db.delete(bonus)
    db.commit()
    return {"message": "Bonus deleted"}