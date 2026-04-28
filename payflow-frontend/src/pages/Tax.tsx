import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Button,
  Box, CircularProgress, InputAdornment, Alert
} from '@mui/material';
import { Edit, Save } from '@mui/icons-material';
import { employeeAPI } from '../services/api';
import { Employee } from '../types';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

interface EmployeeWithTax extends Employee {
  tax_percentage?: number;
}

const Tax: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeWithTax[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithTax | null>(null);
  const [taxPercentage, setTaxPercentage] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const empRes = await employeeAPI.getAll();
      const employees = empRes.data;

      // Fetch tax info for each employee
      const employeesWithTax = await Promise.all(
        employees.map(async (emp) => {
          try {
            const taxRes = await axios.get(`${API_BASE}/tax/employee/${emp.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            return { ...emp, tax_percentage: taxRes.data.tax_percentage };
          } catch {
            return { ...emp, tax_percentage: 0 };
          }
        })
      );
      setEmployees(employeesWithTax);
    } catch (err) {
      setError('Failed to load tax data');
      toast.error('Failed to load tax data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = (employee: EmployeeWithTax) => {
    setSelectedEmployee(employee);
    setTaxPercentage(employee.tax_percentage?.toString() || '0');
    setOpenDialog(true);
  };

  const handleSaveTax = async () => {
    if (!selectedEmployee) return;
    try {
      const token = localStorage.getItem('access_token');
      await axios.put(
        `${API_BASE}/tax/employee/${selectedEmployee.id}`,
        { tax_percentage: parseFloat(taxPercentage) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Tax percentage updated for ${selectedEmployee.full_name}`);
      setOpenDialog(false);
      // Refresh the list to show updated value
      await fetchData();
    } catch (err) {
      toast.error('Failed to update tax');
    }
  };

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>Tax Management</Typography>
      
      <Paper sx={{ mt: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Designation</TableCell>
                <TableCell align="right">Base Salary (Monthly)</TableCell>
                <TableCell align="right">Annual Salary</TableCell>
                <TableCell align="right">Tax Percentage</TableCell>
                <TableCell align="right">Monthly Tax</TableCell>
                <TableCell align="right">Annual Tax</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map(emp => {
                const annualSalary = emp.base_salary * 12;
                const taxPercent = emp.tax_percentage || 0;
                const monthlyTax = (emp.base_salary * taxPercent) / 100;
                const annualTax = monthlyTax * 12;
                
                return (
                  <TableRow key={emp.id}>
                    <TableCell>{emp.full_name}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>{emp.designation}</TableCell>
                    <TableCell align="right">{formatCurrency(emp.base_salary)}</TableCell>
                    <TableCell align="right">{formatCurrency(annualSalary)}</TableCell>
                    <TableCell align="right">{taxPercent}%</TableCell>
                    <TableCell align="right">{formatCurrency(monthlyTax)}</TableCell>
                    <TableCell align="right">{formatCurrency(annualTax)}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpenDialog(emp)}>
                        <Edit />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Edit Tax Percentage - {selectedEmployee?.full_name}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tax Percentage"
            type="number"
            fullWidth
            value={taxPercentage}
            onChange={(e) => setTaxPercentage(e.target.value)}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
              inputProps: { min: 0, max: 30, step: 0.5 }
            }}
            helperText="Enter tax percentage (0-30%)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveTax} variant="contained" startIcon={<Save />}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Tax;