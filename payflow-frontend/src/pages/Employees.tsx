import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Button,
  Paper,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  Snackbar,
  useTheme,
  alpha,
  Fade,
  Grow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Add, Edit, Delete, Close, Warning } from '@mui/icons-material';
import { employeeAPI } from '../services/api';
import { Employee } from '../types';
import { useAuth } from '../context/AuthContext';

// ---------- Currency helpers ----------
const SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * Safely extract the currency code (string) from any representation:
 * - plain string: "USD" → "USD"
 * - object: { code: "USD" } → "USD"
 * - object: { name: "EUR" } → "EUR"
 */
const getCurrencyCode = (value: any): string => {
  if (!value) return 'INR';
  if (typeof value === 'string') return value.trim().toUpperCase() || 'INR';
  if (typeof value === 'object') {
    const code =
      value.code ||
      value.name ||
      value.currency ||
      value.symbol;
    if (typeof code === 'string') return code.trim().toUpperCase();
  }
  return 'INR';
};

const formatCurrency = (amount: number, currencyCode: string = 'INR') => {
  const sym = SYMBOLS[currencyCode] || currencyCode + ' ';
  return `${sym}${amount.toLocaleString()}`;
};

// ---------- Component ----------
const Employees: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
    designation: '',
    base_salary: '',
    bank_account_number: '',
    tax_id: '',
    currency: 'INR',
  });
  const [formErrors, setFormErrors] = useState({
    full_name: '',
    department: '',
    designation: '',
    base_salary: '',
    bank_account_number: '',
  });

  const getErrorMessage = (err: any): string => {
    if (err.response?.data?.detail) {
      const detail = err.response.data.detail;
      if (Array.isArray(detail)) return detail.map((e: any) => e.msg).join(', ');
      return detail;
    }
    if (err.message) return err.message;
    return 'An unexpected error occurred';
  };

  const fetchEmployees = useCallback(async () => {
    if (!isHR) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await employeeAPI.getAll();
      setEmployees(res.data || []);
    } catch (err) {
      setSnackbar({ open: true, message: getErrorMessage(err), severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [isHR]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const validateForm = () => {
    const errors = {
      full_name: !formData.full_name.trim() ? 'Full name is required' : '',
      department: !formData.department.trim() ? 'Department is required' : '',
      designation: !formData.designation.trim() ? 'Designation is required' : '',
      base_salary: !formData.base_salary || parseFloat(formData.base_salary) <= 0
        ? 'Valid salary is required'
        : '',
      bank_account_number: !formData.bank_account_number.trim()
        ? 'Bank account number is required'
        : '',
    };
    setFormErrors(errors);
    return Object.values(errors).every((e) => e === '');
  };

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        full_name: employee.full_name,
        department: employee.department,
        designation: employee.designation,
        base_salary: employee.base_salary.toString(),
        bank_account_number: employee.bank_account_number,
        tax_id: employee.tax_id || '',
        // Extract currency code safely from the object (or string)
        currency: getCurrencyCode((employee as any).currency),
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        full_name: '',
        department: '',
        designation: '',
        base_salary: '',
        bank_account_number: '',
        tax_id: '',
        currency: 'INR',
      });
    }
    setFormErrors({ full_name: '', department: '', designation: '', base_salary: '', bank_account_number: '' });
    setOpenDialog(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCloseDialog = () => setOpenDialog(false);

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const baseSalary = parseFloat(formData.base_salary);
      if (isNaN(baseSalary)) {
        setSnackbar({ open: true, message: 'Invalid salary amount', severity: 'error' });
        setSubmitting(false);
        return;
      }

      const payload: any = {
        full_name: formData.full_name.trim(),
        department: formData.department.trim(),
        designation: formData.designation.trim(),
        base_salary: baseSalary,
        bank_account_number: formData.bank_account_number.trim(),
        tax_id: formData.tax_id?.trim() || undefined,
        currency: formData.currency, // already a clean code
      };

      if (editingEmployee?.id) {
        await employeeAPI.update(editingEmployee.id, payload);
        setSnackbar({ open: true, message: 'Employee updated successfully', severity: 'success' });
      } else {
        await employeeAPI.create(payload);
        setSnackbar({ open: true, message: 'Employee added successfully', severity: 'success' });
      }
      await fetchEmployees();
      handleCloseDialog();
    } catch (err: any) {
      setSnackbar({ open: true, message: getErrorMessage(err), severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEmployee) return;
    setDeleting(true);
    try {
      await employeeAPI.delete(selectedEmployee.id);
      setSnackbar({ open: true, message: 'Employee deleted successfully', severity: 'success' });
      await fetchEmployees();
    } catch (err) {
      setSnackbar({ open: true, message: getErrorMessage(err), severity: 'error' });
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setSelectedEmployee(null);
    }
  };

  // ---------- DataGrid columns ----------
  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70, headerAlign: 'center', align: 'center' },
    { field: 'full_name', headerName: 'Full Name', width: 200, flex: 1 },
    { field: 'department', headerName: 'Department', width: 150 },
    { field: 'designation', headerName: 'Designation', width: 180 },
    {
      field: 'base_salary',
      headerName: 'Salary',
      width: 150,
      headerAlign: 'right',
      align: 'right',
      renderCell: (params: GridRenderCellParams) => {
        const row = params.row as any;
        const currencyCode = getCurrencyCode(row.currency);
        return formatCurrency(Number(params.value), currencyCode);
      },
    },
    { field: 'bank_account_number', headerName: 'Bank Account', width: 150 },
    {
      field: 'currency',
      headerName: 'Currency',
      width: 100,
      // Show the cleaned code using renderCell to avoid any [object Object]
      renderCell: (params: GridRenderCellParams) => {
        const code = getCurrencyCode(params.value);
        return <span>{code}</span>;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton size="small" onClick={() => handleOpenDialog(params.row)} sx={{ color: theme.palette.primary.main }}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleDeleteClick(params.row)} sx={{ color: theme.palette.error.main }}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (!isHR) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <Paper sx={{ p: 5, borderRadius: 3 }}>
          <Warning sx={{ fontSize: 60, color: theme.palette.warning.main, mb: 2 }} />
          <Typography variant="h5" gutterBottom>Access Denied</Typography>
          <Typography variant="body2" color="textSecondary">You do not have permission to view this page.</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Fade in timeout={600}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold">👥 Employees</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{
              borderRadius: 2,
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              '&:hover': {
                background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
              }
            }}
          >
            Add Employee
          </Button>
        </Box>
      </Fade>

      <Grow in timeout={800}>
        <Paper
          elevation={4}
          sx={{
            height: 600,
            width: '100%',
            borderRadius: 3,
            overflow: 'hidden',
            transition: 'box-shadow 0.2s',
            '&:hover': { boxShadow: theme.shadows[8] }
          }}
        >
          <DataGrid
            rows={employees}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': { borderBottom: `1px solid ${theme.palette.divider}` },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                fontWeight: 'bold',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
              },
            }}
          />
        </Paper>
      </Grow>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</Typography>
          <IconButton onClick={handleCloseDialog} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="full_name"
                label="Full Name"
                value={formData.full_name}
                onChange={handleInputChange}
                error={!!formErrors.full_name}
                helperText={formErrors.full_name}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                name="department"
                label="Department"
                value={formData.department}
                onChange={handleInputChange}
                error={!!formErrors.department}
                helperText={formErrors.department}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                name="designation"
                label="Designation"
                value={formData.designation}
                onChange={handleInputChange}
                error={!!formErrors.designation}
                helperText={formErrors.designation}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                name="base_salary"
                label="Base Salary"
                type="number"
                value={formData.base_salary}
                onChange={handleInputChange}
                error={!!formErrors.base_salary}
                helperText={formErrors.base_salary}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                name="bank_account_number"
                label="Bank Account Number"
                value={formData.bank_account_number}
                onChange={handleInputChange}
                error={!!formErrors.bank_account_number}
                helperText={formErrors.bank_account_number}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                name="tax_id"
                label="Tax ID (PAN)"
                value={formData.tax_id}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  name="currency"
                  value={formData.currency || 'INR'}
                  label="Currency"
                  onChange={handleInputChange}
                >
                  <MenuItem value="INR">INR (₹)</MenuItem>
                  <MenuItem value="USD">USD ($)</MenuItem>
                  <MenuItem value="EUR">EUR (€)</MenuItem>
                  <MenuItem value="GBP">GBP (£)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedEmployee?.full_name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
};

export default Employees;