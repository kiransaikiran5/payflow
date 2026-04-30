import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Stack,
  Chip,
} from '@mui/material';

import {
  Menu as MenuIcon,
  Dashboard,
  People,
  AttachMoney,
  Receipt,
  Assessment,
  Logout,
  Calculate,
  CardGiftcard,
  AccessTime,
  AccountBalance,
  History,
  Gavel,
  CloudUpload,
  Security,
  FileDownload,
  ThumbUp,
  Notifications,
  Description,
  Schedule,
} from '@mui/icons-material';

import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';

const drawerWidth = 290;

const MainLayout: React.FC = () => {
  const { user, logout, isHR, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const menuItems = [
    // Phase 1
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Employees', icon: <People />, path: '/employees', show: isHR },
    { text: 'Salary Structure', icon: <Calculate />, path: '/salary-structure', show: isHR },
    { text: 'Attendance', icon: <AccessTime />, path: '/attendance', show: isHR },
    { text: 'My Attendance', icon: <AccessTime />, path: '/my-attendance', show: !isHR },
    { text: 'Payroll', icon: <AttachMoney />, path: '/payroll', show: isHR },
    { text: 'Bonuses', icon: <CardGiftcard />, path: '/bonuses', show: isHR },
    { text: 'Tax Management', icon: <AccountBalance />, path: '/tax', show: isHR },
    { text: 'Payslips', icon: <Receipt />, path: '/payslips' },
    { text: 'Reports', icon: <Assessment />, path: '/reports', show: isHR },
    { text: 'Notifications', icon: <Notifications />, path: '/notifications' },

    // Phase 2
    { text: 'Approvals', icon: <ThumbUp />, path: '/approvals', show: isAdmin },
    { text: 'Salary History', icon: <History />, path: '/salary-history', show: isHR },
    { text: 'Loans', icon: <AttachMoney />, path: '/loans', show: isHR },
    { text: 'Compliance', icon: <Gavel />, path: '/compliance', show: isHR },
    { text: 'Bulk Payroll', icon: <CloudUpload />, path: '/bulk-payroll', show: isHR },
    { text: 'Audit Logs', icon: <Security />, path: '/audit-logs', show: isAdmin },
    { text: 'Export Reports', icon: <FileDownload />, path: '/export', show: isHR },

    // Phase 3
    { text: 'Employee Services', icon: <Dashboard />, path: '/self-service', show: !isHR && !isAdmin },
    { text: 'Reimbursements', icon: <AttachMoney />, path: '/reimbursements', show: isHR || isAdmin },
    { text: 'Overtime', icon: <AccessTime />, path: '/overtime', show: isHR || isAdmin },
    { text: 'Tax Reports', icon: <Assessment />, path: '/tax-reports', show: isHR || isAdmin },
    { text: 'Disputes', icon: <Gavel />, path: '/disputes', show: isHR || isAdmin },
    { text: 'Documents', icon: <Description />, path: '/documents', show: isHR || isAdmin },
    { text: 'Analytics', icon: <Assessment />, path: '/analytics', show: isHR || isAdmin },
    { text: 'Payroll Schedule', icon: <Schedule />, path: '/payroll-schedule', show: isHR || isAdmin },
  ].filter((item) => item.show !== false);

  const drawer = (
    <div>
      <Toolbar sx={{ justifyContent: 'center', py: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2563eb' }}>
          PayFlow
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ mt: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  mx: 1,
                  my: 0.5,
                  borderRadius: 2,
                  backgroundColor: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#2563eb' : '#334155',
                  '&:hover': { backgroundColor: '#f1f5f9' },
                }}
              >
                <ListItemIcon sx={{ color: isActive ? '#2563eb' : '#64748b', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* Top Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: '#ffffff',
          color: '#1e293b',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <Toolbar>
          <IconButton edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 500 }}>
            Payroll Management System
          </Typography>

          {/* Notification Bell */}
          <NotificationBell />

          {/* User Info with Avatar */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ ml: 2 }}>
            <Chip
              label={user?.role}
              size="small"
              color={user?.role === 'ADMIN' ? 'error' : user?.role === 'HR' ? 'primary' : 'default'}
              variant="outlined"
            />
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" fontWeight={500} color="text.primary">
                {user?.username}
              </Typography>
            </Box>
            <IconButton onClick={handleMenuOpen} size="small">
              <Avatar sx={{ width: 36, height: 36, bgcolor: '#2563eb', fontWeight: 'bold' }}>
                {user?.username.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Stack>

          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { mt: 1, minWidth: 200, borderRadius: 2 } }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {user?.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={handleLogout}
              sx={{
                color: 'error.main',
                mx: 1,
                borderRadius: 1,
                '&:hover': { backgroundColor: '#fee2e2' },
              }}
            >
              <ListItemIcon>
                <Logout fontSize="small" color="error" />
              </ListItemIcon>
              <Typography variant="body2" fontWeight={600}>Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth, backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0' },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;