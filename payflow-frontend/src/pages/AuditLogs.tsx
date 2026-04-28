import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, MenuItem,
  Box, CircularProgress
} from '@mui/material';
import { auditLogAPI } from '../services/api';
import { AuditLog } from '../types';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const AuditLogs: React.FC = () => {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [entityFilter, setEntityFilter] = useState('');

  useEffect(() => {
    if (isAdmin) fetchLogs();
  }, [entityFilter, isAdmin]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditLogAPI.getAll(entityFilter || undefined);
      setLogs(res.data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return <Typography>Access Denied</Typography>;

  const entities = ['payroll', 'employees', 'salary', 'loans', 'approvals', 'compliance'];

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom>Audit Logs</Typography>
      <Box sx={{ mb: 3 }}>
        <TextField
          select
          label="Filter by Entity"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All</MenuItem>
          {entities.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
        </TextField>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{dayjs(log.timestamp).format('DD/MM/YYYY HH:mm')}</TableCell>
                  <TableCell>{log.user_id || 'System'}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.entity}</TableCell>
                  <TableCell>{log.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default AuditLogs;