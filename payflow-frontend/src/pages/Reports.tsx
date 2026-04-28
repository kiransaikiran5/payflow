import React, { useEffect, useState, useCallback } from 'react';
import {
  Container, Typography, Paper, Grid, Box, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Card, CardContent, Skeleton,
  useTheme, alpha, Fade, Grow, Alert, TextField
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { TrendingUp, AttachMoney, PeopleAlt, Business } from '@mui/icons-material';
import { payrollAPI, employeeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Payroll, Employee } from '../types';
import { formatCurrency } from '../utils/currency';
import { toast } from 'react-toastify';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a'];

// Helper to convert any value to number safely
const toNumber = (value: any): number => {
  if (value === undefined || value === null) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? 0 : num;
};

// Aggregate payroll data by month (for bar chart)
const aggregateByMonth = (payrolls: Payroll[]) => {
  const monthMap = new Map<string, { total_earnings: number; total_deductions: number; net_payout: number }>();
  payrolls.forEach(p => {
    const monthKey = p.month; // format: YYYY-MM-DD (first day of month)
    const existing = monthMap.get(monthKey) || { total_earnings: 0, total_deductions: 0, net_payout: 0 };
    monthMap.set(monthKey, {
      total_earnings: existing.total_earnings + toNumber(p.total_earnings),
      total_deductions: existing.total_deductions + toNumber(p.total_deductions),
      net_payout: existing.net_payout + toNumber(p.net_salary),
    });
  });
  return Array.from(monthMap.entries())
    .map(([month, values]) => ({
      month: dayjs(month).format('MMM YYYY'),
      rawMonth: month,
      ...values,
    }))
    .sort((a, b) => dayjs(a.rawMonth).diff(dayjs(b.rawMonth)));
};

const Reports: React.FC = () => {
  const theme = useTheme();
  const { isHR, user } = useAuth();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs().startOf('month'));
  const [filterMonth, setFilterMonth] = useState<string>(''); // for table filter
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!isHR) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [payrollRes, empRes] = await Promise.all([
        payrollAPI.getAll(), // get all payrolls (or with month param if backend supports)
        employeeAPI.getAll(),
      ]);
      setPayrolls(payrollRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Failed to load report data';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [isHR]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Prepare data for bar chart (aggregated by month)
  const monthlyAggregated = aggregateByMonth(payrolls);
  const totalNetPayout = monthlyAggregated.reduce((sum, m) => sum + m.net_payout, 0);
  const totalEarnings = monthlyAggregated.reduce((sum, m) => sum + m.total_earnings, 0);
  const totalDeductions = monthlyAggregated.reduce((sum, m) => sum + m.total_deductions, 0);

  // Department salary distribution (based on employee base salary)
  const deptMap = new Map<string, { total_salary: number; employee_count: number }>();
  employees.forEach(emp => {
    const dept = emp.department?.trim() || 'Unassigned';
    const salary = toNumber(emp.base_salary);
    const existing = deptMap.get(dept) || { total_salary: 0, employee_count: 0 };
    deptMap.set(dept, {
      total_salary: existing.total_salary + salary,
      employee_count: existing.employee_count + 1,
    });
  });
  const departmentData = Array.from(deptMap.entries()).map(([department, values]) => ({
    department,
    total_salary: values.total_salary,
    employee_count: values.employee_count,
  }));
  const totalEmployees = departmentData.reduce((sum, d) => sum + d.employee_count, 0);

  // Filter payrolls for table display (by month if filter applied)
  const filteredPayrolls = filterMonth
    ? payrolls.filter(p => p.month.startsWith(filterMonth))
    : payrolls;

  const StatCard = ({ title, value, icon, color, subtitle }: any) => (
    <Grow in timeout={500}>
      <Card sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 3,
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: theme.shadows[8] }
      }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography color="textSecondary" gutterBottom variant="overline" fontWeight={600}>
                {title}
              </Typography>
              <Typography variant="h4" fontWeight="bold">{value}</Typography>
              {subtitle && <Typography variant="caption" color="textSecondary">{subtitle}</Typography>}
            </Box>
            <Box sx={{ bgcolor: alpha(color, 0.1), p: 1, borderRadius: 2 }}>
              {icon}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grow>
  );

  const LoadingSkeleton = () => (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box mb={3}>
        <Skeleton variant="text" width={250} height={50} />
        <Skeleton variant="text" width={400} height={30} />
      </Box>
      <Grid container spacing={3} mb={3}>
        {[1, 2, 3, 4].map(i => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}><Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} /></Grid>
        <Grid item xs={12} md={5}><Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} /></Grid>
        <Grid item xs={12}><Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} /></Grid>
      </Grid>
    </Container>
  );

  // Access denied for non-HR
  if (!isHR) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <Paper sx={{ p: 5, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom>Access Denied</Typography>
          <Typography variant="body2" color="textSecondary">
            Only HR and Admin users can access reports.
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 2 }}>
            Your role: <strong>{user?.role || 'Unknown'}</strong>
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (loading) return <LoadingSkeleton />;
  if (error) return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;

  const hasPayrollData = payrolls.length > 0;
  const hasEmployees = employees.length > 0;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={4}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>📊 Payroll Reports & Analytics</Typography>
            <Typography variant="body2" color="textSecondary">Real‑time insights into salary distribution and trends</Typography>
          </Box>
          <DatePicker
            label="Select Month"
            views={['year', 'month']}
            value={selectedMonth}
            onChange={(newValue) => setSelectedMonth(newValue || dayjs())}
            slotProps={{ textField: { size: 'medium', sx: { minWidth: 180, bgcolor: 'background.paper', borderRadius: 2 } } }}
          />
        </Box>

        {/* Summary Statistics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Net Payout"
              value={formatCurrency(totalNetPayout)}
              icon={<AttachMoney sx={{ color: theme.palette.success.main }} />}
              color={theme.palette.success.main}
              subtitle="All time"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Earnings"
              value={formatCurrency(totalEarnings)}
              icon={<TrendingUp sx={{ color: theme.palette.primary.main }} />}
              color={theme.palette.primary.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Deductions"
              value={formatCurrency(totalDeductions)}
              icon={<AttachMoney sx={{ color: theme.palette.warning.main }} />}
              color={theme.palette.warning.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Employees"
              value={totalEmployees.toLocaleString()}
              icon={<PeopleAlt sx={{ color: theme.palette.info.main }} />}
              color={theme.palette.info.main}
            />
          </Grid>
        </Grid>

        {!hasPayrollData && !hasEmployees ? (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
            <Business sx={{ fontSize: 60, color: 'action.disabled', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">No data available</Typography>
            <Typography variant="body2" color="textSecondary">Add employees and generate payroll to see reports.</Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {/* Bar Chart */}
            <Grid item xs={12} md={7}>
              <Fade in timeout={800}>
                <Paper sx={{ p: 2, borderRadius: 3, height: 450 }}>
                  <Typography variant="h6" fontWeight="600" gutterBottom>Monthly Payroll Breakdown</Typography>
                  {monthlyAggregated.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="85%">
                      <Typography variant="body2" color="textSecondary">No payroll data yet. Generate payroll to see trends.</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={monthlyAggregated} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                        <XAxis dataKey="month" tick={{ fill: theme.palette.text.secondary }} />
                        <YAxis tickFormatter={(v) => `₹${v / 1000}k`} tick={{ fill: theme.palette.text.secondary }} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 8 }} />
                        <Legend />
                        <Bar dataKey="total_earnings" fill="#3b82f6" name="Earnings" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="total_deductions" fill="#f59e0b" name="Deductions" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="net_payout" fill="#10b981" name="Net Payout" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Paper>
              </Fade>
            </Grid>

            {/* Pie Chart */}
            <Grid item xs={12} md={5}>
              <Fade in timeout={1000}>
                <Paper sx={{ p: 2, borderRadius: 3, height: 450 }}>
                  <Typography variant="h6" fontWeight="600" gutterBottom>Department Salary Distribution</Typography>
                  {departmentData.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="85%">
                      <Typography variant="body2" color="textSecondary">No department data available. Add employees with departments.</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="85%">
                      <PieChart>
                        <Pie
                          data={departmentData}
                          dataKey="total_salary"
                          nameKey="department"
                          cx="50%" cy="50%"
                          innerRadius={60} outerRadius={100}
                          paddingAngle={2}
                          label={({ department, percent }) => `${department} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {departmentData.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} stroke={theme.palette.background.paper} strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Paper>
              </Fade>
            </Grid>

            {/* Filterable Payroll Table */}
            <Grid item xs={12}>
              <Grow in timeout={1200}>
                <Paper sx={{ p: 2, borderRadius: 3, overflow: 'hidden' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
                    <Typography variant="h6" fontWeight="600">Payroll Details</Typography>
                    <TextField
                      type="month"
                      size="small"
                      label="Filter by Month"
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 200 }}
                    />
                  </Box>
                  {filteredPayrolls.length === 0 ? (
                    <Box py={4} textAlign="center">
                      <Typography variant="body2" color="textSecondary">
                        {filterMonth ? 'No payroll records for the selected month.' : 'No payroll records yet.'}
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                          <TableRow>
                            <TableCell><b>Employee</b></TableCell>
                            <TableCell><b>Month</b></TableCell>
                            <TableCell align="right"><b>Earnings</b></TableCell>
                            <TableCell align="right"><b>Deductions</b></TableCell>
                            <TableCell align="right"><b>Net Salary</b></TableCell>
                            <TableCell><b>Status</b></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredPayrolls.map((pr) => {
                            const emp = employees.find(e => e.id === pr.employee_id);
                            const currency = emp?.currency || 'INR';
                            return (
                              <TableRow key={pr.id} hover>
                                <TableCell>{emp?.full_name || `Employee #${pr.employee_id}`}</TableCell>
                                <TableCell>{dayjs(pr.month).format('MMMM YYYY')}</TableCell>
                                <TableCell align="right">{formatCurrency(pr.total_earnings, currency)}</TableCell>
                                <TableCell align="right">{formatCurrency(pr.total_deductions, currency)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                                  {formatCurrency(pr.net_salary, currency)}
                                </TableCell>
                                <TableCell>
                                  <Box
                                    sx={{
                                      display: 'inline-block',
                                      px: 1.5,
                                      py: 0.5,
                                      borderRadius: 2,
                                      bgcolor: pr.status === 'PAID' ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.warning.main, 0.1),
                                      color: pr.status === 'PAID' ? theme.palette.success.main : theme.palette.warning.main,
                                      fontWeight: 500,
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    {pr.status}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Grow>
            </Grid>
          </Grid>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default Reports;