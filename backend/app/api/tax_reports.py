from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
from datetime import date as date_type

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
)
from reportlab.lib.units import inch

from app.core.database import get_db
from app.api.dependencies import get_current_active_user, require_role
from app.models.models import TaxReport, Employee, Payroll, User
from app.schemas.schemas import TaxReportResponse
from app.services.notification_service import create_notification

router = APIRouter(prefix="/api/tax-reports", tags=["Tax Reports"])


@router.post("/generate/{employee_id}/{financial_year}", response_model=TaxReportResponse)
def generate_tax_report(
    employee_id: int,
    financial_year: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    # (identical to your code – keep it as is)
    try:
        parts = financial_year.split('-')
        if len(parts) != 2 or not (len(parts[0]) == 4 and len(parts[1]) == 4):
            raise ValueError
        start_year = int(parts[0])
        end_year = int(parts[1])
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Financial year must be in format 'YYYY-YYYY'")

    start_date = date_type(start_year, 4, 1)
    end_date = date_type(end_year, 3, 31)

    payrolls = db.query(Payroll).filter(
        Payroll.employee_id == employee_id,
        Payroll.month >= start_date,
        Payroll.month <= end_date
    ).all()

    total_earnings = sum(float(p.total_earnings) for p in payrolls)
    total_tax = sum(float(p.total_deductions) for p in payrolls)  # simplified

    report = TaxReport(
        employee_id=employee_id,
        financial_year=financial_year,
        total_earnings=total_earnings,
        total_tax=total_tax
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if emp and emp.user_id:
        create_notification(
            db,
            emp.user_id,
            "Tax Report Ready",
            f"Your tax report for {financial_year} is available."
        )

    return report


@router.get("/", response_model=list[TaxReportResponse])
def get_tax_reports(
    employee_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(TaxReport)

    if current_user.role == "EMPLOYEE":
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if emp:
            query = query.filter(TaxReport.employee_id == emp.id)
        else:
            return []
    elif employee_id:
        query = query.filter(TaxReport.employee_id == employee_id)

    return query.order_by(TaxReport.generated_at.desc()).all()


@router.get("/download/{employee_id}/{financial_year}")
def download_tax_report(
    employee_id: int,
    financial_year: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Authorization
    if current_user.role == "EMPLOYEE":
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not emp or emp.id != employee_id:
            raise HTTPException(status_code=403, detail="Access denied")

    report = db.query(TaxReport).filter(
        TaxReport.employee_id == employee_id,
        TaxReport.financial_year == financial_year
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Tax report not found")

    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # ---------- Build PDF ----------
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('CustomTitle', parent=styles['Title'],
                                 fontSize=20, textColor=colors.darkblue)
    normal_style = styles['Normal']

    elements = []

    # Header
    elements.append(Paragraph("PayFlow – Tax Summary Report", title_style))
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(Paragraph(f"<b>Employee:</b> {emp.full_name}", normal_style))
    elements.append(Paragraph(f"<b>Employee ID:</b> {employee_id}", normal_style))
    elements.append(Paragraph(f"<b>Financial Year:</b> {financial_year}", normal_style))
    elements.append(Spacer(1, 0.2 * inch))

    # Table
    data = [
        ["Description", "Amount (₹)"],
        ["Total Earnings", f"{report.total_earnings:,.2f}"],
        ["Total Tax Deducted", f"{report.total_tax:,.2f}"]
    ]

    table = Table(data, colWidths=[250, 150])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#333333')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')])
    ]))
    elements.append(table)
    elements.append(Spacer(1, 0.5 * inch))

    # Footer
    elements.append(Paragraph("<i>This is a computer‑generated tax report.</i>", normal_style))

    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Tax_Report_{emp.full_name}_{financial_year}.pdf"
        }
    )