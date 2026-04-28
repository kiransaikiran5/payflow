import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TextField,
  Button,
  Container,
  Typography,
  Box,
  Alert,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  SelectChangeEvent,
  InputAdornment,
  IconButton,
  Divider,
  useTheme,
  Fade,
} from '@mui/material';
import { PersonAddOutlined, Visibility, VisibilityOff } from '@mui/icons-material';
import { authAPI } from '../services/api';

const Register: React.FC = () => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'EMPLOYEE',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const navigate = useNavigate();

  // Validation helpers
  const isUsernameValid = formData.username.length >= 3;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const isPasswordValid =
    formData.password.length >= 6 &&
    /[A-Z]/.test(formData.password) &&
    /[0-9]/.test(formData.password);
  const doPasswordsMatch = formData.password === formData.confirmPassword;

  const isFormValid =
    isUsernameValid &&
    isEmailValid &&
    isPasswordValid &&
    doPasswordsMatch &&
    formData.password.length > 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(''); // clear error on typing
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name as string]: value }));
    setError('');
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Mark all fields as touched to show errors
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    // Frontend validation
    if (!isUsernameValid) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!isEmailValid) {
      setError('Please enter a valid email address'); // ✅ Expected error message
      return;
    }
    if (!isPasswordValid) {
      setError('Password must be at least 6 characters with 1 uppercase and 1 number');
      return;
    }
    if (!doPasswordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authAPI.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      const backendMessage = err.response?.data?.detail || err.response?.data?.message || '';
      if (backendMessage.toLowerCase().includes('username') || backendMessage.toLowerCase().includes('already exists')) {
        setError('Username already taken. Please choose another.');
      } else if (backendMessage.toLowerCase().includes('email')) {
        setError('Email already registered. Please use another email or login.');
      } else {
        setError(backendMessage || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.light}20 0%, ${theme.palette.secondary.light}20 100%)`,
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Fade in timeout={800}>
          <Paper
            elevation={12}
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: 5,
              background: theme.palette.background.paper,
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 25px 40px rgba(0,0,0,0.15)',
              },
            }}
          >
            {/* Header */}
            <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
              <Box
                sx={{
                  bgcolor: 'secondary.main',
                  p: 1.8,
                  borderRadius: '50%',
                  mb: 2,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                }}
              >
                <PersonAddOutlined sx={{ color: 'white', fontSize: 40 }} />
              </Box>
              <Typography variant="h3" fontWeight="800" color="primary" gutterBottom>
                PayFlow
              </Typography>
              <Typography variant="subtitle1" color="textSecondary" align="center">
                Create your account to get started
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
                {success}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Grid container spacing={2}>
                {/* Username */}
                <Grid item xs={12}>
                  <TextField
                    name="username"
                    required
                    fullWidth
                    label="Username"
                    autoFocus
                    value={formData.username}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('username')}
                    error={touched.username && !isUsernameValid}
                    helperText={touched.username && !isUsernameValid ? 'Username must be at least 3 characters' : ''}
                    disabled={loading}
                    variant="outlined"
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                </Grid>

                {/* Email */}
                <Grid item xs={12}>
                  <TextField
                    name="email"
                    required
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('email')}
                    error={touched.email && !isEmailValid}
                    helperText={touched.email && !isEmailValid ? 'Please enter a valid email address' : ''}
                    disabled={loading}
                    variant="outlined"
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                </Grid>

                {/* Password */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="password"
                    required
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('password')}
                    error={touched.password && !isPasswordValid}
                    helperText={touched.password && !isPasswordValid ? 'Min 6 chars, 1 uppercase, 1 number' : ''}
                    disabled={loading}
                    variant="outlined"
                    InputProps={{
                      sx: { borderRadius: 2 },
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" disabled={loading}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Confirm Password */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="confirmPassword"
                    required
                    fullWidth
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('confirmPassword')}
                    error={touched.confirmPassword && !doPasswordsMatch}
                    helperText={touched.confirmPassword && !doPasswordsMatch ? 'Passwords do not match' : ''}
                    disabled={loading}
                    variant="outlined"
                    InputProps={{
                      sx: { borderRadius: 2 },
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" disabled={loading}>
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Role Selection */}
                <Grid item xs={12}>
                  <FormControl fullWidth disabled={loading}>
                    <InputLabel>Role</InputLabel>
                    <Select
                      name="role"
                      value={formData.role}
                      label="Role"
                      onChange={handleSelectChange}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="EMPLOYEE">Employee</MenuItem>
                      <MenuItem value="HR">HR Manager</MenuItem>
                      <MenuItem value="ADMIN">Administrator</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || !isFormValid}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  '&:hover': {
                    background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                  },
                }}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>

              <Divider sx={{ my: 2 }}>or</Divider>

              <Box textAlign="center">
                <Typography variant="body2">
                  Already have an account?{' '}
                  <Link to="/login" style={{ textDecoration: 'none', fontWeight: 'bold' }}>
                    Sign In
                  </Link>
                </Typography>
              </Box>

              <Typography variant="caption" color="textSecondary" align="center" sx={{ display: 'block', mt: 3 }}>
                © {new Date().getFullYear()} PayFlow – All rights reserved
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default Register;