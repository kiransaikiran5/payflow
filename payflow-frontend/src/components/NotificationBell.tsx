import React, { useState, useEffect, useCallback } from 'react';
import {
  IconButton, Badge, Menu, MenuItem, Typography, Box,
  Divider, ListItemText, Button, CircularProgress
} from '@mui/material';
import {
  Notifications, DoneAll,
   FiberManualRecord
} from '@mui/icons-material';
import { notificationAPI } from '../services/api';
import { Notification } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationAPI.getAll(true);
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => setAnchorEl(null);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationAPI.markAsRead(id);
      fetchNotifications();
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await notificationAPI.markAllAsRead();
      fetchNotifications();
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.title.includes('Payslip')) {
      navigate('/payslips');
    } else if (notification.title.includes('Payroll') || notification.title.includes('Salary')) {
      navigate('/dashboard');
    } else if (notification.title.includes('Bonus')) {
      navigate('/bonuses');
    } else if (notification.title.includes('Attendance')) {
      navigate('/my-attendance');
    }
    
    handleClose();
  };

  const getNotificationIcon = (title: string) => {
    if (title.includes('💰') || title.includes('Salary')) return '💰';
    if (title.includes('📄') || title.includes('Payslip')) return '📄';
    if (title.includes('🎁') || title.includes('Bonus')) return '🎁';
    if (title.includes('⚠️') || title.includes('Attendance')) return '⚠️';
    if (title.includes('✅')) return '✅';
    return '🔔';
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        sx={{ '& .MuiPaper-root': { width: 400, maxHeight: 500 } }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          <Box>
            {unreadCount > 0 && (
              <Button size="small" onClick={handleMarkAllRead} disabled={loading}>
                <DoneAll fontSize="small" sx={{ mr: 0.5 }} />
                Mark all read
              </Button>
            )}
          </Box>
        </Box>
        
        <Divider />
        
        {loading && notifications.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">No notifications</Typography>
          </Box>
        ) : (
          <>
            {notifications.slice(0, 20).map((notif: Notification) => (
              <MenuItem
                key={notif.id}
                sx={{
                  backgroundColor: notif.is_read ? 'transparent' : 'action.hover',
                  whiteSpace: 'normal',
                  py: 1.5,
                  borderLeft: notif.is_read ? 'none' : '4px solid #1976d2'
                }}
                onClick={() => handleNotificationClick(notif)}
              >
                <Box sx={{ display: 'flex', width: '100%' }}>
                  <Box sx={{ mr: 1.5, fontSize: '1.5rem' }}>
                    {getNotificationIcon(notif.title)}
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" component="span">
                          {notif.title}
                        </Typography>
                        {!notif.is_read && (
                          <FiberManualRecord color="primary" sx={{ fontSize: 10 }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" component="span">
                          {notif.message}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                        </Typography>
                      </>
                    }
                  />
                </Box>
              </MenuItem>
            ))}
            
            {notifications.length > 20 && (
              <Box sx={{ p: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">
                  Showing 20 of {notifications.length} notifications
                </Typography>
              </Box>
            )}
            
            <Divider />
            
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
              <Button
                size="small"
                onClick={() => { navigate('/notifications'); handleClose(); }}
              >
                View All
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;