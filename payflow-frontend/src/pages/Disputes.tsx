import React, { useEffect, useState, useCallback } from 'react';
import {
  Container, Typography, Button, TextField, Chip, Stack, Alert, Card, CardContent,
  Grid, FormControl, InputLabel, Select, MenuItem, IconButton,
  Box, CircularProgress, Divider
} from '@mui/material';
import {
  Add, Gavel, HourglassEmpty, CheckCircle, Cancel, Delete
} from '@mui/icons-material';
import { disputeAPI, employeeAPI } from '../services/api';
import { PayrollDispute, Employee } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';

const Disputes: React.FC = () => {
  const { isHR } = useAuth();
  const [disputes, setDisputes] = useState<PayrollDispute[]>([]);
  const [loading, setLoading] = useState(false);
  const [formExpanded, setFormExpanded] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({
    employee_id: '',
    payroll_id: '',
    issue_title: '',
    description: ''
  });

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await disputeAPI.getAll();
      setDisputes(res.data);
    } catch {
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    if (isHR) {
      try {
        const res = await employeeAPI.getAll();
        setEmployees(res.data);
      } catch { /* ignore */ }
    }
  }, [isHR]);

  useEffect(() => {
    fetchDisputes();
    fetchEmployees();
  }, [fetchDisputes, fetchEmployees]);

  const resetForm = () => {
    setForm({ employee_id: '', payroll_id: '', issue_title: '', description: '' });
    setFormExpanded(false);
  };

  const handleSubmit = async () => {
    if (!form.employee_id || !form.payroll_id || !form.issue_title) {
      toast.warning('Employee ID, Payroll ID, and Issue Title are required');
      return;
    }
    try {
      await disputeAPI.create({
        employee_id: parseInt(form.employee_id),
        payroll_id: parseInt(form.payroll_id),
        issue_title: form.issue_title,
        description: form.description,
      });
      toast.success('Dispute raised');
      resetForm();
      fetchDisputes();
    } catch {
      toast.error('Failed to raise dispute');
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await disputeAPI.update(id, status);
      toast.success(`Dispute marked as ${status.replace('_', ' ')}`);
      fetchDisputes();
    } catch {
      toast.error('Update failed');
    }
  };

  const getEmployeeName = (empId: number) =>
    employees.find(e => e.id === empId)?.full_name || `#${empId}`;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <Gavel color="warning" />;
      case 'IN_PROGRESS': return <HourglassEmpty color="info" />;
      case 'RESOLVED': return <CheckCircle color="success" />;
      case 'CLOSED': return <Cancel color="error" />;
      default: return <Gavel />;
    }
  };

  const colorStatus = (status: string): "warning" | "info" | "success" | "error" | "default" => {
    switch (status) {
      case 'OPEN': return 'warning';
      case 'IN_PROGRESS': return 'info';
      case 'RESOLVED': return 'success';
      case 'CLOSED': return 'error';
      default: return 'default';
    }
  };

  const openCount = disputes.filter(d => d.status === 'OPEN').length;
  const inProgressCount = disputes.filter(d => d.status === 'IN_PROGRESS').length;
  const resolvedCount = disputes.filter(d => d.status === 'RESOLVED').length;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">⚖ Payroll Disputes</Typography>
        {!formExpanded && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setFormExpanded(true)}>
            Raise Dispute
          </Button>
        )}
      </Stack>

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#fff7e6', borderLeft: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography color="text.secondary" gutterBottom>Open</Typography>
                <Gavel color="warning" />
              </Stack>
              <Typography variant="h4">{openCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#e3f2fd', borderLeft: 4, borderColor: 'info.main' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography color="text.secondary" gutterBottom>In Progress</Typography>
                <HourglassEmpty color="info" />
              </Stack>
              <Typography variant="h4">{inProgressCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#e8f5e9', borderLeft: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography color="text.secondary" gutterBottom>Resolved</Typography>
                <CheckCircle color="success" />
              </Stack>
              <Typography variant="h4">{resolvedCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Collapsible Form Card */}
      {formExpanded && (
        <Card sx={{ mb: 4, boxShadow: 4 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Raise a Dispute</Typography>
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
                    {employees.map((emp) => (
                      <MenuItem key={emp.id} value={emp.id}>{emp.full_name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Payroll ID"
                  type="number"
                  value={form.payroll_id}
                  onChange={(e) => setForm({ ...form, payroll_id: e.target.value })}
                  placeholder="e.g. 101"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Issue Title"
                  value={form.issue_title}
                  onChange={(e) => setForm({ ...form, issue_title: e.target.value })}
                  placeholder="e.g. Salary amount mismatch"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the issue in detail..."
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSubmit}
                  startIcon={<Add />}
                >
                  Submit Dispute
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {!loading && disputes.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>No disputes raised yet.</Alert>
      ) : (
        !loading && (
          <Grid container spacing={2}>
            {disputes.map((d) => (
              <Grid item xs={12} key={d.id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderLeft: 6,
                    borderColor: d.status === 'OPEN' ? 'warning.main' :
                                d.status === 'IN_PROGRESS' ? 'info.main' :
                                d.status === 'RESOLVED' ? 'success.main' : 'error.main',
                    transition: 'box-shadow 0.3s',
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  <CardContent>
                    <Grid container alignItems="center" spacing={2}>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Employee
                        </Typography>
                        <Typography fontWeight={500}>
                          {getEmployeeName(d.employee_id)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Payroll ID
                        </Typography>
                        <Typography>#{d.payroll_id}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Issue
                        </Typography>
                        <Typography>{d.issue_title}</Typography>
                        {d.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {d.description}
                          </Typography>
                        )}
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {statusIcon(d.status)}
                          <Chip
                            label={d.status.replace('_', ' ')}
                            color={colorStatus(d.status)}
                            size="small"
                          />
                        </Stack>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                        </Typography>
                      </Grid>
                      {isHR && d.status !== 'CLOSED' && (
                        <Grid item xs={12} sm={2}>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {d.status === 'OPEN' && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="info"
                                onClick={() => handleUpdateStatus(d.id, 'IN_PROGRESS')}
                              >
                                In Progress
                              </Button>
                            )}
                            {d.status !== 'RESOLVED' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={() => handleUpdateStatus(d.id, 'RESOLVED')}
                              >
                                Resolve
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="text"
                              color="error"
                              onClick={() => handleUpdateStatus(d.id, 'CLOSED')}
                            >
                              Close
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
        )
      )}
    </Container>
  );
};

export default Disputes;