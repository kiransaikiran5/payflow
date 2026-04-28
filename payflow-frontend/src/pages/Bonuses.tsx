import React, { useEffect, useState, useCallback } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, CircularProgress, Box, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Grid, FormControl,
  InputLabel, Select, MenuItem, Alert
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { bonusAPI, employeeAPI } from '../services/api';
import { Bonus, Employee } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currency';
import { toast } from 'react-toastify';

const Bonuses: React.FC = () => {
  const { user, isHR } = useAuth();
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    bonus_amount: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isHR) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [empRes, bonusRes] = await Promise.all([
        employeeAPI.getAll(),
        bonusAPI.getAll()
      ]);
      setEmployees(empRes.data || []);
      setBonuses(bonusRes.data || []);
    } catch (err: any) {
      console.error('Failed to fetch bonuses data:', err);
      const msg = err.response?.data?.detail || 'Failed to load bonuses';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [isHR]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddBonus = async () => {
    // Validation
    if (!form.employee_id) {
      toast.warning('Please select an employee');
      return;
    }
    const amount = parseFloat(form.bonus_amount);
    if (isNaN(amount) || amount <= 0) {
      toast.warning('Please enter a valid bonus amount');
      return;
    }

    setSubmitting(true);
    try {
      await bonusAPI.create({
        employee_id: Number(form.employee_id),
        bonus_amount: amount,
        reason: form.reason.trim() || undefined,
      });
      toast.success('Bonus added successfully');
      setOpenDialog(false);
      setForm({ employee_id: '', bonus_amount: '', reason: '' });
      fetchData(); // refresh the list
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to add bonus';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this bonus?')) return;
    try {
      await bonusAPI.delete(id);
      toast.success('Bonus deleted');
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to delete bonus';
      toast.error(msg);
    }
  };

  // Helper to get employee currency
  const getEmployeeCurrency = (empId: number): string => {
    const emp = employees.find(e => e.id === empId);
    return emp?.currency || 'INR';
  };

  // Access denied for non-HR users
  if (!isHR) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <Paper sx={{ p: 5, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom>Access Denied</Typography>
          <Typography variant="body2" color="textSecondary">
            Only HR and Admin users can manage bonuses.
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 2 }}>
            Your role: <strong>{user?.role || 'Unknown'}</strong>
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">🎁 Bonuses & Incentives</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          Add Bonus
        </Button>
      </Box>

      {bonuses.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No bonuses have been added yet.
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Click "Add Bonus" to reward an employee.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell><b>Employee</b></TableCell>
                <TableCell align="right"><b>Amount</b></TableCell>
                <TableCell><b>Reason</b></TableCell>
                <TableCell><b>Date</b></TableCell>
                <TableCell align="center"><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bonuses.map((bonus) => {
                const employee = employees.find(e => e.id === bonus.employee_id);
                const currency = getEmployeeCurrency(bonus.employee_id);
                return (
                  <TableRow key={bonus.id} hover>
                    <TableCell>{employee?.full_name || `Employee #${bonus.employee_id}`}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                      {formatCurrency(bonus.bonus_amount, currency)}
                    </TableCell>
                    <TableCell>{bonus.reason || '—'}</TableCell>
                    <TableCell>
                      {bonus.created_at
                        ? new Date(bonus.created_at).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(bonus.id)}
                        color="error"
                        title="Delete bonus"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Bonus Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Add New Bonus
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Employee</InputLabel>
                <Select
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  label="Employee"
                >
                  {employees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.full_name} {emp.department ? `(${emp.department})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bonus Amount"
                type="number"
                required
                value={form.bonus_amount}
                onChange={(e) => setForm({ ...form, bonus_amount: e.target.value })}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                helperText="Enter a positive amount"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason (Optional)"
                multiline
                rows={2}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g., Performance bonus, Festival bonus, Referral reward"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddBonus}
            disabled={submitting || !form.employee_id || !form.bonus_amount}
          >
            {submitting ? <CircularProgress size={24} /> : 'Add Bonus'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Bonuses;