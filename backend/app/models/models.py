from sqlalchemy import JSON, Column, Integer, String, Enum, DECIMAL, Date, ForeignKey, Boolean, Text, TIMESTAMP, DateTime, Time
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum('EMPLOYEE', 'HR', 'ADMIN'), default='EMPLOYEE')
    created_at = Column(TIMESTAMP, server_default=func.now())
    # is_active = Column(Boolean, default=True)
    
    employee = relationship("Employee", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user")

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=True)
    full_name = Column(String(100), nullable=False)
    department = Column(String(100))
    designation = Column(String(100))
    base_salary = Column(DECIMAL(12,2), nullable=False)
    bank_account_number = Column(String(20), nullable=False)
    tax_id = Column(String(20))
    created_at = Column(TIMESTAMP, server_default=func.now())
    currency = Column(String(3), default='INR')   # e.g., INR, USD, EUR, GBP
    
    user = relationship("User", back_populates="employee")
    salary_components = relationship("EmployeeSalary", back_populates="employee")
    payrolls = relationship("Payroll", back_populates="employee")
    tax = relationship("Tax", back_populates="employee", uselist=False)
    bonuses = relationship("Bonus", back_populates="employee")
    attendance = relationship("Attendance", back_populates="employee")
    attendance_summaries = relationship("AttendanceSummary", back_populates="employee")
    salary_history = relationship("SalaryHistory", back_populates="employee")
    loans = relationship("Loan", back_populates="employee")
    compliance = relationship("Compliance", back_populates="employee", uselist=False)

class SalaryComponent(Base):
    __tablename__ = "salary_components"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    type = Column(Enum('EARNING', 'DEDUCTION'), nullable=False)
    amount_type = Column(Enum('FIXED', 'PERCENTAGE'), nullable=False)
    value = Column(DECIMAL(10,2), nullable=False)
    
    employee_salary = relationship("EmployeeSalary", back_populates="component")

class EmployeeSalary(Base):
    __tablename__ = "employee_salary"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'))
    component_id = Column(Integer, ForeignKey('salary_components.id'))
    amount = Column(DECIMAL(10,2), nullable=False)
    
    employee = relationship("Employee", back_populates="salary_components")
    component = relationship("SalaryComponent", back_populates="employee_salary")

class Payroll(Base):
    __tablename__ = "payroll"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'))
    total_earnings = Column(DECIMAL(12,2), default=0.00)
    total_deductions = Column(DECIMAL(12,2), default=0.00)
    net_salary = Column(DECIMAL(12,2), default=0.00)
    month = Column(Date, nullable=False)
    status = Column(Enum('GENERATED', 'PAID'), default='GENERATED')
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    employee = relationship("Employee", back_populates="payrolls")
    payslips = relationship("Payslip", back_populates="payroll")
    approval = relationship("PayrollApproval", back_populates="payroll", uselist=False)

class Tax(Base):
    __tablename__ = "tax"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'))
    tax_percentage = Column(DECIMAL(5,2), default=0.00)
    tax_amount = Column(DECIMAL(10,2), default=0.00)
    
    employee = relationship("Employee", back_populates="tax")

class Payslip(Base):
    __tablename__ = "payslips"
    id = Column(Integer, primary_key=True, index=True)
    payroll_id = Column(Integer, ForeignKey("payroll.id"), unique=True, nullable=False)
    file_url = Column(String, nullable=True)   # URL to the PDF file
    generated_at = Column(DateTime, default=datetime.utcnow)
    
    payroll = relationship("Payroll", back_populates="payslips")

class Bonus(Base):
    __tablename__ = "bonuses"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'))
    bonus_amount = Column(DECIMAL(10,2), nullable=False)
    reason = Column(String(255))
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    employee = relationship("Employee", back_populates="bonuses")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    title = Column(String(100), nullable=False)
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    user = relationship("User", back_populates="notifications")
    
class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(Enum('PRESENT', 'ABSENT', 'HALF_DAY', 'HOLIDAY', 'LEAVE'), default='PRESENT')
    check_in = Column(Time, nullable=True)
    check_out = Column(Time, nullable=True)
    overtime_hours = Column(DECIMAL(5,2), default=0.00)
    remarks = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    employee = relationship("Employee", back_populates="attendance")

class AttendanceSummary(Base):
    __tablename__ = "attendance_summary"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    month = Column(Date, nullable=False)
    total_days = Column(Integer, default=0)
    present_days = Column(Integer, default=0)
    absent_days = Column(Integer, default=0)
    half_days = Column(Integer, default=0)
    leave_days = Column(Integer, default=0)
    holiday_days = Column(Integer, default=0)
    total_overtime_hours = Column(DECIMAL(10,2), default=0.00)
    salary_adjustment = Column(DECIMAL(10,2), default=0.00)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    employee = relationship("Employee", back_populates="attendance_summaries")
    

# Add these new models after existing ones

class PayrollApproval(Base):
    __tablename__ = "payroll_approvals"
    id = Column(Integer, primary_key=True, index=True)
    payroll_id = Column(Integer, ForeignKey('payroll.id'), nullable=False)
    approved_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    status = Column(Enum('PENDING', 'APPROVED', 'REJECTED'), default='PENDING')
    remarks = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    payroll = relationship("Payroll", back_populates="approval")
    approver = relationship("User")

class SalaryHistory(Base):
    __tablename__ = "salary_history"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    old_salary = Column(DECIMAL(12,2), nullable=True)
    new_salary = Column(DECIMAL(12,2), nullable=False)
    effective_date = Column(Date, nullable=False)
    updated_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    employee = relationship("Employee", back_populates="salary_history")
    updater = relationship("User")

class Loan(Base):
    __tablename__ = "loans"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    loan_amount = Column(DECIMAL(12,2), nullable=False)
    remaining_amount = Column(DECIMAL(12,2), nullable=False)
    installment_amount = Column(DECIMAL(10,2), nullable=False)
    status = Column(Enum('ACTIVE', 'PAID', 'DEFAULTED'), default='ACTIVE')
    applied_at = Column(TIMESTAMP, server_default=func.now())
    
    employee = relationship("Employee", back_populates="loans")

class Compliance(Base):
    __tablename__ = "compliance"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    pf_amount = Column(DECIMAL(10,2), default=0.00)
    esi_amount = Column(DECIMAL(10,2), default=0.00)
    tax_details = Column(JSON, nullable=True)
    effective_from = Column(Date, nullable=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    employee = relationship("Employee", back_populates="compliance")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    action = Column(String(100), nullable=False)
    entity = Column(String(100), nullable=True)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(TIMESTAMP, server_default=func.now())
    
    user = relationship("User")