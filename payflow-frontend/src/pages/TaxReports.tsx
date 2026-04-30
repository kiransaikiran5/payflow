import React, { useEffect, useState, useCallback } from 'react';
import {
  Container, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, CircularProgress,
  Box, FormControl, InputLabel, Select, MenuItem, TextField, IconButton
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { taxReportAPI, employeeAPI } from '../services/api';
import { TaxReport, Employee } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const currentFinancialYear = () => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  return month < 4 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
};

const TaxReports: React.FC = () => {
  const { isHR } = useAuth();
  const [reports, setReports] = useState<TaxReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
  const [financialYear, setFinancialYear] = useState(currentFinancialYear());
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (isHR) {
      employeeAPI.getAll()
        .then(res => setEmployees(res.data))
        .catch(() => toast.error('Failed to load employees'));
    }
  }, [isHR]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const filterEmployee = isHR ? selectedEmployee || undefined : undefined;
      const res = await taxReportAPI.getAll(filterEmployee);
      setReports(res.data);
    } catch {
      toast.error('Failed to load tax reports');
    } finally {
      setLoading(false);
    }
  }, [selectedEmployee, isHR]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleGenerate = async () => {
    if (!selectedEmployee) {
      toast.warning('Please select an employee');
      return;
    }
    try {
      await taxReportAPI.generate(selectedEmployee as number, financialYear);
      toast.success('Tax report generated');
      fetchReports();
    } catch {
      toast.error('Generation failed');
    }
  };

  const handleDownload = async (employeeId: number, financialYear: string) => {
    try {
      const res = await taxReportAPI.download(employeeId, financialYear);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;

      // Build a professional filename with employee name
      const employee = employees.find(e => e.id === employeeId);
      const employeeName = employee
        ? employee.full_name.replace(/\s+/g, '_')
        : employeeId;
      link.setAttribute('download', `PayFlow_Tax_Report_${employeeName}_${financialYear}.pdf`);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const getEmployeeName = (empId: number) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? emp.full_name : `#${empId}`;
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>Tax Reports</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        {isHR && (
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Employee</InputLabel>
            <Select
              value={selectedEmployee}
              label="Employee"
              onChange={(e) => setSelectedEmployee(e.target.value as number || '')}
            >
              <MenuItem value=""><em>All Employees</em></MenuItem>
              {employees.map(emp => (
                <MenuItem key={emp.id} value={emp.id}>{emp.full_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <TextField
          label="Financial Year"
          value={financialYear}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFinancialYear(e.target.value)}
        />

        {isHR && (
          <Button variant="contained" onClick={handleGenerate} disabled={!selectedEmployee}>
            Generate Report
          </Button>
        )}
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Financial Year</TableCell>
                <TableCell align="right">Total Earnings</TableCell>
                <TableCell align="right">Total Tax</TableCell>
                <TableCell>Generated</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{getEmployeeName(r.employee_id)}</TableCell>
                  <TableCell>{r.financial_year}</TableCell>
                  <TableCell align="right">₹{r.total_earnings.toLocaleString()}</TableCell>
                  <TableCell align="right">₹{r.total_tax.toLocaleString()}</TableCell>
                  <TableCell>{new Date(r.generated_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleDownload(r.employee_id, r.financial_year)}
                      title="Download PDF"
                    >
                      <Download />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default TaxReports;