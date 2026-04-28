import React, { useEffect, useState, useCallback } from 'react';
import {
  Container, Typography, Paper, Button, Box, FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Card, CardContent, Skeleton,
  useTheme, alpha, Fade, Grow, Grid, Tooltip, Divider
} from '@mui/material';
import { PictureAsPdf, Paid, AttachMoney, People, Pending, Warning, Info } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { payrollAPI, employeeAPI, payslipAPI } from '../services/api';
import { Payroll, Employee } from '../types';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Helper: safe currency formatting
const formatCurrency = (value: unknown): string => {
  if (value === undefined || value === null) return '₹0';
  let num: number;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    num = parseFloat(cleaned);
  } else {
    num = Number(value);
  }
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Type for attendance summary (adjust based on your backend response)
interface AttendanceSummary {
  present_days: number;
  absent_days: number;
  half_days: number;
  total_overtime_hours: number;
  absence_deduction: number;
  overtime_bonus: number;
  net_adjustment: number;
}

const PayrollPage: React.FC = () => {
  const theme = useTheme();
  const { user, isHR, logout } = useAuth();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs().startOf('month'));
  const [openGenerate, setOpenGenerate] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [openImpactModal, setOpenImpactModal] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);

  // Handle session expiry
  const handleAuthError = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    logout();
    window.location.href = '/login';
  }, [logout]);

  // Fetch all employees (HR only)
  const fetchEmployees = useCallback(async () => {
    if (!isHR) return;
    try {
      const res = await employeeAPI.getAll();
      setEmployees(res.data || []);
    } catch (err: any) {
      if (err.response?.status === 403) handleAuthError();
      else toast.error('Failed to fetch employees');
    }
  }, [isHR, handleAuthError]);

  // Fetch payrolls for selected month
  const fetchPayrolls = useCallback(async () => {
    if (!isHR) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setApiError(null);
    try {
      const monthStr = selectedMonth.format('YYYY-MM-DD');
      // Assumes payrollAPI.getAll accepts an optional month parameter
      const res = await payrollAPI.getAll(monthStr);
      setPayrolls(res.data || []);
    } catch (err: any) {
      console.error('Payroll fetch error:', err);
      if (err.response?.status === 403) {
        setApiError('Session expired – please re-login');
        toast.error('Session expired – please re-login');
        setTimeout(() => handleAuthError(), 2000);
      } else {
        setApiError(err.response?.data?.detail || 'Failed to fetch payrolls');
        toast.error('Failed to fetch payrolls');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, isHR, handleAuthError]);

  // Initial data load
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchPayrolls();
  }, [fetchPayrolls]);

  // Generate payroll for a specific employee & month
  const handleGeneratePayroll = async () => {
    if (!selectedEmployee) {
      toast.warning('Please select an employee');
      return;
    }
    try {
      await payrollAPI.generate(selectedEmployee as number, selectedMonth.format('YYYY-MM-DD'));
      toast.success('Payroll generated successfully');
      fetchPayrolls();
      setOpenGenerate(false);
      setSelectedEmployee('');
    } catch (err: any) {
      if (err.response?.status === 403) handleAuthError();
      else toast.error(err.response?.data?.detail || 'Generation failed');
    }
  };

  // Mark payroll as paid
  const handleMarkPaid = async (id: number) => {
    try {
      await payrollAPI.markPaid(id);
      toast.success('Marked as paid');
      fetchPayrolls();
    } catch (err: any) {
      if (err.response?.status === 403) handleAuthError();
      else toast.error('Failed to mark as paid');
    }
  };

  // Trigger payslip generation (backend is responsible for PDF creation)
  const handleGeneratePayslip = async (payrollId: number) => {
    try {
      await payslipAPI.generate(payrollId);
      toast.success('Payslip generated successfully');
    } catch (err: any) {
      if (err.response?.status === 403) handleAuthError();
      else toast.error(err.response?.data?.detail || 'Failed to generate payslip');
    }
  };

  // Fetch attendance summary for the selected payroll's employee and month
  const handleViewAttendanceImpact = async (payroll: Payroll) => {
    if (!payroll.employee_id) return;
    try {
      const token = localStorage.getItem('access_token');
      const monthStr = payroll.month;
      const res = await axios.get<AttendanceSummary>(`${API_BASE}/attendance/summary/${payroll.employee_id}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { month: monthStr }
      });
      setAttendanceSummary(res.data);
      setOpenImpactModal(true);
    } catch (err) {
      console.error(err);
      toast.error('Could not fetch attendance summary');
    }
  };

  // Aggregated stats
  const totalEmployeesProcessed = payrolls.length;
  const totalNetSalary = payrolls.reduce((sum, pr) => sum + (Number(pr.net_salary) || 0), 0);
  const pendingPayments = payrolls.filter(pr => pr.status !== 'PAID').length;

  // Reusable stat card
  const StatCard = ({ title, value, icon, color }: any) => (
    <Grow in timeout={500}>
      <Card sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`,
        borderLeft: `4px solid ${color}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: theme.shadows[8] }
      }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography color="textSecondary" gutterBottom variant="overline" fontWeight={600}>
                {title}
              </Typography>
              <Typography variant="h4" fontWeight="bold">{value}</Typography>
            </Box>
            <Box sx={{ bgcolor: alpha(color, 0.1), p: 1, borderRadius: 2 }}>
              {icon}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grow>
  );

  // Loading skeleton while fetching initial data
  if (loading && payrolls.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Skeleton variant="text" width={250} height={50} sx={{ mb: 3 }} />
        <Box display="flex" justifyContent="space-between" mb={3}>
          <Skeleton variant="rectangular" width={200} height={56} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" width={180} height={56} sx={{ borderRadius: 2 }} />
        </Box>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
      </Container>
    );
  }

  // Access denied for non-HR users
  if (!isHR) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <Paper sx={{ p: 5, borderRadius: 3 }}>
          <Warning sx={{ fontSize: 60, color: theme.palette.warning.main, mb: 2 }} />
          <Typography variant="h5" gutterBottom>Access Denied</Typography>
          <Typography variant="body2" color="textSecondary">
            Only HR and Admin users can access payroll.
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 2 }}>
            Your role: <strong>{user?.role || 'Unknown'}</strong>
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Fade in timeout={600}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
            <Typography variant="h4" fontWeight="bold">💰 Payroll Processing</Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <DatePicker
                label="Select Month"
                views={['year', 'month']}
                value={selectedMonth}
                onChange={(newValue) => setSelectedMonth(newValue || dayjs())}
                slotProps={{ textField: { size: 'medium', sx: { minWidth: 180, bgcolor: 'background.paper', borderRadius: 2 } } }}
              />
              <Button
                variant="contained"
                onClick={() => setOpenGenerate(true)}
                sx={{ borderRadius: 2, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }}
              >
                Generate Payroll
              </Button>
            </Box>
          </Box>
        </Fade>

        {apiError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setApiError(null)}>
            {apiError}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Total Processed" value={totalEmployeesProcessed} icon={<People />} color={theme.palette.primary.main} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Total Net Salary" value={formatCurrency(totalNetSalary)} icon={<AttachMoney />} color={theme.palette.success.main} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Pending Payments" value={pendingPayments} icon={<Pending />} color={theme.palette.warning.main} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Month" value={selectedMonth.format('MMMM YYYY')} icon={<Paid />} color={theme.palette.info.main} />
          </Grid>
        </Grid>

        <Grow in timeout={800}>
          <Paper elevation={4} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                    <TableCell><b>Employee</b></TableCell>
                    <TableCell><b>Department</b></TableCell>
                    <TableCell align="right"><b>Earnings</b></TableCell>
                    <TableCell align="right"><b>Deductions</b></TableCell>
                    <TableCell align="right"><b>Net Salary</b></TableCell>
                    <TableCell><b>Status</b></TableCell>
                    <TableCell align="center"><b>Attendance Impact</b></TableCell>
                    <TableCell align="center"><b>Actions</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payrolls.map((pr) => {
                    const emp = employees.find(e => e.id === pr.employee_id);
                    return (
                      <TableRow key={pr.id} hover>
                        <TableCell>{emp?.full_name || 'N/A'}</TableCell>
                        <TableCell>{emp?.department || 'N/A'}</TableCell>
                        <TableCell align="right">{formatCurrency(pr.total_earnings)}</TableCell>
                        <TableCell align="right">{formatCurrency(pr.total_deductions)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                          {formatCurrency(pr.net_salary)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={pr.status}
                            size="small"
                            sx={{
                              bgcolor: pr.status === 'PAID' ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.warning.main, 0.1),
                              color: pr.status === 'PAID' ? theme.palette.success.main : theme.palette.warning.main,
                              fontWeight: 'bold'
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View attendance impact on salary">
                            <IconButton
                              size="small"
                              onClick={() => handleViewAttendanceImpact(pr)}
                              sx={{ color: theme.palette.info.main }}
                            >
                              <Info />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            onClick={() => handleGeneratePayslip(pr.id)}
                            title="Generate Payslip"
                            sx={{ color: theme.palette.error.main }}
                          >
                            <PictureAsPdf />
                          </IconButton>
                          {pr.status !== 'PAID' && (
                            <IconButton
                              onClick={() => handleMarkPaid(pr.id)}
                              title="Mark as Paid"
                              sx={{ color: theme.palette.success.main }}
                            >
                              <Paid />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {payrolls.length === 0 && !loading && !apiError && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Box sx={{ py: 5 }}>
                          <Typography variant="body1" color="textSecondary">
                            No payroll records found for {selectedMonth.format('MMMM YYYY')}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grow>

        {/* Attendance Impact Modal */}
        <Dialog open={openImpactModal} onClose={() => setOpenImpactModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <Typography variant="h6" fontWeight="bold">Attendance Impact on Salary</Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {attendanceSummary ? (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Present Days</Typography>
                  <Typography variant="h6">{attendanceSummary.present_days || 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Absent Days</Typography>
                  <Typography variant="h6">{attendanceSummary.absent_days || 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Half Days</Typography>
                  <Typography variant="h6">{attendanceSummary.half_days || 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Overtime Hours</Typography>
                  <Typography variant="h6">{attendanceSummary.total_overtime_hours || 0}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" fontWeight="bold">Salary Adjustment</Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                    <Typography variant="body2">Absence Deduction:</Typography>
                    <Typography variant="body2" color="error">- {formatCurrency(attendanceSummary.absence_deduction || 0)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                    <Typography variant="body2">Overtime Bonus:</Typography>
                    <Typography variant="body2" color="success.main">+ {formatCurrency(attendanceSummary.overtime_bonus || 0)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={1} pt={1} borderTop={`1px solid ${theme.palette.divider}`}>
                    <Typography variant="body1" fontWeight="bold">Net Adjustment:</Typography>
                    <Typography variant="body1" fontWeight="bold" color={Number(attendanceSummary.net_adjustment) >= 0 ? 'success.main' : 'error.main'}>
                      {formatCurrency(attendanceSummary.net_adjustment || 0)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            ) : (
              <Typography>Loading attendance data...</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenImpactModal(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Generate Payroll Dialog */}
        <Dialog open={openGenerate} onClose={() => setOpenGenerate(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <Typography variant="h6" fontWeight="bold">Generate Payroll</Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3, mt: 1, borderRadius: 2 }}>
              Payroll will be generated for <strong>{selectedMonth.format('MMMM YYYY')}</strong>
            </Alert>
            <FormControl fullWidth>
              <InputLabel>Select Employee</InputLabel>
              <Select
                value={selectedEmployee}
                onChange={e => setSelectedEmployee(e.target.value as number)}
                label="Select Employee"
              >
                {employees.map(emp => (
                  <MenuItem key={emp.id} value={emp.id}>{emp.full_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => { setOpenGenerate(false); setSelectedEmployee(''); }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleGeneratePayroll}>
              Generate
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default PayrollPage;