from pydantic import BaseModel, EmailStr, constr, ConfigDict
from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal
from datetime import time


# ----- User & Auth Schemas -----
class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: str = "EMPLOYEE"

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "EMPLOYEE"
    # Optional employee details – if provided, will be used to create Employee record
    full_name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    base_salary: Optional[float] = 0
    bank_account_number: Optional[str] = None
    tax_id: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ----- Employee Schemas -----
class EmployeeBase(BaseModel):
    """Base fields shared across responses – all fields required for display."""
    full_name: str
    department: str
    designation: str
    base_salary: float
    bank_account_number: str
    tax_id: Optional[str] = None
    currency: str = "INR"


class EmployeeCreate(EmployeeBase):
    """Used for creating an employee. All base fields required."""
    user_id: Optional[int] = None   # optional link to user
    # inherit all other required fields from EmployeeBase


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    base_salary: Optional[float] = None
    bank_account_number: Optional[str] = None
    tax_id: Optional[str] = None
    currency: Optional[str] = None          # ← add currency

    class Config:
        from_attributes = True


class EmployeeResponse(EmployeeBase):
    id: int
    created_at: datetime
    user_id: Optional[int] = None   # included in response

    class Config:
        from_attributes = True


class EmployeeSimpleResponse(BaseModel):
    """A lightweight response (if needed)."""
    id: int
    full_name: str
    department: str
    designation: str
    base_salary: float
    bank_account_number: str
    tax_id: Optional[str] = None
    currency: str = "INR"

# ----- Salary Component Schemas -----
class SalaryComponentBase(BaseModel):
    name: str
    type: str
    amount_type: str
    value: Decimal

class SalaryComponentCreate(SalaryComponentBase):
    pass

class SalaryComponentResponse(SalaryComponentBase):
    id: int
    class Config:
        from_attributes = True

# ----- Employee Salary Component Assignment -----
class EmployeeSalaryBase(BaseModel):
    employee_id: int
    component_id: int
    amount: Decimal

class EmployeeSalaryCreate(EmployeeSalaryBase):
    pass

class EmployeeSalaryResponse(EmployeeSalaryBase):
    id: int
    class Config:
        from_attributes = True

# ----- Payroll Schemas -----
class PayrollBase(BaseModel):
    employee_id: int
    month: date

class PayrollCreate(PayrollBase):
    pass

class PayrollResponse(PayrollBase):
    id: int
    total_earnings: Decimal
    total_deductions: Decimal
    net_salary: Decimal
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

# ----- Bonus Schemas -----
class BonusBase(BaseModel):
    employee_id: int
    bonus_amount: Decimal
    reason: Optional[str] = None

class BonusCreate(BonusBase):
    pass

class BonusResponse(BonusBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class NotificationBase(BaseModel):
    user_id: int
    title: str
    message: str

class NotificationResponse(NotificationBase):
    id: int
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)



# ----- Tax Schemas -----
class TaxBase(BaseModel):
    employee_id: int
    tax_percentage: Decimal = Decimal("0.00")
    tax_amount: Decimal = Decimal("0.00")

class TaxCreate(TaxBase):
    """Used when creating a new tax record (usually via PUT if not exists)."""
    pass

class TaxUpdate(BaseModel):
    """Only tax_percentage is updatable; tax_amount is calculated automatically."""
    tax_percentage: Optional[Decimal] = None

class TaxResponse(TaxBase):
    id: int

    class Config:
        from_attributes = True   # For Pydantic v2 (replaces orm_mode)

# ----- Payslip Schemas -----

class PayslipBase(BaseModel):
    payroll_id: int
    file_url: Optional[str] = None       # can be null before generation

class PayslipCreate(PayslipBase):
    pass

class PayslipResponse(PayslipBase):
    id: int
    generated_at: datetime

    model_config = ConfigDict(from_attributes=True)   # Pydantic V2 ORM mode
