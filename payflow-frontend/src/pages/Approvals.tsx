import React, { useEffect, useState, useCallback } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, CircularProgress, Box,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Grid, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Add, Check, Close, HourglassEmpty } from '@mui/icons-material';
import { approvalAPI, payrollAPI, employeeAPI } from '../services/api';
import { PayrollApproval, Payroll, Employee } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { formatCurrency } from '../utils/currency';

const Approvals: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isHR = user?.role === 'HR' || isAdmin;

  const [approvals, setApprovals] = useState<PayrollApproval[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRequestDialog, setOpenRequestDialog] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [selectedPayrollId, setSelectedPayrollId] = useState<number | ''>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [appRes, payRes, empRes] = await Promise.all([
        approvalAPI.getAll(),
        payrollAPI.getAll(),
        employeeAPI.getAll(),
      ]);
      setApprovals(appRes.data);
      setPayrolls(payRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isHR) fetchData();
  }, [isHR, fetchData]);

  const handleRequestApproval = async () => {
    if (!selectedPayrollId || !remarks.trim()) {
      toast.error('Select a payroll and add remarks');
      return;
    }
    try {
      await approvalAPI.create({ payroll_id: selectedPayrollId as number, remarks: remarks.trim() });
      toast.success('Approval requested');
      setOpenRequestDialog(false);
      setSelectedPayrollId('');
      setRemarks('');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to request approval');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await approvalAPI.approve(id);
      toast.success('Payroll approved');
      fetchData();
    } catch (err) {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (id: number) => {
    const rejectRemarks = prompt('Rejection remarks (optional):');
    if (rejectRemarks === null) return;
    try {
      await approvalAPI.reject(id, rejectRemarks);
      toast.success('Payroll rejected');
      fetchData();
    } catch (err) {
      toast.error('Failed to reject');
    }
  };

  const getPayrollDetails = (payrollId: number) =>
    payrolls.find(p => p.id === payrollId);

  const getEmployee = (employeeId: number) =>
    employees.find(e => e.id === employeeId);

  const getCurrency = (employeeId: number) =>
    getEmployee(employeeId)?.currency || 'INR';

  // Filter payrolls that don't already have an approval request
  const payrollsWithoutApproval = payrolls.filter(
    p => !approvals.some(a => a.payroll_id === p.id)
  );

  if (!isHR) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <Paper sx={{ p: 5, borderRadius: 3 }}>
          <Typography variant="h5">Access Denied</Typography>
          <Typography variant="body2" color="textSecondary">
            Only HR/Admin can access approvals.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">✅ Payroll Approvals</Typography>
        {isHR && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenRequestDialog(true)}
          >
            Request Approval
          </Button>
        )}
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Employee</TableCell>
                <TableCell>Month</TableCell>
                <TableCell align="right">Net Salary</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Remarks</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {approvals.map(approval => {
                const payroll = getPayrollDetails(approval.payroll_id);
                const employee = payroll ? getEmployee(payroll.employee_id) : null;
                const currency = payroll ? getCurrency(payroll.employee_id) : 'INR';
                return (
                  <TableRow key={approval.id}>
                    <TableCell>{approval.id}</TableCell>
                    <TableCell>{employee?.full_name || `Emp ID ${payroll?.employee_id}`}</TableCell>
                    <TableCell>{payroll?.month || '—'}</TableCell>
                    <TableCell align="right">
                      {payroll ? formatCurrency(payroll.net_salary, currency) : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={approval.status}
                        color={
                          approval.status === 'APPROVED' ? 'success' :
                          approval.status === 'REJECTED' ? 'error' : 'warning'
                        }
                        icon={approval.status === 'PENDING' ? <HourglassEmpty /> : undefined}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{approval.remarks || '—'}</TableCell>
                    <TableCell>
                      {isAdmin && approval.status === 'PENDING' && (
                        <Box display="flex" gap={1}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<Check />}
                            onClick={() => handleApprove(approval.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<Close />}
                            onClick={() => handleReject(approval.id)}
                          >
                            Reject
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {approvals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">No approval requests yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Request Approval Dialog */}
      <Dialog open={openRequestDialog} onClose={() => setOpenRequestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Payroll Approval</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Payroll</InputLabel>
                <Select
                  value={selectedPayrollId}
                  label="Select Payroll"
                  onChange={(e) => setSelectedPayrollId(e.target.value as number)}
                >
                  {payrollsWithoutApproval.map(payroll => {
                    const emp = getEmployee(payroll.employee_id);
                    return (
                      <MenuItem key={payroll.id} value={payroll.id}>
                        {emp?.full_name || `ID ${payroll.employee_id}`} – {payroll.month} – {formatCurrency(payroll.net_salary, emp?.currency)} 
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Remarks"
                multiline
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRequestDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRequestApproval}>Submit</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Approvals;