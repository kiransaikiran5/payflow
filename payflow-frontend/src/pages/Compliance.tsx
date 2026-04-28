import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Button,
  Box, CircularProgress
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import { employeeAPI, complianceAPI } from '../services/api';
import { Employee, Compliance } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

const CompliancePage: React.FC = () => {
  const { isHR } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [complianceData, setComplianceData] = useState<Map<number, Compliance>>(new Map());
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState({ pf_amount: '', esi_amount: '', effective_from: '' });

  useEffect(() => {
    if (isHR) loadData();
  }, [isHR]);

  const loadData = async () => {
    try {
      const empRes = await employeeAPI.getAll();
      setEmployees(empRes.data);
      const compMap = new Map<number, Compliance>();
      await Promise.all(empRes.data.map(async (emp) => {
        try {
          const res = await complianceAPI.getByEmployee(emp.id);
          compMap.set(emp.id, res.data);
        } catch { /* ignore not found */ }
      }));
      setComplianceData(compMap);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (employee: Employee) => {
    setSelectedEmployee(employee);
    const existing = complianceData.get(employee.id);
    setForm({
      pf_amount: existing?.pf_amount?.toString() || '',
      esi_amount: existing?.esi_amount?.toString() || '',
      effective_from: existing?.effective_from || ''
    });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;
    try {
      await complianceAPI.update(selectedEmployee.id, {
        pf_amount: parseFloat(form.pf_amount) || 0,
        esi_amount: parseFloat(form.esi_amount) || 0,
        effective_from: form.effective_from || null
      });
      toast.success('Compliance updated');
      loadData();
      setOpenDialog(false);
    } catch {
      toast.error('Update failed');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>Statutory Compliance</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell align="right">PF Amount</TableCell>
              <TableCell align="right">ESI Amount</TableCell>
              <TableCell>Effective From</TableCell>
              {isHR && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map(emp => {
              const comp = complianceData.get(emp.id);
              return (
                <TableRow key={emp.id}>
                  <TableCell>{emp.full_name}</TableCell>
                  <TableCell align="right">₹{(comp?.pf_amount || 0).toLocaleString()}</TableCell>
                  <TableCell align="right">₹{(comp?.esi_amount || 0).toLocaleString()}</TableCell>
                  <TableCell>{comp?.effective_from ? dayjs(comp.effective_from).format('DD/MM/YYYY') : '-'}</TableCell>
                  {isHR && (
                    <TableCell>
                      <IconButton onClick={() => handleOpen(emp)}><Edit /></IconButton>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Edit Compliance - {selectedEmployee?.full_name}</DialogTitle>
        <DialogContent>
          <TextField label="PF Amount" type="number" fullWidth margin="dense" value={form.pf_amount}
            onChange={e => setForm({ ...form, pf_amount: e.target.value })} />
          <TextField label="ESI Amount" type="number" fullWidth margin="dense" value={form.esi_amount}
            onChange={e => setForm({ ...form, esi_amount: e.target.value })} />
          <TextField label="Effective Date" type="date" fullWidth margin="dense" InputLabelProps={{ shrink: true }}
            value={form.effective_from} onChange={e => setForm({ ...form, effective_from: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CompliancePage;