import React, { useEffect, useState, useCallback } from 'react';
import {
  Container, Typography, Paper, Box, Grid, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, FormControl, InputLabel, TextField,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { Edit } from '@mui/icons-material';
import { employeeAPI } from '../services/api';
import { Employee } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

interface AttendanceRecord {
  id: number;
  employee_id: number;
  date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  overtime_hours: number;
  remarks: string | null;
}

interface AttendanceSummary {
  id: number;
  employee_id: number;
  month: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  leave_days: number;
  holiday_days: number;
  total_overtime_hours: number;
  salary_adjustment: number;
}

const Attendance: React.FC = () => {
  const { isHR } = useAuth(); // removed unused 'user'
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs().startOf('month'));
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({
    status: 'PRESENT',
    overtime_hours: '0',
    remarks: ''
  });

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await employeeAPI.getAll();
      setEmployees(res.data);
    } catch (err) {
      toast.error('Failed to fetch employees');
    }
  }, []);

  const fetchAttendanceData = useCallback(async () => {
    if (isHR && !selectedEmployee) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const monthStr = selectedMonth.format('YYYY-MM-DD');
      
      if (isHR) {
        const [recordsRes, summaryRes] = await Promise.all([
          axios.get(`${API_BASE}/attendance/employee/${selectedEmployee}`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { month: monthStr }
          }),
          axios.get(`${API_BASE}/attendance/summary/${selectedEmployee}`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { month: monthStr }
          })
        ]);
        setAttendanceRecords(recordsRes.data);
        setSummary(summaryRes.data);
      } else {
        const res = await axios.get(`${API_BASE}/attendance/my-attendance`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { month: monthStr }
        });
        setAttendanceRecords(res.data);
        setSummary(null); // no summary for employee view
      }
    } catch (err) {
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  }, [isHR, selectedEmployee, selectedMonth]);

  const fetchMyAttendance = useCallback(async () => {
    if (isHR) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const monthStr = selectedMonth.format('YYYY-MM-DD');
      const res = await axios.get(`${API_BASE}/attendance/my-attendance`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { month: monthStr }
      });
      setAttendanceRecords(res.data);
    } catch (err) {
      toast.error('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  }, [isHR, selectedMonth]);

  useEffect(() => {
    if (isHR) {
      fetchEmployees();
    }
  }, [isHR, fetchEmployees]);

  useEffect(() => {
    if (isHR && selectedEmployee) {
      fetchAttendanceData();
    } else if (!isHR) {
      fetchMyAttendance();
    }
  }, [isHR, selectedEmployee, selectedMonth, fetchAttendanceData, fetchMyAttendance]);

  const handleBulkGenerate = async () => {
    if (!selectedEmployee) return;
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`${API_BASE}/attendance/bulk`, {
        employee_id: selectedEmployee,
        month: selectedMonth.format('YYYY-MM-DD'),
        default_status: 'PRESENT',
        working_days: Array.from({ length: 22 }, (_, i) => i + 1),
        holidays: []
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Attendance records generated');
      fetchAttendanceData();
    } catch (err) {
      toast.error('Failed to generate attendance');
    }
  };

  const handleEditRecord = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setEditForm({
      status: record.status,
      overtime_hours: record.overtime_hours.toString(),
      remarks: record.remarks || ''
    });
    setOpenDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    try {
      const token = localStorage.getItem('access_token');
      await axios.put(`${API_BASE}/attendance/${editingRecord.id}`, {
        status: editForm.status,
        overtime_hours: parseFloat(editForm.overtime_hours),
        remarks: editForm.remarks
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Attendance updated');
      setOpenDialog(false);
      fetchAttendanceData();
    } catch (err) {
      toast.error('Failed to update attendance');
    }
  };

  const getStatusColor = (status: string): "success" | "error" | "warning" | "info" | "default" => {
    switch (status) {
      case 'PRESENT': return 'success';
      case 'ABSENT': return 'error';
      case 'HALF_DAY': return 'warning';
      case 'LEAVE': return 'info';
      case 'HOLIDAY': return 'default';
      default: return 'default';
    }
  };

  if (loading && !attendanceRecords.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl">
        <Typography variant="h4" gutterBottom>
          Attendance Management
        </Typography>

        {/* Controls */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {isHR && (
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Select Employee</InputLabel>
                  <Select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value as number)}
                    label="Select Employee"
                  >
                    {employees.map(emp => (
                      <MenuItem key={emp.id} value={emp.id}>{emp.full_name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} md={4}>
              <DatePicker
                label="Select Month"
                views={['year', 'month']}
                value={selectedMonth}
                onChange={(v) => setSelectedMonth(v || dayjs())}
                sx={{ width: '100%' }}
              />
            </Grid>
            {isHR && selectedEmployee && (
              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  onClick={handleBulkGenerate}
                  disabled={attendanceRecords.length > 0}
                >
                  Generate Monthly Attendance
                </Button>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Summary Cards – only for HR view when employee selected */}
        {summary && isHR && selectedEmployee && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                <Typography variant="h6">{summary.present_days}</Typography>
                <Typography variant="body2">Present</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light' }}>
                <Typography variant="h6">{summary.absent_days}</Typography>
                <Typography variant="body2">Absent</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                <Typography variant="h6">{summary.half_days}</Typography>
                <Typography variant="body2">Half Days</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
                <Typography variant="h6">{summary.total_overtime_hours}</Typography>
                <Typography variant="body2">Overtime Hours</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: summary.salary_adjustment > 0 ? 'error.light' : 'success.light' }}>
                <Typography variant="h6" color={summary.salary_adjustment > 0 ? 'error' : 'success'}>
                  ₹{Math.abs(summary.salary_adjustment).toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  {summary.salary_adjustment > 0 ? 'Salary Deduction' : 'Overtime Bonus'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Attendance Table */}
        {attendanceRecords.length > 0 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Day</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Check In/Out</TableCell>
                  <TableCell align="right">Overtime (hrs)</TableCell>
                  <TableCell>Remarks</TableCell>
                  {isHR && <TableCell>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {attendanceRecords.map(record => (
                  <TableRow key={record.id}>
                    <TableCell>{dayjs(record.date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell>{dayjs(record.date).format('dddd')}</TableCell>
                    <TableCell>
                      <Chip
                        label={record.status.replace('_', ' ')}
                        color={getStatusColor(record.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {record.check_in && record.check_out
                        ? `${record.check_in} - ${record.check_out}`
                        : '-'}
                    </TableCell>
                    <TableCell align="right">{record.overtime_hours}</TableCell>
                    <TableCell>{record.remarks || '-'}</TableCell>
                    {isHR && (
                      <TableCell>
                        <IconButton size="small" onClick={() => handleEditRecord(record)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Edit Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Edit Attendance</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="PRESENT">Present</MenuItem>
                <MenuItem value="ABSENT">Absent</MenuItem>
                <MenuItem value="HALF_DAY">Half Day</MenuItem>
                <MenuItem value="LEAVE">Leave</MenuItem>
                <MenuItem value="HOLIDAY">Holiday</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Overtime Hours"
              type="number"
              margin="normal"
              value={editForm.overtime_hours}
              onChange={(e) => setEditForm({ ...editForm, overtime_hours: e.target.value })}
            />
            <TextField
              fullWidth
              label="Remarks"
              margin="normal"
              value={editForm.remarks}
              onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveEdit}>Save</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default Attendance;