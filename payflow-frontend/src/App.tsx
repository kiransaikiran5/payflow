import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import SalaryStructure from './pages/SalaryStructure';
import PayrollPage from './pages/Payroll';
import Payslips from './pages/Payslips';
import Bonuses from './pages/Bonuses';
import Reports from './pages/Reports';
import EmployeeProfile from './pages/EmployeeProfile';
import Attendance from './pages/Attendance';
import Tax from './pages/Tax';
import NotificationsPage from './pages/Notifications';
import MainLayout from './components/Layout/MainLayout';
import { CircularProgress, Box, Typography, Container, Paper } from '@mui/material';
import { Warning } from '@mui/icons-material';

// Phase 2 pages
import Approvals from './pages/Approvals';
import SalaryHistory from './pages/SalaryHistory';
import Loans from './pages/Loans';
import CompliancePage from './pages/Compliance';   // exported component is CompliancePage
import BulkPayroll from './pages/BulkPayroll';
import AuditLogs from './pages/AuditLogs';
import ReportsExportPage from './pages/ReportsExportPage';

// ---------- Route guards ----------
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const RequireRole: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles.includes(user.role)) return <>{children}</>;

  return (
    <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
      <Paper sx={{ p: 5, borderRadius: 3 }}>
        <Warning sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Access Denied
        </Typography>
        <Typography variant="body2" color="textSecondary">
          You do not have the required permissions to access this resource.
        </Typography>
      </Paper>
    </Container>
  );
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes inside MainLayout */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Phase 1 – HR/ADMIN only */}
        <Route
          path="/employees"
          element={<RequireRole allowedRoles={['HR', 'ADMIN']}><Employees /></RequireRole>}
        />
        <Route
          path="/salary-structure"
          element={<RequireRole allowedRoles={['HR', 'ADMIN']}><SalaryStructure /></RequireRole>}
        />
        <Route
          path="/payroll"
          element={<RequireRole allowedRoles={['HR', 'ADMIN']}><PayrollPage /></RequireRole>}
        />
        <Route
          path="/bonuses"
          element={<RequireRole allowedRoles={['HR', 'ADMIN']}><Bonuses /></RequireRole>}
        />
        <Route
          path="/reports"
          element={<RequireRole allowedRoles={['HR', 'ADMIN']}><Reports /></RequireRole>}
        />
        <Route
          path="/tax"
          element={<RequireRole allowedRoles={['HR', 'ADMIN']}><Tax /></RequireRole>}
        />
        <Route
          path="/attendance"
          element={<RequireRole allowedRoles={['HR', 'ADMIN']}><Attendance /></RequireRole>}
        />

        {/* Employee self‑service attendance (any authenticated user) */}
        <Route path="/my-attendance" element={<Attendance />} />

        {/* Phase 2 – HR/ADMIN only */}
        <Route
          path="/approvals"
          element={<RequireRole allowedRoles={['ADMIN']}><Approvals /></RequireRole>}
        />
        <Route
          path="/salary-history"
          element={<RequireRole allowedRoles={['HR', 'ADMIN']}><SalaryHistory /></RequireRole>}
        />
        <Route
          path="/loans"
          element={<RequireRole allowedRoles={['HR', 'ADMIN']}><Loans /></RequireRole>}
        />
        <Route
          path="/compliance"
          element={<RequireRole allowedRoles={['HR', 'ADMIN']}><CompliancePage /></RequireRole>}
        />
        <Route
          path="/bulk-payroll"
          element={<RequireRole allowedRoles={['HR', 'ADMIN']}><BulkPayroll /></RequireRole>}
        />
        <Route
          path="/audit-logs"
          element={<RequireRole allowedRoles={['ADMIN']}><AuditLogs /></RequireRole>}
        />
        <Route
          path="/export"
          element={<RequireRole allowedRoles={['HR', 'ADMIN']}><ReportsExportPage /></RequireRole>}
        />

        {/* Routes for ALL authenticated users */}
        <Route path="/payslips" element={<Payslips />} />
        <Route path="/profile" element={<EmployeeProfile />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      {/* Catch‑all redirect */}
      <Route path="*" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer position="bottom-right" autoClose={3000} />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;