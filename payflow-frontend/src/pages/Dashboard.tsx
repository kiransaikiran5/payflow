import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Skeleton,
  useTheme,
  alpha,
  Fade,
  Grow,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  AttachMoney,
  People,
  Assessment,
  Description,
  Refresh,
  MoreVert,
  CalendarToday,
  Work,
  Payment,
  Receipt,
  Business,
  ArrowUpward,
  ArrowDownward,
  Add,
  ThumbUp,
} from '@mui/icons-material';
import { payrollAPI, employeeAPI, approvalAPI, loanAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { Employee, Payroll } from '../types';
import { formatCurrency } from '../utils/currency';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a', '#06b6d4', '#84cc16'];

const toNumber = (value: unknown): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// ------- HR / Admin Dashboard -------
interface HrDashboardProps {
  navigate: ReturnType<typeof useNavigate>;
  handleGeneratePayroll: () => void;
}

const HrDashboard: React.FC<HrDashboardProps> = ({ navigate, handleGeneratePayroll }) => {
  const theme = useTheme();
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [activeLoans, setActiveLoans] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, payrollRes, approvalRes, loanRes] = await Promise.allSettled([
        employeeAPI.getAll(),
        payrollAPI.getAll(),
        isAdmin ? approvalAPI.getAll('PENDING') : Promise.resolve({ data: [] }),
        loanAPI.getAll(undefined, 'ACTIVE'),
      ]);

      const empData = empRes.status === 'fulfilled' ? (empRes.value.data ?? []) : [];
      const payrollData = payrollRes.status === 'fulfilled' ? (payrollRes.value.data ?? []) : [];
      const approvalData = approvalRes.status === 'fulfilled' ? (approvalRes.value.data ?? []) : [];
      const loanData = loanRes.status === 'fulfilled' ? (loanRes.value.data ?? []) : [];

      setEmployees(empData);
      setPayrolls(payrollData);
      setPendingApprovals(approvalData.length);
      setActiveLoans(loanData.length);

      if (empRes.status === 'rejected' || payrollRes.status === 'rejected') {
        setError('Some data failed to load. Please try refreshing.');
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentMonthStr = dayjs().startOf('month').format('YYYY-MM-DD');
  const currentMonthPayrolls = payrolls.filter((p) => p.month === currentMonthStr);
  const monthlyNetPayout = currentMonthPayrolls.reduce((sum, p) => sum + toNumber(p.net_salary), 0);
  const pendingPayslips = payrolls.filter((p) => p.status !== 'PAID').length;
  const totalPaid = payrolls
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + toNumber(p.net_salary), 0);
  const totalEmployees = employees.length;

  // Department salary breakdown
  const deptMap = new Map<string, number>();
  employees.forEach((emp) => {
    const dept = emp.department?.trim() || 'Unassigned';
    const salary = toNumber(emp.base_salary);
    deptMap.set(dept, (deptMap.get(dept) || 0) + salary);
  });
  const departmentBreakdown = Array.from(deptMap.entries()).map(([department, total_salary]) => ({
    department,
    total_salary,
  }));

  // Last 6 months trend
  const last6Months = Array.from({ length: 6 }, (_, i) =>
    dayjs().subtract(5 - i, 'month').startOf('month').format('YYYY-MM-DD')
  );
  const trend = last6Months.map((month) => ({
    month: dayjs(month).format('MMM YYYY'),
    net_payout: payrolls
      .filter((p) => p.month === month)
      .reduce((sum, p) => sum + toNumber(p.net_salary), 0),
  }));

  // Recent 5 payrolls
  const recentPayroll = [...payrolls]
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 5);

  const handleRefresh = () => fetchData();
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  // Reusable stat card
  const StatCard = ({ title, value, icon, color, trendDirection, trendValue, subtitle, onClick }: any) => (
    <Grow in timeout={500}>
      <Card
        sx={{
          height: '100%',
          background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
          borderLeft: `4px solid ${color}`,
          borderRadius: 3,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: onClick ? 'translateY(-8px)' : 'none',
            boxShadow: onClick ? `0 12px 24px -8px ${color}40` : theme.shadows[1],
          },
        }}
        onClick={onClick}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="overline" fontWeight={600} color="textSecondary">
                {title}
              </Typography>
              <Typography variant="h4" fontWeight="800" sx={{ mt: 0.5 }}>
                {value}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="textSecondary">
                  {subtitle}
                </Typography>
              )}
              {trendDirection && (
                <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                  {trendDirection === 'up' ? (
                    <ArrowUpward sx={{ fontSize: 14, color: 'success.main' }} />
                  ) : (
                    <ArrowDownward sx={{ fontSize: 14, color: 'error.main' }} />
                  )}
                  <Typography
                    variant="caption"
                    fontWeight={500}
                    color={trendDirection === 'up' ? 'success.main' : 'error.main'}
                  >
                    {trendValue}
                  </Typography>
                </Box>
              )}
            </Box>
            <Avatar sx={{ bgcolor: alpha(color, 0.15), width: 48, height: 48 }}>
              {icon}
            </Avatar>
          </Box>
        </CardContent>
      </Card>
    </Grow>
  );

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        <Skeleton variant="text" width={350} height={60} sx={{ mb: 3 }} />
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
          </Grid>
          <Grid item xs={12}>
            <Skeleton variant="rectangular" height={350} sx={{ borderRadius: 3 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  const hasPayrollData = payrolls.length > 0;
  const hasEmployees = employees.length > 0;

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Fade in timeout={600}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
          mb={4}
        >
          <Box>
            <Typography variant="h4" fontWeight="800" gutterBottom>
              Payroll Dashboard
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Here's what's happening with your payroll today.
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={handleRefresh} sx={{ borderRadius: 2 }}>
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleGeneratePayroll}
              sx={{
                borderRadius: 2,
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              }}
            >
              Generate Payroll
            </Button>
            <IconButton onClick={handleMenuOpen}>
              <MoreVert />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={() => { navigate('/payroll'); handleMenuClose(); }}>View Payroll</MenuItem>
              <MenuItem onClick={() => { navigate('/employees'); handleMenuClose(); }}>Manage Employees</MenuItem>
              <Divider />
              <MenuItem onClick={handleMenuClose}>Export Summary</MenuItem>
            </Menu>
          </Box>
        </Box>
      </Fade>

      {/* Stats Cards – first row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Employees"
            value={totalEmployees.toLocaleString()}
            icon={<People />}
            color={theme.palette.primary.main}
            trendDirection="up"
            trendValue="+12%"
            subtitle="Active workforce"
            onClick={() => navigate('/employees')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Monthly Net Payout"
            value={monthlyNetPayout === 0 ? '—' : `₹${monthlyNetPayout.toLocaleString()}`}
            icon={<AttachMoney />}
            color={theme.palette.success.main}
            trendDirection={monthlyNetPayout > 0 ? 'up' : undefined}
            trendValue={monthlyNetPayout > 0 ? '+8%' : undefined}
            subtitle={monthlyNetPayout === 0 ? 'No payroll this month' : 'Current month'}
            onClick={() => navigate('/payroll')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Payslips"
            value={pendingPayslips}
            icon={<Receipt />}
            color={theme.palette.warning.main}
            trendDirection={pendingPayslips > 0 ? 'down' : 'up'}
            trendValue={pendingPayslips > 0 ? `${pendingPayslips} pending` : 'All paid'}
            subtitle="Awaiting payment"
            onClick={() => navigate('/payslips')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Paid (YTD)"
            value={totalPaid === 0 ? '—' : `₹${totalPaid.toLocaleString()}`}
            icon={<Payment />}
            color={theme.palette.info.main}
            subtitle="Year-to-date"
          />
        </Grid>
      </Grid>

      {/* Stats Cards – second row (Phase 2 additions) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {isAdmin && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pending Approvals"
              value={pendingApprovals}
              icon={<ThumbUp />}
              color={theme.palette.error.main}
              subtitle="Awaiting review"
              onClick={() => navigate('/approvals')}
            />
          </Grid>
        )}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Loans"
            value={activeLoans}
            icon={<Payment />}
            color={theme.palette.secondary.main}
            subtitle="Currently active"
            onClick={() => navigate('/loans')}
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={7}>
          <Grow in timeout={800}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                borderRadius: 4,
                height: 450,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: theme.shadows[8] },
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="700">
                  Payroll Trend (Monthly)
                </Typography>
                <Chip label="Last 6 months" size="small" icon={<CalendarToday />} variant="outlined" />
              </Box>
              {!hasPayrollData || trend.every((t) => t.net_payout === 0) ? (
                <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="85%">
                  <Business sx={{ fontSize: 48, color: 'action.disabled', mb: 1 }} />
                  <Typography variant="body2" color="textSecondary">
                    No payroll data to display.
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={trend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="month" tick={{ fill: theme.palette.text.secondary }} />
                    <YAxis tickFormatter={(v) => `₹${v / 1000}k`} tick={{ fill: theme.palette.text.secondary }} />
                    <RechartsTooltip
                      formatter={(value: number) => `₹${value.toLocaleString()}`}
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: theme.shadows[2] }}
                    />
                    <Legend />
                    <Bar dataKey="net_payout" fill="#10b981" name="Net Payout" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grow>
        </Grid>

        <Grid item xs={12} md={5}>
          <Grow in timeout={1000}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 4, height: 450 }}>
              <Typography variant="h6" fontWeight="700" gutterBottom>
                Department Salary Distribution
              </Typography>
              {!hasEmployees || departmentBreakdown.length === 0 ? (
                <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="85%">
                  <Work sx={{ fontSize: 48, color: 'action.disabled', mb: 1 }} />
                  <Typography variant="body2" color="textSecondary">
                    No employee or department data.
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie
                      data={departmentBreakdown}
                      dataKey="total_salary"
                      nameKey="department"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      label={({ department, percent }) => `${department} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {departmentBreakdown.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke={theme.palette.background.paper}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => `₹${value.toLocaleString()}`}
                      contentStyle={{ borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grow>
        </Grid>
      </Grid>

      {/* Recent Payrolls Table */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Grow in timeout={1200}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 4, overflow: 'hidden' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="700">
                  Recent Payroll Runs
                </Typography>
                <Button variant="outlined" onClick={() => navigate('/payroll')} sx={{ borderRadius: 2 }}>
                  View All
                </Button>
              </Box>
              {!hasPayrollData ? (
                <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" py={5}>
                  <Receipt sx={{ fontSize: 48, color: 'action.disabled', mb: 1 }} />
                  <Typography variant="body2" color="textSecondary" mb={2}>
                    No payroll runs found.
                  </Typography>
                  <Button variant="contained" startIcon={<Add />} onClick={handleGeneratePayroll}>
                    Generate Payroll
                  </Button>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                        <TableCell><b>Month</b></TableCell>
                        <TableCell align="right"><b>Earnings</b></TableCell>
                        <TableCell align="right"><b>Deductions</b></TableCell>
                        <TableCell align="right"><b>Net Salary</b></TableCell>
                        <TableCell align="center"><b>Status</b></TableCell>
                        <TableCell align="center"><b>Actions</b></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentPayroll.map((payroll) => (
                        <TableRow key={payroll.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <CalendarToday fontSize="small" color="action" />
                              <Typography fontWeight={500}>{dayjs(payroll.month).format('MMMM YYYY')}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">₹{toNumber(payroll.total_earnings).toLocaleString()}</TableCell>
                          <TableCell align="right">₹{toNumber(payroll.total_deductions).toLocaleString()}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                            ₹{toNumber(payroll.net_salary).toLocaleString()}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={payroll.status}
                              size="small"
                              sx={{
                                bgcolor:
                                  payroll.status === 'PAID'
                                    ? alpha(theme.palette.success.main, 0.1)
                                    : alpha(theme.palette.warning.main, 0.1),
                                color:
                                  payroll.status === 'PAID'
                                    ? theme.palette.success.main
                                    : theme.palette.warning.main,
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={() => navigate(`/payroll/${payroll.id}`)}>
                                <Receipt fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grow>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{ borderRadius: 3, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' } }}
            onClick={handleGeneratePayroll}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                  <Payment />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>Generate Payroll</Typography>
                  <Typography variant="caption" color="textSecondary">Process salaries for this month</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{ borderRadius: 3, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' } }}
            onClick={() => navigate('/employees')}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}>
                  <People />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>Manage Employees</Typography>
                  <Typography variant="caption" color="textSecondary">Add, edit, or remove employees</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{ borderRadius: 3, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' } }}
            onClick={() => navigate('/reports')}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main }}>
                  <Assessment />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>View Reports</Typography>
                  <Typography variant="caption" color="textSecondary">Analytics and insights</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{ borderRadius: 3, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' } }}
            onClick={() => navigate('/payslips')}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}>
                  <Description />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>Payslips</Typography>
                  <Typography variant="caption" color="textSecondary">Download or generate payslips</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

// ------- Employee Dashboard -------
const EmployeeDashboard: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [latestPayroll, setLatestPayroll] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        const empRes = await employeeAPI.getMe();
        const payrollRes = await payrollAPI.getAll();
        if (!cancelled) {
          setEmployee(empRes.data);
          const myPayroll = payrollRes.data
            .filter((p: Payroll) => p.employee_id === empRes.data.id)
            .sort((a, b) => (b.month > a.month ? 1 : -1))[0];
          setLatestPayroll(myPayroll || null);
        }
      } catch (err) {
        console.error('Employee dashboard error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  const currency = employee?.currency || 'INR';
  const net = toNumber(latestPayroll?.net_salary);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Welcome, {employee?.full_name || user?.username} 👋
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="600" gutterBottom>
                My Profile
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Department: {employee?.department || '—'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Designation: {employee?.designation || '—'}
              </Typography>
              <Typography variant="body2" color="textSecondary" mt={1}>
                Base Salary: {formatCurrency(employee?.base_salary || 0, currency)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Currency: {currency}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Latest Payroll
              </Typography>
              {latestPayroll ? (
                <>
                  <Typography variant="body2" color="textSecondary">
                    Month: {dayjs(latestPayroll.month).format('MMMM YYYY')}
                  </Typography>
                  <Typography variant="h5" fontWeight="700" sx={{ mt: 1, color: 'success.main' }}>
                    Net Salary: {formatCurrency(net, currency)}
                  </Typography>
                  <Chip
                    label={latestPayroll.status}
                    size="small"
                    sx={{ mt: 1, fontWeight: 500 }}
                    color={latestPayroll.status === 'PAID' ? 'success' : 'warning'}
                  />
                </>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No payroll data available yet.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

// ------- Main Dashboard -------
const Dashboard: React.FC = () => {
  const { isHR } = useAuth();
  const navigate = useNavigate();

  const handleGeneratePayroll = () => navigate('/payroll');

  if (isHR) {
    return <HrDashboard navigate={navigate} handleGeneratePayroll={handleGeneratePayroll} />;
  }
  return <EmployeeDashboard navigate={navigate} />;
};

export default Dashboard;