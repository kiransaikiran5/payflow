import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Paper, Grid, Box, Card, CardContent, Skeleton
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList
} from 'recharts';
import { People, AttachMoney, Receipt, Work } from '@mui/icons-material';
import { analyticsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

interface AnalyticsData {
  total_employees: number;
  current_month_payroll: number;
  pending_payslips: number;
  total_overtime_this_month: number;
  total_bonuses_this_month: number;
  department_breakdown: { department: string; total_salary: number; employee_count: number; avg_salary: number }[];
  payroll_trend: { month: string; net_payout: number; total_overtime: number; total_bonuses: number }[];
  overtime_analysis: { month: string; total_hours: number; total_amount: number; employee_count: number }[];
  bonus_distribution: { month: string; total_bonus: number; employee_count: number }[];
  employee_cost: { department: string; total_salary: number; total_overtime: number; total_bonuses: number; total_cost: number }[];
}

const KpiCard = ({ title, value, icon, color }: any) => (
  <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="subtitle2" color="textSecondary">{title}</Typography>
          <Typography variant="h5" fontWeight="bold">{value}</Typography>
        </Box>
        <Box sx={{ color }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

const Analytics: React.FC = () => {
  const { isHR } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await analyticsAPI.getDashboard();   // GET /api/analytics/
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (isHR) fetchData();
  }, [isHR]);

  if (!isHR) return <Typography>Access Denied</Typography>;
  if (loading) return <Skeleton variant="rectangular" height={400} />;
  if (!data) return <Typography>No data available</Typography>;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">📊 Advanced Payroll Analytics</Typography>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={2.4}>
          <KpiCard title="Total Employees" value={data.total_employees} icon={<People />} color="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KpiCard title="Monthly Payroll" value={`₹${data.current_month_payroll.toLocaleString()}`} icon={<AttachMoney />} color="success.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KpiCard title="Pending Payslips" value={data.pending_payslips} icon={<Receipt />} color="warning.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KpiCard title="Overtime (Month)" value={`₹${data.total_overtime_this_month.toLocaleString()}`} icon={<Work />} color="info.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KpiCard title="Bonuses (Month)" value={`₹${data.total_bonuses_this_month.toLocaleString()}`} icon={<AttachMoney />} color="secondary.main" />
        </Grid>
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Payroll Trend (Bar) */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" mb={2}>Payroll & Overtime Trend (6 months)</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={data.payroll_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="net_payout" fill="#8884d8" name="Net Payout" />
                <Bar dataKey="total_overtime" fill="#82ca9d" name="Overtime" />
                <Bar dataKey="total_bonuses" fill="#ffc658" name="Bonuses" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Department Distribution (Pie) */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" mb={2}>Department Salary Share</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={data.department_breakdown} dataKey="total_salary" nameKey="department" outerRadius={80} label>
                  {data.department_breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Employee Cost Analysis (Stacked Bar) – Enhanced */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: 450 }}>
            <Typography variant="h6" mb={2}>Employee Cost Analysis by Department</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart
                data={data.employee_cost}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis type="number" tick={{ fill: '#666' }} />
                <YAxis type="category" dataKey="department" tick={{ fill: '#333', fontSize: 13 }} width={120} />
                <Tooltip
                  formatter={(value: number) => `₹${value.toLocaleString()}`}
                  contentStyle={{ borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}
                />
                <Legend iconType="circle" />
                <Bar
                  dataKey="total_salary"
                  stackId="a"
                  fill="#4A90D9"
                  name="Base Salary"
                  radius={[0, 0, 4, 4]}
                  barSize={28}
                >
                  <LabelList
                    dataKey="total_salary"
                    position="inside"
                    formatter={(val: number) => `₹${(val / 1000).toFixed(0)}k`}
                    style={{ fill: '#fff', fontSize: 11, fontWeight: 500 }}
                  />
                </Bar>
                <Bar
                  dataKey="total_overtime"
                  stackId="a"
                  fill="#50B86C"
                  name="Overtime"
                  barSize={28}
                >
                  <LabelList
                    dataKey="total_overtime"
                    position="inside"
                    formatter={(val: number) => `₹${(val / 1000).toFixed(0)}k`}
                    style={{ fill: '#fff', fontSize: 11, fontWeight: 500 }}
                  />
                </Bar>
                <Bar
                  dataKey="total_bonuses"
                  stackId="a"
                  fill="#FFB84D"
                  name="Bonuses"
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                >
                  <LabelList
                    dataKey="total_bonuses"
                    position="inside"
                    formatter={(val: number) => `₹${(val / 1000).toFixed(0)}k`}
                    style={{ fill: '#fff', fontSize: 11, fontWeight: 500 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Analytics;