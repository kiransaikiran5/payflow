import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, TextField, Button, Grid,
  Card, CardContent, Chip, FormControl, InputLabel,
  Select, MenuItem, Stack, Alert, IconButton, Tooltip, Divider
} from '@mui/material';
import {
  Upload, CheckCircle, Cancel, PendingActions, AttachFile, Send, Delete
} from '@mui/icons-material';
import { reimbursementAPI, employeeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

interface Reimbursement {
  id: number;
  employee_id: number;
  title: string;
  amount: number;
  receipt_file?: string;
  status: string;
  submitted_at: string;
}

const Reimbursements: React.FC = () => {
  const { isHR, isAdmin } = useAuth();
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [employees, setEmployees] = useState<{ id: number; full_name: string }[]>([]);
  const [form, setForm] = useState({ employee_id: '', title: '', amount: '' });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [formExpanded, setFormExpanded] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await reimbursementAPI.getAll();
      setReimbursements(res.data);
      if (isHR || isAdmin) {
        const empRes = await employeeAPI.getAll();
        setEmployees(empRes.data.map((e: any) => ({ id: e.id, full_name: e.full_name })));
      }
    } catch (err) {
      toast.error('Failed to load data');
    }
  }, [isHR, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setForm({ employee_id: '', title: '', amount: '' });
    setReceipt(null);
    setFormExpanded(false);
  };

  const handleSubmit = async () => {
    if (!form.employee_id || !form.title || !form.amount) {
      toast.warning('Fill all required fields');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('employee_id', form.employee_id);
    formData.append('title', form.title);
    formData.append('amount', form.amount);
    if (receipt) formData.append('receipt', receipt);

    try {
      await reimbursementAPI.create(formData);
      toast.success('Reimbursement submitted');
      resetForm();
      fetchData();
    } catch (err) {
      toast.error('Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await reimbursementAPI.update(id, status);
      toast.success(`Status updated to ${status}`);
      fetchData();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const getEmployeeName = (empId: number) =>
    employees.find(e => e.id === empId)?.full_name || `#${empId}`;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle color="success" />;
      case 'REJECTED': return <Cancel color="error" />;
      default: return <PendingActions color="warning" />;
    }
  };

  const colorStatus = (status: string): "success" | "error" | "warning" | "default" => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">📄 Reimbursements</Typography>
        {!formExpanded && (
          <Button
            variant="contained"
            startIcon={<Upload />}
            onClick={() => setFormExpanded(true)}
          >
            New Reimbursement Request
          </Button>
        )}
      </Stack>

      {/* Collapsible Form Card */}
      {formExpanded && (
        <Card sx={{ mb: 4, boxShadow: 4 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">New Reimbursement Request</Typography>
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
                    onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  >
                    {employees.map((e) => (
                      <MenuItem key={e.id} value={e.id}>{e.full_name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Client meeting travel"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  InputProps={{ startAdornment: '₹' }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<AttachFile />}
                    fullWidth
                    size="large"
                  >
                    {receipt ? receipt.name : 'Upload Receipt'}
                    <input
                      type="file"
                      hidden
                      onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                    />
                  </Button>
                  {receipt && (
                    <Tooltip title="Remove file">
                      <IconButton onClick={() => setReceipt(null)} size="small">
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSubmit}
                  disabled={loading}
                  startIcon={<Send />}
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* History Cards */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Submission History
      </Typography>
      {reimbursements.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>No reimbursements yet.</Alert>
      ) : (
        <Grid container spacing={2}>
          {reimbursements.map((r) => (
            <Grid item xs={12} key={r.id}>
              <Card
                variant="outlined"
                sx={{
                  borderLeft: 6,
                  borderColor: r.status === 'APPROVED' ? 'success.main' :
                               r.status === 'REJECTED' ? 'error.main' : 'warning.main',
                  transition: 'box-shadow 0.3s',
                  '&:hover': { boxShadow: 6 }
                }}
              >
                <CardContent>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Employee
                      </Typography>
                      <Typography fontWeight={500}>
                        {getEmployeeName(r.employee_id)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Title
                      </Typography>
                      <Typography>{r.title}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Amount
                      </Typography>
                      <Typography fontWeight={600}>₹{r.amount.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {statusIcon(r.status)}
                        <Chip
                          label={r.status}
                          color={colorStatus(r.status)}
                          size="small"
                        />
                      </Stack>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(r.submitted_at).toLocaleDateString()}
                      </Typography>
                    </Grid>
                    {isHR && r.status === 'PENDING' && (
                      <Grid item xs={12} sm={2}>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<CheckCircle />}
                            onClick={() => handleStatusChange(r.id, 'APPROVED')}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<Cancel />}
                            onClick={() => handleStatusChange(r.id, 'REJECTED')}
                          >
                            Reject
                          </Button>
                        </Stack>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default Reimbursements;