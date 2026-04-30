from decimal import Decimal
from datetime import date
from sqlalchemy.orm import Session
from app.models.models import (
    Employee, EmployeeSalary, SalaryComponent, Payroll,
    Tax, Bonus, Loan, Compliance, Overtime
)
from app.services.notification_service import create_notification


def calculate_payroll(
    employee_id: int,
    month: date,
    db: Session,
    attendance_adjustment: Decimal = Decimal("0.00")
):
    """
    Calculate earnings, deductions, net salary, and collect loan objects for an employee.
    Returns (total_earnings, total_deductions, net_salary, active_loans).
    """
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise ValueError("Employee not found")

    base_salary = employee.base_salary
    total_earnings = Decimal("0.00")
    total_deductions = Decimal("0.00")

    # ---- 1. Salary Components (Earnings/Deductions) ----
    assignments = db.query(EmployeeSalary).filter(
        EmployeeSalary.employee_id == employee_id
    ).all()

    for assignment in assignments:
        component = db.query(SalaryComponent).filter(
            SalaryComponent.id == assignment.component_id
        ).first()
        if not component:
            continue

        if component.amount_type == "FIXED":
            amount = Decimal(str(assignment.amount))
        else:  # PERCENTAGE
            amount = (base_salary * component.value) / Decimal("100.00")

        if component.type == "EARNING":
            total_earnings += amount
        else:
            total_deductions += amount

    # ---- 2. Tax Deduction ----
    tax_record = db.query(Tax).filter(Tax.employee_id == employee_id).first()
    if tax_record:
        tax_amount = (base_salary * tax_record.tax_percentage) / Decimal("100.00")
        total_deductions += tax_amount
        tax_record.tax_amount = tax_amount

    # ---- 3. Bonuses for the month ----
    bonuses = db.query(Bonus).filter(
        Bonus.employee_id == employee_id,
        Bonus.created_at >= month.replace(day=1),
        Bonus.created_at <= month
    ).all()
    for bonus in bonuses:
        total_earnings += Decimal(str(bonus.bonus_amount))

    # ---- 4. Attendance Adjustment ----
    total_deductions += attendance_adjustment

    # ---- 5. Compliance (Statutory Deductions) ----
    compliance = db.query(Compliance).filter(
        Compliance.employee_id == employee_id
    ).first()
    if compliance:
        pf = Decimal(str(compliance.pf_amount or 0))
        esi = Decimal(str(compliance.esi_amount or 0))
        total_deductions += pf + esi

    # ---- 6. Active Loan EMI Deduction ----
    active_loans = db.query(Loan).filter(
        Loan.employee_id == employee_id,
        Loan.status == "ACTIVE"
    ).all()

    for loan in active_loans:
        deduction = min(
            Decimal(str(loan.installment_amount)),
            Decimal(str(loan.remaining_amount))
        )
        total_deductions += deduction
        loan.remaining_amount -= deduction
        if loan.remaining_amount <= 0:
            loan.remaining_amount = Decimal("0.00")
            loan.status = "PAID"

    # ---- 7. Overtime payments for the month ----
    overtime_records = db.query(Overtime).filter(
        Overtime.employee_id == employee_id,
        Overtime.month == month
    ).all()
    for ovt in overtime_records:
        total_earnings += Decimal(str(ovt.total_amount))

    # ---- Final Net Salary ----
    net_salary = total_earnings - total_deductions
    return total_earnings, total_deductions, net_salary, active_loans


def generate_payroll_for_employee(
    employee_id: int,
    month: date,
    db: Session,
    attendance_adjustment: Decimal = Decimal("0.00")
):
    """
    Create a payroll record for an employee, including all components.
    Notifies the employee and handles loan updates.
    """
    existing = db.query(Payroll).filter(
        Payroll.employee_id == employee_id,
        Payroll.month == month
    ).first()
    if existing:
        raise ValueError("Payroll already generated for this month")

    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise ValueError("Employee not found")

    # Full calculation
    earnings, deductions, net, active_loans = calculate_payroll(
        employee_id, month, db, attendance_adjustment
    )

    # Create payroll
    payroll = Payroll(
        employee_id=employee_id,
        total_earnings=earnings,
        total_deductions=deductions,
        net_salary=net,
        month=month,
        status="GENERATED"
    )
    db.add(payroll)
    db.commit()
    db.refresh(payroll)

    # Commit loan changes (balances were modified in-memory)
    db.commit()

    # Notifications for loans
    for loan in active_loans:
        if loan.status == "PAID":
            create_notification(
                db,
                user_id=employee.user_id,
                title="🏁 Loan Fully Repaid",
                message=f"Your loan of ₹{loan.loan_amount:,.2f} has been completely repaid."
            )
        else:
            deduction = min(
                Decimal(str(loan.installment_amount)),
                Decimal(str(loan.loan_amount))
            )
            create_notification(
                db,
                user_id=employee.user_id,
                title="💳 Loan EMI Deducted",
                message=(
                    f"₹{deduction:,.2f} deducted as loan EMI. "
                    f"Remaining balance: ₹{loan.remaining_amount:,.2f}"
                )
            )

    # Standard payroll notification
    create_notification(
        db,
        user_id=employee.user_id,
        title="💰 Payroll Generated",
        message=(
            f"Your salary for {month.strftime('%B %Y')} has been processed. "
            f"Net amount: ₹{net:,.2f}"
        )
    )

    return payroll