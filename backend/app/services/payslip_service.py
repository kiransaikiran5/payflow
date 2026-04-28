import os
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from app.models.models import Payroll, Employee, Payslip

PAYSLIP_DIR = "payslips"
os.makedirs(PAYSLIP_DIR, exist_ok=True)


def generate_payslip_pdf(payroll_id: int, db: Session) -> str:
    """
    Generates a PDF payslip for the given payroll record,
    creates/updates a Payslip row in the database, and returns the file_url.
    """
    # 1. Fetch payroll and employee
    payroll = db.query(Payroll).filter(Payroll.id == payroll_id).first()
    if not payroll:
        raise ValueError("Payroll not found")

    employee = db.query(Employee).filter(Employee.id == payroll.employee_id).first()
    if not employee:
        raise ValueError("Employee not found")

    # 2. Convert Decimal to float for reportlab (if needed)
    total_earnings = float(payroll.total_earnings) if isinstance(payroll.total_earnings, Decimal) else payroll.total_earnings
    total_deductions = float(payroll.total_deductions) if isinstance(payroll.total_deductions, Decimal) else payroll.total_deductions
    net_salary = float(payroll.net_salary) if isinstance(payroll.net_salary, Decimal) else payroll.net_salary
    base_salary = float(employee.base_salary) if isinstance(employee.base_salary, Decimal) else employee.base_salary

    # 3. Create PDF filename and paths
    filename = f"payslip_{payroll_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    file_path = os.path.join(PAYSLIP_DIR, filename)
    file_url = f"/files/payslips/{filename}"   # frontend does not use this directly; download endpoint uses PAYSLIP_DIR

    # 4. Build PDF
    c = canvas.Canvas(file_path, pagesize=A4)
    width, height = A4

    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, height - 50, "PayFlow - Salary Payslip")

    c.setFont("Helvetica", 12)
    c.drawString(50, height - 80, f"Month: {payroll.month.strftime('%B %Y')}")
    c.drawString(50, height - 100, f"Employee: {employee.full_name}")
    c.drawString(50, height - 120, f"Department: {employee.department} | Designation: {employee.designation}")
    c.drawString(50, height - 140, f"Bank Account: {employee.bank_account_number}")

    data = [
        ["Description", "Amount (₹)"],
        ["Base Salary", f"{base_salary:,.2f}"],
        ["Total Earnings", f"{total_earnings:,.2f}"],
        ["Total Deductions", f"{total_deductions:,.2f}"],
        ["", ""],
        ["NET SALARY", f"{net_salary:,.2f}"]
    ]

    table = Table(data, colWidths=[250, 150])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 5), (-1, 5), colors.lightgrey),
        ('FONTNAME', (0, 5), (-1, 5), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))

    table.wrapOn(c, width, height)
    table.drawOn(c, 50, height - 320)

    c.setFont("Helvetica-Oblique", 10)
    c.drawString(50, 50, "This is a system generated payslip. For any queries, contact HR.")
    c.drawString(50, 35, f"Generated on: {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}")
    c.save()

    # 5. Update or create Payslip database record
    payslip = db.query(Payslip).filter(Payslip.payroll_id == payroll_id).first()
    if payslip:
        payslip.file_url = file_url
    else:
        payslip = Payslip(
            payroll_id=payroll_id,
            file_url=file_url
        )
        db.add(payslip)

    db.commit()
    db.refresh(payslip)
    return file_url