import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem
} from '@mui/material';
import { Add, Payment } from '@mui/icons-material';
import { loanAPI, employeeAPI } from '../services/api';
import { Loan, Employee } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Loans: React.FC = () => {
  const { isHR } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [openApply, setOpenApply] = useState(false);
  const [form, setForm] = useState({ employee_id: '', loan_amount: '', installment_amount: '' });

  useEffect(() => {
    fetchLoans();
    if (isHR) employeeAPI.getAll().then(res => setEmployees(res.data));
  }, [isHR]);

  const fetchLoans = async () => {
    const res = await loanAPI.getAll();
    setLoans(res.data);
  };

  const handleApply = async () => {
    try {
      await loanAPI.create({
        employee_id: parseInt(form.employee_id),
        loan_amount: parseFloat(form.loan_amount),
        installment_amount: parseFloat(form.installment_amount)
      });
      toast.success('Loan created');
      setOpenApply(false);
      fetchLoans();
    } catch (e) {
      toast.error('Failed to create loan');
    }
  };

  const handleRepay = async (loanId: number) => {
    try {
      await loanAPI.repay(loanId);
      toast.success('Installment repaid');
      fetchLoans();
    } catch (e) {
      toast.error('Repayment failed');
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>Loan Management</Typography>
      {isHR && <Button variant="contained" startIcon={<Add />} onClick={() => setOpenApply(true)} sx={{ mb: 2 }}>New Loan</Button>}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell align="right">Loan Amount</TableCell>
              <TableCell align="right">Remaining</TableCell>
              <TableCell align="right">Installment</TableCell>
              <TableCell>Status</TableCell>
              {isHR && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loans.map(loan => {
              const emp = employees.find(e => e.id === loan.employee_id);
              return (
                <TableRow key={loan.id}>
                  <TableCell>{emp?.full_name || loan.employee_id}</TableCell>
                  <TableCell align="right">₹{loan.loan_amount.toLocaleString()}</TableCell>
                  <TableCell align="right">₹{loan.remaining_amount.toLocaleString()}</TableCell>
                  <TableCell align="right">₹{loan.installment_amount.toLocaleString()}</TableCell>
                  <TableCell>{loan.status}</TableCell>
                  {isHR && (
                    <TableCell>
                      {loan.status === 'ACTIVE' && (
                        <IconButton onClick={() => handleRepay(loan.id)} title="Repay"><Payment /></IconButton>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openApply} onClose={() => setOpenApply(false)}>
        <DialogTitle>Apply Loan</DialogTitle>
        <DialogContent>
          <TextField select fullWidth label="Employee" margin="dense" value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})}>
            {employees.map(emp => <MenuItem key={emp.id} value={emp.id}>{emp.full_name}</MenuItem>)}
          </TextField>
          <TextField fullWidth label="Loan Amount" type="number" margin="dense" value={form.loan_amount} onChange={e => setForm({...form, loan_amount: e.target.value})} />
          <TextField fullWidth label="Monthly Installment" type="number" margin="dense" value={form.installment_amount} onChange={e => setForm({...form, installment_amount: e.target.value})} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenApply(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleApply}>Apply</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Loans;