import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Alert,
  Box,
  Tooltip,
  Chip,
  Button,
  Stack,
} from '@mui/material';
import { Download, Refresh } from '@mui/icons-material';
import { payslipAPI, payrollAPI, employeeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currency';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';

// ---------- Interfaces ----------
interface Payslip {
  id: number;
  payroll_id: number;
  file_url?: string;
  generated_at: string;
}

interface Payroll {
  id: number;
  employee_id: number;
  month: string;
  net_salary: number;
}

interface Employee {
  id: number;
  full_name: string;
  currency?: string;
}

// ---------- Component ----------
const Payslips: React.FC = () => {
  const { isHR, loading: authLoading, user } = useAuth();

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Redirect if not authenticated after auth loading finishes
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
    }
  }, [authLoading, user]);

  const fetchData = useCallback(async () => {
    if (!mountedRef.current) return;

    setLoading(true);
    setError(null);

    // Safety timeout – prevent infinite spinner if backend hangs
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setError('Request timed out. Please check if the backend server is running.');
        setLoading(false);
      }
    }, 10000);

    try {
      let payrollsData: Payroll[] = [];
      let employeesData: Employee[] = [];
      let payslipsData: Payslip[] = [];

      if (isHR) {
        // HR: get all payrolls, employees, and payslips in parallel
        const [payRes, empRes, slipRes] = await Promise.allSettled([
          payrollAPI.getAll(),
          employeeAPI.getAll(),
          payslipAPI.getAll(),
        ]);

        payrollsData = payRes.status === 'fulfilled' ? (payRes.value.data ?? []) : [];
        employeesData = empRes.status === 'fulfilled' ? (empRes.value.data ?? []) : [];
        payslipsData = slipRes.status === 'fulfilled' ? (slipRes.value.data ?? []) : [];
      } else {
        // Employee: get own payroll and payslips
        try {
          const meRes = await employeeAPI.getMe();
          const myId = meRes?.data?.id;
          if (myId) {
            const [payRes, slipRes] = await Promise.allSettled([
              payrollAPI.getAll(),
              payslipAPI.getByEmployee(myId),
            ]);
            const allPayrolls = payRes.status === 'fulfilled' ? (payRes.value.data ?? []) : [];
            payrollsData = allPayrolls.filter((p: Payroll) => p.employee_id === myId);
            employeesData = [meRes.data];
            payslipsData = slipRes.status === 'fulfilled' ? (slipRes.value.data ?? []) : [];
          }
        } catch {
          // ignore
        }
      }

      if (!mountedRef.current) {
        clearTimeout(timer);
        return;
      }

      setPayrolls(payrollsData);
      setEmployees(employeesData);
      setPayslips(payslipsData);
      setLoading(false);
    } catch (err: any) {
      if (!mountedRef.current) {
        clearTimeout(timer);
        return;
      }
      const message = err?.response?.data?.detail || err?.message || 'Failed to load payslips.';
      setError(message);
      setLoading(false);
    } finally {
      clearTimeout(timer);
    }
  }, [isHR]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [fetchData, authLoading, user]);

  const getPayroll = (payrollId: number) => payrolls.find((p) => p.id === payrollId);
  const getEmployee = (employeeId: number) => employees.find((e) => e.id === employeeId);

  const handleDownload = async (slip: Payslip) => {
    if (!slip.file_url) {
      toast.warning('Payslip not generated yet');
      return;
    }
    try {
      const response = await payslipAPI.download(slip.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip_${slip.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  // ---------- UI States ----------

  // 1. Auth still loading
  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
        <Typography ml={2}>Authenticating...</Typography>
      </Box>
    );
  }

  // 2. Data loading
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
        <Typography ml={2}>Loading payslips...</Typography>
      </Box>
    );
  }

  // 3. Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button startIcon={<Refresh />} onClick={fetchData}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  // 4. Main content
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          📄 Payslips
        </Typography>
        <Button startIcon={<Refresh />} onClick={fetchData}>
          Refresh
        </Button>
      </Stack>

      {payslips.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography>No payslips available yet.</Typography>
          {isHR && (
            <Typography variant="caption" display="block" mt={1}>
              Generate payslips from the Payroll page.
            </Typography>
          )}
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {isHR && <TableCell><b>Employee</b></TableCell>}
                <TableCell><b>Month</b></TableCell>
                <TableCell align="right"><b>Net Salary</b></TableCell>
                <TableCell><b>Generated</b></TableCell>
                <TableCell align="center"><b>Status</b></TableCell>
                <TableCell align="center"><b>Download</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payslips.map((slip) => {
                const payroll = getPayroll(slip.payroll_id);
                const employee = payroll ? getEmployee(payroll.employee_id) : undefined;
                return (
                  <TableRow key={slip.id}>
                    {isHR && <TableCell>{employee?.full_name || '—'}</TableCell>}
                    <TableCell>
                      {payroll?.month ? dayjs(payroll.month).format('MMMM YYYY') : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(payroll?.net_salary ?? 0, employee?.currency || 'INR')}
                    </TableCell>
                    <TableCell>
                      {dayjs(slip.generated_at).format('DD MMM YYYY, hh:mm A')}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={slip.file_url ? 'Ready' : 'Pending'}
                        color={slip.file_url ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Download PDF">
                        <span>
                          <IconButton
                            disabled={!slip.file_url}
                            onClick={() => handleDownload(slip)}
                          >
                            <Download />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default Payslips;
