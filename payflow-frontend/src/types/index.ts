// ===================== Core Entities =====================

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'EMPLOYEE' | 'HR' | 'ADMIN';
  created_at: string;
}

export interface Employee {
  id: number;
  user_id?: number;
  full_name: string;
  department: string;
  designation: string;
  base_salary: number;
  bank_account_number: string;
  tax_id?: string;
  created_at: string;
  currency: string;
}

export interface SalaryComponent {
  id: number;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  amount_type: 'FIXED' | 'PERCENTAGE';
  value: number;
}

export interface EmployeeSalary {
  id: number;
  employee_id: number;
  component_id: number;
  amount: number;
}

export interface Payroll {
  id: number;
  employee_id: number;
  total_earnings: number;
  total_deductions: number;
  net_salary: number;
  month: string;               // Format: YYYY-MM
  status: 'GENERATED' | 'PAID';
  created_at: string;
}

export interface Tax {
  id: number;
  employee_id: number;
  tax_percentage: number;
  tax_amount: number;
}

export interface Payslip {
  id: number;
  payroll_id: number;
  file_url: string;
  generated_at: string;
}

export interface Bonus {
  id: number;
  employee_id: number;
  bonus_amount: number;
  reason?: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ===================== Reports & Analytics =====================

export interface PayrollSummary {
  month: string;
  total_earnings: number;
  total_deductions: number;
  net_payout: number;
  employee_count: number;
}

export interface DepartmentPayroll {
  department: string;
  total_salary: number;
  employee_count: number;
}

// ===================== Phase 2 Additions =====================

export interface SalaryHistory {
  id: number;
  employee_id: number;
  old_salary?: number;
  new_salary: number;
  effective_date: string;
  updated_by?: number;
  created_at: string;
}

export interface Loan {
  id: number;
  employee_id: number;
  loan_amount: number;
  remaining_amount: number;
  installment_amount: number;
  status: 'ACTIVE' | 'PAID' | 'DEFAULTED';
  applied_at: string;
}

export interface Compliance {
  id: number;
  employee_id: number;
  pf_amount: number;
  esi_amount: number;
  tax_details?: any;
  effective_from?: string;
  updated_at?: string;
}

export interface PayrollApproval {
  id: number;
  payroll_id: number;
  approved_by?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  entity?: string;
  entity_id?: number;
  details?: string;
  timestamp: string;
}

export interface BulkPayrollResponse {
  successful: number[];
  failed: { employee_id: number; reason: string }[];
  total_processed: number;
}