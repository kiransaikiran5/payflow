import csv
import io
from typing import Optional
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from app.models.models import Payroll, Employee


def export_payroll_csv(db: Session, month: Optional[str] = None, department: Optional[str] = None):
    """
    Generate payroll data as CSV. Returns an iterator of strings suitable for StreamingResponse.
    """
    query = db.query(Payroll).join(Employee, Payroll.employee_id == Employee.id)
    if month:
        query = query.filter(Payroll.month == month)
    if department:
        query = query.filter(Employee.department == department)
    results = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Payroll ID", "Employee", "Department", "Total Earnings",
        "Total Deductions", "Net Salary", "Month", "Status"
    ])

    for pr in results:
        # Employee is already loaded via join, no extra query needed
        writer.writerow([
            pr.id,
            pr.employee.full_name if pr.employee else "N/A",
            pr.employee.department if pr.employee else "N/A",
            float(pr.total_earnings),
            float(pr.total_deductions),
            float(pr.net_salary),
            pr.month,
            pr.status.value if hasattr(pr.status, 'value') else pr.status
        ])

    output.seek(0)
    return iter([output.getvalue()])


def export_payroll_pdf(db: Session, month: Optional[str] = None, department: Optional[str] = None) -> bytes:
    """
    Generate a PDF payroll report. Returns the PDF as bytes.
    """
    query = db.query(Payroll).join(Employee, Payroll.employee_id == Employee.id)
    if month:
        query = query.filter(Payroll.month == month)
    if department:
        query = query.filter(Employee.department == department)
    results = query.all()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=18
    )
    elements = []
    styles = getSampleStyleSheet()

    title_text = "Payroll Report"
    if month:
        title_text += f" – {month}"
    if department:
        title_text += f" ({department})"
    elements.append(Paragraph(title_text, styles['Title']))

    # Table data
    header = ["Payroll ID", "Employee", "Department", "Earnings (₹)", "Deductions (₹)", "Net (₹)", "Month", "Status"]
    data = [header]

    for pr in results:
        emp_name = pr.employee.full_name if pr.employee else "N/A"
        dept = pr.employee.department if pr.employee else "N/A"
        status = pr.status.value if hasattr(pr.status, 'value') else pr.status

        data.append([
            str(pr.id),
            emp_name,
            dept,
            f"₹{pr.total_earnings:,.2f}",
            f"₹{pr.total_deductions:,.2f}",
            f"₹{pr.net_salary:,.2f}",
            str(pr.month),
            status
        ])

    col_widths = [55, 140, 90, 100, 100, 100, 80, 70]
    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2c3e50")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('ALIGN', (3, 1), (5, -1), 'RIGHT'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.whitesmoke, colors.lightgrey])
    ]))
    elements.append(table)
    doc.build(elements)

    buffer.seek(0)
    return buffer.read()