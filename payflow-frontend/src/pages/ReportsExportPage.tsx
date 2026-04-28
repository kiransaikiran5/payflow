import React, { useState } from 'react';
import {
  Container, Typography, Paper, Button, Grid, TextField, MenuItem, Box
} from '@mui/material';
import { Download, PictureAsPdf, TableChart } from '@mui/icons-material';
import { exportAPI } from '../services/api';
import { toast } from 'react-toastify';

const ReportsExportPage: React.FC = () => {
  const [month, setMonth] = useState('');
  const [department, setDepartment] = useState('');

  const downloadCSV = async () => {
    try {
      const res = await exportAPI.payrollCSV(month || undefined, department || undefined);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll_${month || 'all'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('Export failed');
    }
  };

  const downloadPDF = async () => {
    try {
      const res = await exportAPI.payrollPDF(month || undefined, department || undefined);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll_${month || 'all'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('PDF export failed');
    }
  };

  const departments = ['Engineering', 'HR', 'Finance', 'Marketing']; // should be dynamic; optionally fetch from API

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" gutterBottom>Export Payroll Reports</Typography>
      <Paper sx={{ p: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Month (YYYY-MM-DD)"
              placeholder="Leave empty for all"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              fullWidth
              helperText="Format: 2026-04-01"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              select
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              fullWidth
            >
              <MenuItem value="">All Departments</MenuItem>
              {departments.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<TableChart />}
              onClick={downloadCSV}
            >
              Export CSV
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<PictureAsPdf />}
              onClick={downloadPDF}
            >
              Export PDF
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default ReportsExportPage;