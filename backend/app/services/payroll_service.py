from decimal import Decimal
from datetime import date
from sqlalchemy.orm import Session
from app.models.models import (
    Employee, EmployeeSalary, SalaryComponent, Payroll, Tax, Bonus, Loan, Compliance
)
from app.services.notification_service import create_notification


def calculate_payroll(
    employee_id: int,
    month: date,
    db: Session,
    attendance_adjustment: Decimal = Decimal("0.00")
):
    """
    Calculate earnings, deductions, and net salary for an employee.
    Returns (total_earnings, total_deductions, net_salary).
    Also updates loan balances in-memory (they are committed later).
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
            amount = assignment.amount
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
        # Update tax_amount in record (will be committed later)
        tax_record.tax_amount = tax_amount

    # ---- 3. Bonuses for the month ----
    bonuses = db.query(Bonus).filter(
        Bonus.employee_id == employee_id,
        Bonus.created_at >= month.replace(day=1),
        Bonus.created_at <= month
    ).all()
    for bonus in bonuses:
        total_earnings += bonus.bonus_amount

    # ---- 4. Attendance Adjustment (passed as parameter) ----
    total_deductions += attendance_adjustment

    # ---- 5. Compliance (Statutory Deductions) ----
    compliance = db.query(Compliance).filter(
        Compliance.employee_id == employee_id
    ).first()
    if compliance:
        pf = compliance.pf_amount if compliance.pf_amount else Decimal("0.00")
        esi = compliance.esi_amount if compliance.esi_amount else Decimal("0.00")
        total_deductions += pf + esi

    # ---- 6. Active Loan EMI Deduction ----
    active_loans = db.query(Loan).filter(
        Loan.employee_id == employee_id,
        Loan.status == "ACTIVE"
    ).all()

    for loan in active_loans:
        # Deduct the lesser of the installment or remaining amount
        deduction = min(loan.installment_amount, loan.remaining_amount)
        total_deductions += deduction

        # Update loan balance (in-memory, will be committed by caller)
        loan.remaining_amount -= deduction
        if loan.remaining_amount <= 0:
            loan.remaining_amount = Decimal("0.00")
            loan.status = "PAID"

        # Notify employee (optional, we can do it in generate function)
        # We'll handle notifications in generate_payroll_for_employee for clarity.

    net_salary = total_earnings - total_deductions
    return total_earnings, total_deductions, net_salary, active_loans


def generate_payroll_for_employee(
    employee_id: int,
    month: date,
    db: Session,
    attendance_adjustment: Decimal = Decimal("0.00")
):
    """
    Create or update a payroll record for a specific employee and month.
    Includes loan EMI deduction and marks loans as PAID when fully repaid.
    Sends appropriate notifications to the employee.
    """
    # Check for existing payroll
    existing = db.query(Payroll).filter(
        Payroll.employee_id == employee_id,
        Payroll.month == month
    ).first()
    if existing:
        raise ValueError("Payroll already generated for this month")

    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise ValueError("Employee not found")

    # Calculate payroll (and capture active loans)
    earnings, deductions, net, active_loans = calculate_payroll(
        employee_id, month, db, attendance_adjustment
    )

    # Create payroll record
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

    # Now commit loan balance changes (they were modified in-memory)
    db.commit()

    # ---- Notifications for Loan Events ----
    for loan in active_loans:
        if loan.status == "PAID":
            create_notification(
                db,
                user_id=employee.user_id,
                title="🏁 Loan Fully Repaid",
                message=f"Your loan of ₹{loan.loan_amount:,.2f} has been completely repaid."
            )
        else:
            # Calculate how much was deducted this month
            deduction = min(loan.installment_amount, loan.loan_amount)
            create_notification(
                db,
                user_id=employee.user_id,
                title="💳 Loan EMI Deducted",
                message=(
                    f"₹{deduction:,.2f} deducted as loan EMI. "
                    f"Remaining balance: ₹{loan.remaining_amount:,.2f}"
                )
            )

    # ---- Standard Payroll Notification ----
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