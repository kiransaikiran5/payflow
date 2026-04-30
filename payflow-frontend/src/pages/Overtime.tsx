import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, TextField, Button, Grid,
  Card, CardContent, Chip, FormControl, InputLabel,
  Select, MenuItem, Stack, Alert, IconButton, Divider
} from '@mui/material';
import {
  Add, Timer, Schedule, Delete
} from '@mui/icons-material';
import { overtimeAPI, employeeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

interface OvertimeRecord {
  id: number;
  employee_id: number;
  hours_worked: number;
  overtime_rate: number;
  total_amount: number;
  month: string;
}

const Overtime: React.FC = () => {
  const { isHR, isAdmin } = useAuth();
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [employees, setEmployees] = useState<{ id: number; full_name: string }[]>([]);
  const [form, setForm] = useState({ employee_id: '', hours_worked: '', overtime_rate: '', month: '' });
  const [loading, setLoading] = useState(false);
  const [formExpanded, setFormExpanded] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await overtimeAPI.getAll();
      setRecords(res.data);
      if (isHR || isAdmin) {
        const empRes = await employeeAPI.getAll();
        setEmployees(empRes.data.map((e: any) => ({ id: e.id, full_name: e.full_name })));
      }
    } catch (err) {
      toast.error('Failed to load overtime data');
    }
  }, [isHR, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setForm({ employee_id: '', hours_worked: '', overtime_rate: '', month: '' });
    setFormExpanded(false);
  };

  const handleSubmit = async () => {
    if (!form.employee_id || !form.hours_worked || !form.overtime_rate || !form.month) {
      toast.warning('Fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await overtimeAPI.create({
        employee_id: Number(form.employee_id),
        hours_worked: parseFloat(form.hours_worked),
        overtime_rate: parseFloat(form.overtime_rate),
        month: form.month,
      });
      toast.success('Overtime recorded');
      resetForm();
      fetchData();
    } catch (err) {
      toast.error('Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (empId: number) =>
    employees.find(e => e.id === empId)?.full_name || `#${empId}`;

  // Build summary cards
  const summaryMap = records.reduce((acc, r) => {
    const key = `${r.month}_${r.employee_id}`;
    if (!acc[key]) acc[key] = { ...r, total: 0 };
    acc[key].total += r.total_amount;
    return acc;
  }, {} as Record<string, OvertimeRecord & { total: number }>);
  const summaryValues = Object.values(summaryMap);
  const totalOvertimeAmount = summaryValues.reduce((sum, s) => sum + s.total, 0);
  const uniqueEmployees = new Set(records.map(r => r.employee_id)).size;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">⏱ Overtime & Extra Pay</Typography>
        {isHR && !formExpanded && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setFormExpanded(true)}
          >
            Record Overtime
          </Button>
        )}
      </Stack>

      {formExpanded && (
        <Card sx={{ mb: 4, boxShadow: 4 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Record Overtime</Typography>
              <IconButton onClick={resetForm}><Delete /></IconButton>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Employee</InputLabel>
                  <Select
                    value={form.employee_id}
                    label="Employee"
                    onChange={e => setForm({ ...form, employee_id: e.target.value })}
                  >
                    {employees.map(e => (
                      <MenuItem key={e.id} value={e.id}>{e.full_name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Month (YYYY-MM)"
                  value={form.month}
                  placeholder="2026-04"
                  onChange={e => setForm({ ...form, month: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Hours Worked"
                  type="number"
                  value={form.hours_worked}
                  onChange={e => setForm({ ...form, hours_worked: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Hourly Rate (₹)"
                  type="number"
                  value={form.overtime_rate}
                  onChange={e => setForm({ ...form, overtime_rate: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button variant="contained" onClick={handleSubmit} disabled={loading} sx={{ width: '100%' }}>
                  {loading ? 'Saving...' : 'Record Overtime'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#f0f7ff', borderLeft: 4, borderColor: 'primary.main' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Overtime Payout</Typography>
              <Typography variant="h5">₹{totalOvertimeAmount.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#f0f7ff', borderLeft: 4, borderColor: 'info.main' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Employees with Overtime</Typography>
              <Typography variant="h5">{uniqueEmployees}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#f0f7ff', borderLeft: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Records</Typography>
              <Typography variant="h5">{records.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Summary by employee/month */}
      {summaryValues.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Overtime Summary by Employee / Month</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1}>
              {summaryValues.map((s, idx) => (
                <Stack key={idx} direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Schedule color="action" />
                    <Typography>{getEmployeeName(s.employee_id)}</Typography>
                    <Chip label={s.month} size="small" variant="outlined" />
                  </Stack>
                  <Typography fontWeight={600}>₹{s.total.toLocaleString()}</Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Detailed Records Cards */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Detailed Overtime Records
      </Typography>
      {records.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>No records yet.</Alert>
      ) : (
        <Grid container spacing={2}>
          {records.map(r => (
            <Grid item xs={12} sm={6} md={4} key={r.id}>
              <Card variant="outlined" sx={{ transition: 'box-shadow 0.3s', '&:hover': { boxShadow: 4 } }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <Timer color="primary" />
                    <Typography variant="subtitle1" fontWeight={500}>
                      {getEmployeeName(r.employee_id)}
                    </Typography>
                    <Chip label={r.month} size="small" sx={{ ml: 'auto' }} />
                  </Stack>
                  <Divider sx={{ mb: 1 }} />
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Hours Worked</Typography>
                      <Typography variant="body2" fontWeight={500}>{r.hours_worked}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Rate (₹/hr)</Typography>
                      <Typography variant="body2" fontWeight={500}>{r.overtime_rate}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Total Amount</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary">
                        ₹{r.total_amount.toLocaleString()}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default Overtime;