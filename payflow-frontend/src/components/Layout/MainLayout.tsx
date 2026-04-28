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
    logout();
    navigate('/login');
  };

  const menuItems = [
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

    { text: 'Approvals', icon: <ThumbUp />, path: '/approvals', show: isAdmin },
    { text: 'Salary History', icon: <History />, path: '/salary-history', show: isHR },
    { text: 'Loans', icon: <AttachMoney />, path: '/loans', show: isHR },
    { text: 'Compliance', icon: <Gavel />, path: '/compliance', show: isHR },
    { text: 'Bulk Payroll', icon: <CloudUpload />, path: '/bulk-payroll', show: isHR },
    { text: 'Audit Logs', icon: <Security />, path: '/audit-logs', show: isAdmin },
    { text: 'Export Reports', icon: <FileDownload />, path: '/export', show: isHR },
  ].filter((item) => item.show !== false);

  const drawer = (
    <div>
      {/* Logo */}
      <Toolbar sx={{ justifyContent: 'center', py: 2 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            color: '#2563eb',
          }}
        >
          PayFlow
        </Typography>
      </Toolbar>

      <Divider />

      {/* Menu */}
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

                  '&:hover': {
                    backgroundColor: '#f1f5f9',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? '#2563eb' : '#64748b',
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>

                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: 500,
                  }}
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
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Payroll Management System
          </Typography>

          <NotificationBell />

          <IconButton onClick={handleMenuOpen}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#2563eb' }}>
              {user?.username.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem disabled>
              {user?.username} ({user?.role})
            </MenuItem>

            <Divider />

            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        {/* Mobile */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              backgroundColor: '#ffffff',
              borderRight: '1px solid #e2e8f0',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop */}
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              backgroundColor: '#ffffff',
              borderRight: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;