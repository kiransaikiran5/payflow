from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import require_role
from app.schemas.schemas import BulkPayrollCreate, BulkPayrollResponse
from app.services.bulk_payroll_service import process_bulk_payroll

router = APIRouter(prefix="/api/bulk-payroll", tags=["Bulk Payroll"])

@router.post("/generate", response_model=BulkPayrollResponse)
def generate_bulk_payroll(
    data: BulkPayrollCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("HR"))
):
    result = process_bulk_payroll(data, db)
    return result