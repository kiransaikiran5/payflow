import React, { useEffect, useState } from 'react';
import { Container, Paper, Typography, Box, Avatar, Divider, Grid, Skeleton, Alert } from '@mui/material';
import { Person } from '@mui/icons-material';
import { employeeAPI } from '../services/api';

interface EmployeeProfileData {
  id: number;
  full_name: string;
  department: string;
  designation: string;
  base_salary: number;
  bank_account_number: string;
  tax_id?: string;
}

const getErrorMessage = (err: any): string => {
  if (err.response?.data?.detail) {
    const detail = err.response.data.detail;
    if (Array.isArray(detail)) {
      // FastAPI validation error: [{loc: [], msg: "", type: ""}]
      return detail.map((e: any) => e.msg).join(', ');
    }
    if (typeof detail === 'string') return detail;
  }
  if (err.message) return err.message;
  return 'An unexpected error occurred';
};

const EmployeeProfile: React.FC = () => {
  const [profile, setProfile] = useState<EmployeeProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await employeeAPI.getMe();
        setProfile(res.data);
      } catch (err: any) {
        console.error('Profile fetch error:', err);
        if (err.response?.status === 404) {
          setError('Employee profile not found. Please contact HR to set up your profile.');
        } else if (err.response?.status === 422) {
          setError('Server returned invalid data. Please contact support.');
        } else {
          setError(getErrorMessage(err));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) return <Skeleton variant="rectangular" height={400} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!profile) return <Typography>No profile data</Typography>;

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}>
            <Person sx={{ fontSize: 50 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">{profile.full_name}</Typography>
            <Typography variant="subtitle1" color="textSecondary">{profile.designation}</Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="overline" color="textSecondary">Department</Typography>
            <Typography variant="body1">{profile.department}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="overline" color="textSecondary">Base Salary</Typography>
            <Typography variant="body1">₹{profile.base_salary.toLocaleString()}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="overline" color="textSecondary">Bank Account</Typography>
            <Typography variant="body1">{profile.bank_account_number}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="overline" color="textSecondary">Tax ID (PAN)</Typography>
            <Typography variant="body1">{profile.tax_id || 'Not provided'}</Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default EmployeeProfile;