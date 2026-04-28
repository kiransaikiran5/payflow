import React, { useEffect, useState, useCallback } from 'react';
import {
  Container, Typography, Paper, Grid, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel,
  IconButton, Box, CircularProgress, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { componentAPI, employeeSalaryAPI, employeeAPI } from '../services/api';
import { SalaryComponent, EmployeeSalary, Employee } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currency';
import { toast } from 'react-toastify';

const SalaryStructure: React.FC = () => {
  const { isHR, user } = useAuth();
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [employeeSalaries, setEmployeeSalaries] = useState<EmployeeSalary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialogs
  const [openCompDialog, setOpenCompDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [compForm, setCompForm] = useState({
    name: '',
    type: 'EARNING' as 'EARNING' | 'DEDUCTION',
    amount_type: 'FIXED' as 'FIXED' | 'PERCENTAGE',
    value: ''
  });
  const [assignForm, setAssignForm] = useState({ component_id: '' });
  const [submitting, setSubmitting] = useState(false);

  // Helper: safe number conversion
  const toNumber = (value: any): number => {
    if (value === undefined || value === null) return 0;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Fetch master components
  const fetchComponents = useCallback(async () => {
    try {
      const res = await componentAPI.getAll();
      setComponents(res.data || []);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to load components';
      setError(msg);
      toast.error(msg);
    }
  }, []);

  // Fetch all employees
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await employeeAPI.getAll();
      setEmployees(res.data || []);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to load employees';
      setError(msg);
      toast.error(msg);
    }
  }, []);

  // Fetch assigned components for a specific employee
  const fetchEmployeeSalaries = useCallback(async (empId: number) => {
    try {
      const res = await employeeSalaryAPI.getByEmployee(empId);
      setEmployeeSalaries(res.data || []);
    } catch (err: any) {
      toast.error('Failed to load assigned components');
    }
  }, []);

  // Initial load of components and employees (only for HR)
  useEffect(() => {
    if (!isHR) return;
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchComponents(), fetchEmployees()]);
      setLoading(false);
    };
    loadData();
  }, [isHR, fetchComponents, fetchEmployees]);

  // Fetch assignments when selected employee changes
  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeSalaries(selectedEmployee);
    } else {
      setEmployeeSalaries([]);
    }
  }, [selectedEmployee, fetchEmployeeSalaries]);

  // Calculate total salary for the selected employee
  const totalSalary = employeeSalaries.reduce((sum, es) => {
    const component = components.find(c => c.id === es.component_id);
    if (!component) return sum;
    let amount = toNumber(es.amount);
    // For percentage components, recompute using current employee base salary
    if (component.amount_type === 'PERCENTAGE' && selectedEmployee) {
      const emp = employees.find(e => e.id === selectedEmployee);
      if (emp && component.value) {
        amount = (toNumber(component.value) / 100) * toNumber(emp.base_salary);
      }
    }
    return sum + (component.type === 'EARNING' ? amount : -amount);
  }, 0);

  // Add new master salary component
  const handleAddComponent = async () => {
    if (!compForm.name || !compForm.value) {
      toast.warning('Please fill all fields');
      return;
    }
    const valueNum = parseFloat(compForm.value);
    if (isNaN(valueNum) || valueNum <= 0) {
      toast.warning('Value must be a positive number');
      return;
    }
    setSubmitting(true);
    try {
      await componentAPI.create({
        name: compForm.name,
        type: compForm.type,
        amount_type: compForm.amount_type,
        value: valueNum,
      });
      toast.success('Component added successfully');
      setOpenCompDialog(false);
      setCompForm({ name: '', type: 'EARNING', amount_type: 'FIXED', value: '' });
      await fetchComponents();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to add component';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Assign a component to the selected employee
  const handleAssignComponent = async () => {
    if (!selectedEmployee) {
      toast.warning('Please select an employee first');
      return;
    }
    if (!assignForm.component_id) {
      toast.warning('Please select a component');
      return;
    }
    const componentId = Number(assignForm.component_id);
    const component = components.find(c => c.id === componentId);
    if (!component) {
      toast.error('Component not found');
      return;
    }
    const employee = employees.find(e => e.id === selectedEmployee);
    if (!employee) {
      toast.error('Employee not found');
      return;
    }

    // Calculate amount based on component rules
    let amount = 0;
    if (component.amount_type === 'FIXED') {
      amount = component.value;
    } else if (component.amount_type === 'PERCENTAGE') {
      amount = (component.value / 100) * toNumber(employee.base_salary);
    }

    if (amount <= 0) {
      toast.warning('Calculated amount is zero or negative. Check component value or employee base salary.');
      return;
    }

    setSubmitting(true);
    try {
      await employeeSalaryAPI.assign({
        employee_id: selectedEmployee,
        component_id: componentId,
        amount: amount,
      });
      toast.success('Component assigned successfully');
      setOpenAssignDialog(false);
      setAssignForm({ component_id: '' });
      await fetchEmployeeSalaries(selectedEmployee);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to assign component';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Remove an assignment
  const handleRemoveAssignment = async (assignmentId: number) => {
    if (!window.confirm('Remove this component from the employee?')) return;
    setSubmitting(true);
    try {
      await employeeSalaryAPI.remove(assignmentId);
      toast.success('Assignment removed');
      if (selectedEmployee) await fetchEmployeeSalaries(selectedEmployee);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to remove assignment';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Access denied for non-HR
  if (!isHR) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <Paper sx={{ p: 5, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom>Access Denied</Typography>
          <Typography variant="body2" color="textSecondary">
            Only HR and Admin users can manage salary structures.
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 2 }}>
            Your role: <strong>{user?.role || 'Unknown'}</strong>
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (loading && components.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        💰 Salary Structure Management
      </Typography>

      <Grid container spacing={3}>
        {/* Left Column: Master Components List */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="600">Salary Components</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setOpenCompDialog(true)}
                sx={{ borderRadius: 2 }}
              >
                Add Component
              </Button>
            </Box>
            {components.length === 0 ? (
              <Typography color="textSecondary" sx={{ py: 4, textAlign: 'center' }}>
                No components defined. Click "Add Component" to create earning/deduction rules.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell><b>Name</b></TableCell>
                      <TableCell><b>Type</b></TableCell>
                      <TableCell align="right"><b>Value</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {components.map((comp) => (
                      <TableRow key={comp.id} hover>
                        <TableCell>{comp.name}</TableCell>
                        <TableCell>
                          <Chip
                            label={comp.type}
                            size="small"
                            color={comp.type === 'EARNING' ? 'success' : 'error'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {comp.amount_type === 'PERCENTAGE'
                            ? `${comp.value}%`
                            : formatCurrency(comp.value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Employee Assignment */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Assign Components to Employee
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Employee</InputLabel>
              <Select
                value={selectedEmployee || ''}
                onChange={(e) => setSelectedEmployee(e.target.value as number)}
                label="Select Employee"
              >
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.full_name} - {emp.designation || emp.department || 'N/A'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedEmployee && (
              <>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1">
                    Total Salary:{' '}
                    <strong style={{ color: '#2e7d32', fontSize: '1.2rem' }}>
                      {formatCurrency(totalSalary)}
                    </strong>
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => setOpenAssignDialog(true)}
                    sx={{ borderRadius: 2 }}
                  >
                    Assign Component
                  </Button>
                </Box>

                {employeeSalaries.length === 0 ? (
                  <Typography color="textSecondary" sx={{ py: 4, textAlign: 'center' }}>
                    No components assigned to this employee.
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell><b>Component</b></TableCell>
                          <TableCell><b>Type</b></TableCell>
                          <TableCell align="right"><b>Amount</b></TableCell>
                          <TableCell align="center"><b>Action</b></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {employeeSalaries.map((assignment) => {
                          const comp = components.find(c => c.id === assignment.component_id);
                          if (!comp) return null;
                          let displayAmount = toNumber(assignment.amount);
                          if (comp.amount_type === 'PERCENTAGE') {
                            const emp = employees.find(e => e.id === selectedEmployee);
                            if (emp) {
                              displayAmount = (comp.value / 100) * toNumber(emp.base_salary);
                            }
                          }
                          return (
                            <TableRow key={assignment.id} hover>
                              <TableCell>{comp.name}</TableCell>
                              <TableCell>
                                <Chip
                                  label={comp.type}
                                  size="small"
                                  color={comp.type === 'EARNING' ? 'success' : 'error'}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">
                                {comp.type === 'EARNING' ? '+' : '-'} {formatCurrency(displayAmount)}
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemoveAssignment(assignment.id)}
                                  color="error"
                                  disabled={submitting}
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
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog: Add Salary Component */}
      <Dialog open={openCompDialog} onClose={() => setOpenCompDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Add Salary Component</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Component Name"
            margin="normal"
            value={compForm.name}
            onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
            required
            autoFocus
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select
              value={compForm.type}
              onChange={(e) => setCompForm({ ...compForm, type: e.target.value as any })}
              label="Type"
            >
              <MenuItem value="EARNING">Earning (adds to salary)</MenuItem>
              <MenuItem value="DEDUCTION">Deduction (subtracts from salary)</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Amount Type</InputLabel>
            <Select
              value={compForm.amount_type}
              onChange={(e) => setCompForm({ ...compForm, amount_type: e.target.value as any })}
              label="Amount Type"
            >
              <MenuItem value="FIXED">Fixed Amount (₹)</MenuItem>
              <MenuItem value="PERCENTAGE">Percentage of Base Salary</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Value"
            type="number"
            margin="normal"
            value={compForm.value}
            onChange={(e) => setCompForm({ ...compForm, value: e.target.value })}
            required
            helperText={compForm.amount_type === 'PERCENTAGE' ? 'Enter percentage (e.g., 10 for 10%)' : 'Enter fixed amount in ₹'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCompDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddComponent} disabled={submitting}>
            {submitting ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Assign Component to Employee */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Assign Component to Employee</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Component</InputLabel>
            <Select
              value={assignForm.component_id}
              onChange={(e) => setAssignForm({ component_id: e.target.value })}
              label="Component"
            >
              {components.map((comp) => (
                <MenuItem key={comp.id} value={comp.id}>
                  {comp.name} ({comp.type === 'EARNING' ? '➕ Earning' : '➖ Deduction'} • {comp.amount_type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {assignForm.component_id && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {(() => {
                const comp = components.find(c => c.id === Number(assignForm.component_id));
                if (!comp) return null;
                const employee = employees.find(e => e.id === selectedEmployee);
                if (!employee) return 'Select an employee first.';
                if (comp.amount_type === 'FIXED') {
                  return `This will add a fixed amount of ${formatCurrency(comp.value)} to the employee's salary.`;
                } else {
                  const computed = (comp.value / 100) * toNumber(employee.base_salary);
                  return `${comp.value}% of base salary (${formatCurrency(toNumber(employee.base_salary))}) = ${formatCurrency(computed)}.`;
                }
              })()}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAssignComponent}
            disabled={submitting || !assignForm.component_id}
          >
            {submitting ? <CircularProgress size={24} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SalaryStructure;