# ----- Payroll Summary Schemas -----
class PayrollSummary(BaseModel):
    month: date
    total_earnings: Decimal
    total_deductions: Decimal
    net_payout: Decimal
    employee_count: int
    
    class Config:
        from_attributes = True
        
        
# ----- Department Payroll Schemas -----

class DepartmentPayroll(BaseModel):
    department: str
    total_salary: Decimal
    employee_count: int
    
    class Config:
        from_attributes = True

# ----- Attendance Adjustment Schemas -----
class AttendanceAdjustment(BaseModel):
    employee_id: int
    month: date
    days_absent: int = 0
    overtime_hours: int = 0
    adjustment_amount: Decimal = Decimal("0.00")
    

# ----- Attendance Schemas -----
class AttendanceBase(BaseModel):
    employee_id: int
    date: date
    status: str = "PRESENT"
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    overtime_hours: Decimal = Decimal("0.00")
    remarks: Optional[str] = None

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(BaseModel):
    status: Optional[str] = None
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    overtime_hours: Optional[Decimal] = None
    remarks: Optional[str] = None

class AttendanceResponse(AttendanceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class AttendanceSummaryBase(BaseModel):
    employee_id: int
    month: date
    total_days: int = 0
    present_days: int = 0
    absent_days: int = 0
    half_days: int = 0
    leave_days: int = 0
    holiday_days: int = 0
    total_overtime_hours: Decimal = Decimal("0.00")
    salary_adjustment: Decimal = Decimal("0.00")

class AttendanceSummaryResponse(AttendanceSummaryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class AttendanceBulkCreate(BaseModel):
    employee_id: int
    month: date
    default_status: str = "PRESENT"
    working_days: List[int] = []  # Days of month that are working days
    holidays: List[int] = []  # Days that are holidays
    

# ----- Phase 2 Schemas -----

# Payroll Approval
class PayrollApprovalBase(BaseModel):
    payroll_id: int
    status: str = "PENDING"
    remarks: Optional[str] = None

class PayrollApprovalCreate(PayrollApprovalBase):
    pass

class PayrollApprovalResponse(PayrollApprovalBase):
    id: int
    approved_by: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Salary History
class SalaryHistoryBase(BaseModel):
    employee_id: int
    old_salary: Optional[Decimal] = None
    new_salary: Decimal
    effective_date: date

class SalaryHistoryCreate(SalaryHistoryBase):
    pass

class SalaryHistoryResponse(SalaryHistoryBase):
    id: int
    updated_by: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Loan
class LoanBase(BaseModel):
    employee_id: int
    loan_amount: Decimal
    installment_amount: Decimal

class LoanCreate(LoanBase):
    pass

class LoanResponse(LoanBase):
    id: int
    remaining_amount: Decimal
    status: str
    applied_at: datetime
    class Config:
        from_attributes = True

# Compliance
class ComplianceBase(BaseModel):
    employee_id: int
    pf_amount: Decimal = Decimal("0.00")
    esi_amount: Decimal = Decimal("0.00")
    tax_details: Optional[dict] = None
    effective_from: Optional[date] = None

class ComplianceCreate(ComplianceBase):
    pass

class ComplianceUpdate(BaseModel):
    pf_amount: Optional[Decimal] = None
    esi_amount: Optional[Decimal] = None
    tax_details: Optional[dict] = None
    effective_from: Optional[date] = None

class ComplianceResponse(BaseModel):
    id: Optional[int] = None            # Make id optional (missing until created)
    employee_id: int
    pf_amount: float = 0.0
    esi_amount: float = 0.0
    tax_details: Optional[dict] = None
    effective_from: Optional[datetime] = None
    updated_at: Optional[datetime] = None   # Make updated_at optional
    class Config:
        from_attributes = True

# Audit Log
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    entity: Optional[str]
    entity_id: Optional[int]
    details: Optional[str]
    timestamp: datetime
    class Config:
        from_attributes = True

# Bulk Payroll
class BulkPayrollCreate(BaseModel):
    month: date
    employee_ids: Optional[List[int]] = None  # if None, all employees

class BulkPayrollResponse(BaseModel):
    successful: List[int]
    failed: List[dict]
    total_processed: int

# Export
class ExportRequest(BaseModel):
    month: Optional[date] = None
    department: Optional[str] = None
    format: str = "csv"  # csv or pdf
    
class ComplianceBase(BaseModel):
    employee_id: int
    pf_amount: Decimal = Decimal("0.00")
    esi_amount: Decimal = Decimal("0.00")
    tax_details: Optional[dict] = None
    effective_from: Optional[date] = None

class ComplianceCreate(ComplianceBase):
    pass

class ComplianceUpdate(BaseModel):
    pf_amount: Optional[Decimal] = None
    esi_amount: Optional[Decimal] = None
    tax_details: Optional[dict] = None
    effective_from: Optional[date] = None

class ComplianceResponse(ComplianceBase):
    id: int
    updated_at: Optional[datetime]
    class Config:
        from_attributes = True
        
# -- Phase 3 --
# Reimbursement
class ReimbursementCreate(BaseModel):
    employee_id: int
    title: str
    amount: float
    # receipt_file: Optional[str] = None

class ReimbursementUpdate(BaseModel):
    status: Optional[str] = None   # APPROVED / REJECTED

class ReimbursementResponse(BaseModel):
    id: int
    employee_id: int
    title: str
    amount: float
    receipt_file: Optional[str]
    status: str
    submitted_at: datetime
    
    class Config:
        from_attributes = True

# Overtime
class OvertimeCreate(BaseModel):
    employee_id: int
    hours_worked: float
    overtime_rate: float
    month: date

class OvertimeResponse(BaseModel):
    id: int
    employee_id: int
    hours_worked: float
    overtime_rate: float
    total_amount: float
    # base_salary_per_hour: float
    month: date
    
    class Config:
        from_attributes = True

# Tax Report
class TaxReportResponse(BaseModel):
    id: int
    employee_id: int
    financial_year: str
    total_earnings: float
    total_tax: float
    generated_at: datetime
    class Config:
        from_attributes = True

# Payroll Dispute
class DisputeCreate(BaseModel):
    employee_id: int
    payroll_id: Optional[int] = None
    issue_title: str
    description: Optional[str] = None

class DisputeUpdate(BaseModel):
    status: str
    resolution: Optional[str] = None

class DisputeResponse(BaseModel):
    id: int
    employee_id: int
    payroll_id: Optional[int]
    issue_title: str
    description: Optional[str]
    status: str
    created_at: datetime
    resolved_at: Optional[datetime]
    class Config:
        from_attributes = True

# Document
class DocumentResponse(BaseModel):
    id: int
    employee_id: int
    document_type: str
    file_url: str
    uploaded_at: datetime
    
    class Config:
        from_attributes = True
        
# --
class DepartmentAnalytics(BaseModel):
    department: str
    total_salary: float
    employee_count: int
    avg_salary: float

class MonthlyTrend(BaseModel):
    month: str
    net_payout: float
    total_overtime: float
    total_bonuses: float

class OvertimeAnalysis(BaseModel):
    month: str
    total_hours: float
    total_amount: float
    employee_count: int

class BonusDistribution(BaseModel):
    month: str
    total_bonus: float
    employee_count: int

class EmployeeCost(BaseModel):
    department: str
    total_salary: float
    total_overtime: float
    total_bonuses: float
    total_cost: float

class AnalyticsResponse(BaseModel):
    # KPI cards
    total_employees: int
    current_month_payroll: float
    pending_payslips: int
    total_overtime_this_month: float
    total_bonuses_this_month: float

    # Charts
    department_breakdown: List[DepartmentAnalytics]
    payroll_trend: List[MonthlyTrend]
    overtime_analysis: List[OvertimeAnalysis]
    bonus_distribution: List[BonusDistribution]
    employee_cost: List[EmployeeCost]

    model_config = ConfigDict(from_attributes=True)
