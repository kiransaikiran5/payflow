import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Paper, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Box, CircularProgress, Alert
} from '@mui/material';
import { AccessTime, Schedule, CheckCircle } from '@mui/icons-material';

// Types (add to your types/index.ts if you want)
interface ScheduledJob {
  id: number;
  job_name: string;
  next_run: string;
  trigger: string;
}

interface SchedulerStatus {
  active: boolean;
  message: string;
}

const PayrollSchedule: React.FC = () => {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // TODO: Replace with real API call, e.g. GET /api/payroll-schedule
      const simulatedStatus: SchedulerStatus = {
        active: true,
        message: 'Auto-payroll scheduler is currently ACTIVE.'
      };
      const simulatedJobs: ScheduledJob[] = [
        {
          id: 1,
          job_name: 'monthly_payroll_job',
          next_run: '2026-05-01T02:00:00',
          trigger: "cron[day='1', hour='2', minute='0']",
        },
      ];
      setStatus(simulatedStatus);
      setJobs(simulatedJobs);
      setLoading(false);
    };
    fetchData();
  }, []);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Payroll Scheduling
      </Typography>

      {/* Scheduler Status Card */}
      <Card sx={{ mb: 4, borderLeft: 6, borderColor: status?.active ? 'success.main' : 'error.main' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <CheckCircle color="success" fontSize="large" />
            <Typography variant="h6">
              {status?.message || 'Scheduler status unknown'}
            </Typography>
            <Chip
              label={status?.active ? 'ACTIVE' : 'INACTIVE'}
              color={status?.active ? 'success' : 'error'}
              size="small"
              sx={{ ml: 'auto' }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Scheduled Jobs Table */}
      <Paper sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ p: 2 }}>
          <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
          Scheduled Jobs
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Job Name</TableCell>
                <TableCell>Next Run</TableCell>
                <TableCell>Trigger</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.length > 0 ? (
                jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{job.job_name}</TableCell>
                    <TableCell>{formatDateTime(job.next_run)}</TableCell>
                    <TableCell>
                      <Chip label={job.trigger} variant="outlined" size="small" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No jobs scheduled
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Automatic Generation Note */}
      <Alert severity="info" icon={<AccessTime />}>
        Payroll is automatically generated on the <strong>1st of each month</strong> at 2:00 AM.
        You can monitor upcoming runs above.
      </Alert>
    </Container>
  );
};

export default PayrollSchedule;