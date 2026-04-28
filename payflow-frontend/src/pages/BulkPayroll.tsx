import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Paper, Button, Box, TextField,
  Grid, Chip, Alert, CircularProgress, FormControlLabel, Checkbox
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { bulkPayrollAPI, employeeAPI } from '../services/api';
import { Employee } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const BulkPayroll: React.FC = () => {
  const { isHR } = useAuth();
  const [month, setMonth] = useState<Dayjs>(dayjs().startOf('month'));
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectAll, setSelectAll] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);

  useEffect(() => {
    if (isHR) employeeAPI.getAll().then(res => setEmployees(res.data));
  }, [isHR]);

  const handleGenerate = async () => {
    if (!month) return;
    setProcessing(true);
    try {
      const payload: any = { month: month.format('YYYY-MM-DD') };
      if (!selectAll && selectedEmployees.length > 0)
        payload.employee_ids = selectedEmployees;
      const res = await bulkPayrollAPI.generate(payload);
      setResult(res.data);
      toast.success(`Generated for ${res.data.successful.length} employees`);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Bulk generation failed');
    } finally {
      setProcessing(false);
    }
  };

  const toggleEmployee = (id: number) => {
    setSelectedEmployees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (!isHR) return <Typography>Access Denied</Typography>;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="md">
        <Typography variant="h4" gutterBottom>Bulk Payroll Processing</Typography>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Select Month"
                views={['year', 'month']}
                value={month}
                onChange={(v) => setMonth(v || dayjs())}
                sx={{ width: '100%' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={processing ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
                onClick={handleGenerate}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Generate Payroll for All'}
              </Button>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={<Checkbox checked={selectAll} onChange={(e) => setSelectAll(e.target.checked)} />}
              label="All employees"
            />
            {!selectAll && (
              <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #ccc', p: 2, borderRadius: 1 }}>
                {employees.map(emp => (
                  <FormControlLabel
                    key={emp.id}
                    control={
                      <Checkbox
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={() => toggleEmployee(emp.id)}
                      />
                    }
                    label={`${emp.full_name} - ${emp.department}`}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Paper>

        {result && (
          <Paper sx={{ p: 3 }}>
            <Alert severity={result.failed.length === 0 ? 'success' : 'warning'}>
              Processed {result.total_processed} employees. Successful: {result.successful.length}, Failed: {result.failed.length}
            </Alert>
            {result.failed.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle1">Failures:</Typography>
                {result.failed.map((f: any, i: number) => (
                  <Chip key={i} label={`ID ${f.employee_id}: ${f.reason}`} color="error" sx={{ m: 0.5 }} />
                ))}
              </Box>
            )}
          </Paper>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default BulkPayroll;