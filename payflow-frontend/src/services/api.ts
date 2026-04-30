import axios from 'axios';
import {
  User,
  Employee,
  SalaryComponent,
  EmployeeSalary,
  Payroll,
  PayrollSummary,
  DepartmentPayroll,
  Tax,
  Payslip,
  Bonus,
  Notification,
  PayrollApproval,
  SalaryHistory,
  Loan,
  Compliance,
  BulkPayrollResponse,
  AuditLog,
  Reimbursement,
  OvertimeRecord,
  TaxReport,
  PayrollDispute,
  DocFile,
  AnalyticsResponse,
} from '../types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// ---------- Helper for multipart requests (no Content-Type) ----------
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

// ---------- Standard JSON API instance ----------
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

// ==================== Authentication ====================
export const authAPI = {
  login: (username: string, password: string) =>
    api.post<{ access_token: string; token_type: string }>(
      '/auth/login',
      new URLSearchParams({ username, password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ),
  register: (data: {
    username: string;
    email: string;
    password: string;
    role?: string;
    full_name?: string;
    department?: string;
    designation?: string;
    base_salary?: number;
    bank_account_number?: string;
    tax_id?: string;
  }) => api.post<User>('/auth/register', data),
  getMe: () => api.get<User>('/auth/me'),
};

// ==================== Employees ====================
export const employeeAPI = {
  getAll: () => api.get<Employee[]>('/employees/'),
  getById: (id: number) => api.get<Employee>(`/employees/${id}`),
  create: (data: Omit<Employee, 'id' | 'created_at'>) =>
    api.post<Employee>('/employees/', data),
  update: (id: number, data: Partial<Employee>) =>
    api.put<Employee>(`/employees/${id}`, data),
  delete: (id: number) => api.delete(`/employees/${id}`),
  getMe: () => api.get<Employee>('/employees/me'),
};

// ==================== Salary Components ====================
export const componentAPI = {
  getAll: () => api.get<SalaryComponent[]>('/components/'),
  create: (data: Omit<SalaryComponent, 'id'>) =>
    api.post<SalaryComponent>('/components/', data),
  update: (id: number, data: Partial<SalaryComponent>) =>
    api.put<SalaryComponent>(`/components/${id}`, data),
  delete: (id: number) => api.delete(`/components/${id}`),
};

// ==================== Employee Salary Assignments ====================
export const employeeSalaryAPI = {
  getByEmployee: (employeeId: number) =>
    api.get<EmployeeSalary[]>(`/employee-salary/employee/${employeeId}`),
  assign: (data: { employee_id: number; component_id: number; amount: number }) =>
    api.post<EmployeeSalary>('/employee-salary/', data),
  update: (id: number, amount: number) =>
    api.put<EmployeeSalary>(`/employee-salary/${id}`, { amount }),
  remove: (id: number) => api.delete(`/employee-salary/${id}`),
};

// ==================== Payroll ====================
export const payrollAPI = {
  getAll: (month?: string) =>
    api.get<Payroll[]>('/payroll/', { params: { month } }),
  getById: (id: number) => api.get<Payroll>(`/payroll/${id}`),
  generate: (employeeId: number, month: string) =>
    api.post<Payroll>('/payroll/', { employee_id: employeeId, month }),
  markPaid: (id: number) => api.patch<Payroll>(`/payroll/${id}/paid`),
  getSummary: (month?: string) =>
    api.get<PayrollSummary[]>('/payroll/summary', { params: { month } }),
  getByDepartment: (month?: string) =>
    api.get<DepartmentPayroll[]>('/payroll/by-department', { params: { month } }),
};

// ==================== Tax ====================
export const taxAPI = {
  getByEmployee: (employeeId: number) =>
    api.get<Tax>(`/tax/employee/${employeeId}`),
  update: (employeeId: number, data: { tax_percentage: number }) =>
    api.put<Tax>(`/tax/employee/${employeeId}`, data),
};

// ==================== Payslips ====================
export const payslipAPI = {
  getAll: () => api.get<Payslip[]>('/payslips/'),
  getByEmployee: (employeeId: number) =>
    api.get<Payslip[]>(`/payslips/employee/${employeeId}`),
  generate: (payrollId: number) =>
    api.post<Payslip>(`/payslips/${payrollId}`),
  download: (payslipId: number) =>
    api.get(`/payslips/${payslipId}/download`, { responseType: 'blob' }),
};

// ==================== Bonuses ====================
export const bonusAPI = {
  getAll: (employeeId?: number) =>
    api.get<Bonus[]>('/bonuses/', { params: { employee_id: employeeId } }),
  create: (data: { employee_id: number; bonus_amount: number; reason?: string }) =>
    api.post<Bonus>('/bonuses/', data),
  delete: (id: number) => api.delete(`/bonuses/${id}`),
};

// ==================== Notifications ====================
export const notificationAPI = {
  getAll: (unreadOnly?: boolean) =>
    api.get<Notification[]>('/notifications/', {
      params: { unread_only: unreadOnly },
    }),
  getCount: () => api.get<{ unread_count: number }>('/notifications/count'),
  markAsRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/mark-all-read'),
  delete: (id: number) => api.delete(`/notifications/${id}`),
  deleteAll: () => api.delete('/notifications/'),
  send: (userId: number, title: string, message: string) =>
    api.post('/notifications/send', null, {
      params: { user_id: userId, title, message },
    }),
  sendToRole: (role: string, title: string, message: string) =>
    api.post(`/notifications/send/role/${role}`, null, {
      params: { title, message },
    }),
  sendToDepartment: (department: string, title: string, message: string) =>
    api.post(`/notifications/send/department/${department}`, null, {
      params: { title, message },
    }),
};

// ==================== Phase 2 Additions ====================
export const approvalAPI = {
  getAll: (status?: string) =>
    api.get<PayrollApproval[]>('/approvals/', { params: { status } }),
  create: (data: { payroll_id: number; remarks?: string }) =>
    api.post<PayrollApproval>('/approvals/', data),
  approve: (id: number, remarks?: string) =>
    api.put<PayrollApproval>(`/approvals/${id}/approve`, null, { params: { remarks } }),
  reject: (id: number, remarks?: string) =>
    api.put<PayrollApproval>(`/approvals/${id}/reject`, null, { params: { remarks } }),
};

export const salaryHistoryAPI = {
  getByEmployee: (employeeId: number) =>
    api.get<SalaryHistory[]>(`/salary-history/employee/${employeeId}`),
  recordChange: (data: {
    employee_id: number;
    old_salary?: number;
    new_salary: number;
    effective_date: string;
  }) => api.post<SalaryHistory>('/salary-history/', data),
};

export const loanAPI = {
  getAll: (employeeId?: number, status?: string) =>
    api.get<Loan[]>('/loans/', { params: { employee_id: employeeId, status } }),
  create: (data: { employee_id: number; loan_amount: number; installment_amount: number }) =>
    api.post<Loan>('/loans/', data),
  repay: (loanId: number) => api.patch(`/loans/${loanId}/repay`),
};

export const complianceAPI = {
  getByEmployee: (employeeId: number) =>
    api.get<Compliance>(`/compliance/employee/${employeeId}`),
  update: (employeeId: number, data: any) =>
    api.put<Compliance>(`/compliance/employee/${employeeId}`, data),
};

export const bulkPayrollAPI = {
  generate: (data: { month: string; employee_ids?: number[] }) =>
    api.post<BulkPayrollResponse>('/bulk-payroll/generate', data),
};

export const exportAPI = {
  payrollCSV: (month?: string, department?: string) =>
    api.get('/export/payroll/csv', { params: { month, department }, responseType: 'blob' }),
  payrollPDF: (month?: string, department?: string) =>
    api.get('/export/payroll/pdf', { params: { month, department }, responseType: 'blob' }),
};

export const auditLogAPI = {
  getAll: (entity?: string) =>
    api.get<AuditLog[]>('/audit-logs/', { params: { entity } }),
};

// ==================== Phase 3 Additions ====================
export const reimbursementAPI = {
  create: (data: FormData) =>
    axios.post<Reimbursement>(`${API_BASE}/reimbursements/`, data, {
      headers: getAuthHeaders(),
    }),
  update: (id: number, status: string) => {
    const formData = new FormData();
    formData.append('status', status);
    return axios.put<Reimbursement>(
      `${API_BASE}/reimbursements/${id}/status`,
      formData,
      { headers: getAuthHeaders() }
    );
  },
  getAll: (employeeId?: number) =>
    api.get<Reimbursement[]>('/reimbursements/', { params: { employee_id: employeeId } }),
};

export const overtimeAPI = {
  create: (data: any) => api.post<OvertimeRecord>('/overtime/', data),
  getAll: (employeeId?: number, month?: string) =>
    api.get<OvertimeRecord[]>('/overtime/', { params: { employee_id: employeeId, month } }),
};

export const taxReportAPI = {
  generate: (employeeId: number, financialYear: string) =>
    api.post<TaxReport>(`/tax-reports/generate/${employeeId}/${financialYear}`),
  getAll: (employeeId?: number) =>
    api.get<TaxReport[]>('/tax-reports/', { params: { employee_id: employeeId } }),
  // ✅ add this
  download: (employeeId: number, financialYear: string) =>
    api.get(`/tax-reports/download/${employeeId}/${financialYear}`, { responseType: 'blob' }),
};

// ✅ Dispute API now requires payroll_id as per backend schema
export const disputeAPI = {
  create: (data: {
    employee_id: number;
    payroll_id: number;
    issue_title: string;
    description?: string;
  }) => api.post<PayrollDispute>('/disputes/', data),
  update: (id: number, status: string, resolution?: string) =>
    api.put<PayrollDispute>(`/disputes/${id}`, { status, resolution }),
  getAll: (employeeId?: number) =>
    api.get<PayrollDispute[]>('/disputes/', { params: { employee_id: employeeId } }),
};

// Document upload – employee_id & document_type as query params, file in body
export const documentAPI = {
  upload: (employeeId: string, documentType: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return axios.post<DocFile>(
      `${API_BASE}/documents/upload`,
      formData,
      {
        headers: getAuthHeaders(),
        params: {
          employee_id: employeeId,
          document_type: documentType,
        },
      }
    );
  },
  getAll: (employeeId?: number) =>
    api.get<DocFile[]>('/documents/', { params: { employee_id: employeeId } }),
};

export const analyticsAPI = {
  getDashboard: () => api.get<AnalyticsResponse>('/analytics/'),
};

export default api;