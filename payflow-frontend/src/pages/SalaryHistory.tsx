import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Box,
  FormControl, InputLabel, Select, MenuItem, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { employeeAPI, salaryHistoryAPI } from '../services/api';
import type { SalaryHistory } from '../types';       // type‑only import
import { Employee } from '../types';                 // keep as regular import
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

const SalaryHistoryPage = () => {
  const { user } = useAuth();
  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
  const [history, setHistory] = useState<SalaryHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    new_salary: '',
    effective_date: dayjs().format('YYYY-MM-DD')
  });

  useEffect(() => {
    if (isHR) fetchEmployees();
  }, [isHR]);

  useEffect(() => {
    if (selectedEmployee) fetchHistory(selectedEmployee as number);
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getAll();
      setEmployees(res.data);
    } catch {
      toast.error('Failed to load employees');
    }
  };

  const fetchHistory = async (employeeId: number) => {
    setLoading(true);
    try {
      const res = await salaryHistoryAPI.getByEmployee(employeeId);
      setHistory(res.data);
    } catch {
      toast.error('Failed to load salary history');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRevision = async () => {
    if (!selectedEmployee || !formData.new_salary) return;
    try {
      const employee = employees.find(e => e.id === selectedEmployee);
      await salaryHistoryAPI.recordChange({
        employee_id: selectedEmployee as number,
        new_salary: parseFloat(formData.new_salary),
        effective_date: formData.effective_date,
        old_salary: employee?.base_salary
      });
      toast.success('Salary revision recorded');
      fetchHistory(selectedEmployee as number);
      fetchEmployees(); // update base salary in list
      setOpenDialog(false);
    } catch {
      toast.error('Failed to record revision');
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>Salary History</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 250 }}>
          <InputLabel>Select Employee</InputLabel>
          <Select
            value={selectedEmployee}
            label="Select Employee"
            onChange={(e) => setSelectedEmployee(e.target.value as number)}
          >
            {employees.map(emp => (
              <MenuItem key={emp.id} value={emp.id}>{emp.full_name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {isHR && selectedEmployee && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
            New Revision
          </Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell align="right">Old Salary</TableCell>
                <TableCell align="right">New Salary</TableCell>
                <TableCell align="right">Change</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map(h => (
                <TableRow key={h.id}>
                  <TableCell>{dayjs(h.effective_date).format('DD/MM/YYYY')}</TableCell>
                  <TableCell align="right">
                    ₹{(h.old_salary ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">₹{h.new_salary.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ color: h.new_salary > (h.old_salary ?? 0) ? 'green' : 'red' }}>
                    {h.old_salary != null
                      ? `${h.new_salary > h.old_salary ? '+' : ''}₹${(h.new_salary - h.old_salary).toLocaleString()}`
                      : 'Initial'}
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && selectedEmployee && (
                <TableRow>
                  <TableCell colSpan={4} align="center">No history found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Record Salary Revision</DialogTitle>
        <DialogContent>
          <TextField
            label="New Salary"
            type="number"
            fullWidth
            margin="dense"
            value={formData.new_salary}
            onChange={(e) => setFormData({ ...formData, new_salary: e.target.value })}
          />
          <TextField
            label="Effective Date"
            type="date"
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
            value={formData.effective_date}
            onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddRevision}>Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SalaryHistoryPage;