from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import require_role
from app.services.export_service import export_payroll_csv, export_payroll_pdf

router = APIRouter(prefix="/api/export", tags=["Exports"])


@router.get("/payroll/csv")
def download_payroll_csv(
    month: str = Query(None, description="Filter by month (YYYY-MM)"),
    department: str = Query(None, description="Filter by department"),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("HR"))   # Only HR/Admin can export
):
    """Stream payroll data as a CSV file."""
    csv_content = export_payroll_csv(db, month, department)
    return StreamingResponse(
        csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=payroll.csv"}
    )


@router.get("/payroll/pdf")
def download_payroll_pdf(
    month: str = Query(None),
    department: str = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("HR"))
):
    """Generate and download a PDF payroll report."""
    pdf_bytes = export_payroll_pdf(db, month, department)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=payroll_report.pdf"}
    )