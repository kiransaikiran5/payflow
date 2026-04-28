import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Box,
  Button,
  Chip,
  IconButton,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  FiberManualRecord,
  CheckCircle,
  NotificationsOff,
  Refresh,
} from '@mui/icons-material';
import { notificationAPI } from '../services/api';
import { Notification } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotificationsPage: React.FC = () => {
  const { isHR } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationAPI.getAll(false);
      const data = Array.isArray(res.data) ? res.data : [];
      setNotifications(data);
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Failed to load notifications.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkSelectedAsRead = async () => {
    try {
      await Promise.all(selectedIds.map(id => notificationAPI.markAsRead(id)));
      toast.success(`Marked ${selectedIds.length} as read`);
      setSelectedIds([]);
      setNotifications(prev =>
        prev.map(n => (selectedIds.includes(n.id) ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      toast.success('All notifications marked as read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDeleteSelected = async () => {
    try {
      await Promise.all(selectedIds.map(id => notificationAPI.delete(id)));
      toast.success(`Deleted ${selectedIds.length} notifications`);
      setNotifications(prev => prev.filter(n => !selectedIds.includes(n.id)));
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to delete notifications');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete all notifications?')) return;
    try {
      await notificationAPI.deleteAll();
      toast.success('All notifications deleted');
      setNotifications([]);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to delete notifications');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredNotifications.map(n => n.id) : []);
  };

  const handleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    const title = notification.title.toLowerCase();
    if (title.includes('payslip')) navigate('/payslips');
    else if (title.includes('bonus')) navigate('/bonuses');
    else if (title.includes('attendance')) navigate('/my-attendance');
    else if (title.includes('payroll')) navigate('/payroll');
  };

  const filteredNotifications = notifications.filter(n =>
    tabValue === 0 ? true : !n.is_read
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (title: string): string => {
    const trimmed = title.trimStart();
    if (trimmed.length === 0) return '🔔';
    const firstChar = trimmed.charAt(0);
    if (firstChar.charCodeAt(0) > 127) return firstChar;
    if (firstChar >= '\uD800' && firstChar <= '\uDBFF' && trimmed.length > 1) {
      return trimmed.substring(0, 2);
    }
    return '🔔';
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="text" width={300} height={60} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={400} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" action={<Button onClick={fetchNotifications}>Retry</Button>}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h4">Notifications</Typography>
          {unreadCount > 0 && (
            <Chip label={`${unreadCount} unread`} color="primary" size="small" />
          )}
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            Mark All Read
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleDeleteAll}
            disabled={notifications.length === 0}
          >
            Clear All
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="All Notifications" />
          <Tab label={`Unread (${unreadCount})`} />
        </Tabs>
      </Paper>

      {/* Batch actions */}
      {selectedIds.length > 0 && (
        <Paper sx={{ p: 1, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ flexGrow: 1 }}>
            {selectedIds.length} selected
          </Typography>
          <Button size="small" onClick={handleMarkSelectedAsRead}>
            Mark as Read
          </Button>
          <Button size="small" color="error" onClick={handleDeleteSelected}>
            Delete
          </Button>
        </Paper>
      )}

      {/* Notifications list */}
      <Paper>
        {filteredNotifications.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <NotificationsOff sx={{ fontSize: 48, color: 'action.disabled', mb: 1 }} />
            <Typography color="textSecondary" gutterBottom>
              {tabValue === 0 ? 'No notifications yet.' : 'No unread notifications.'}
            </Typography>
            <Box display="flex" justifyContent="center" gap={2} mt={2}>
              <Button variant="outlined" startIcon={<Refresh />} onClick={fetchNotifications}>
                Refresh
              </Button>
              {isHR && (
                <Button variant="contained" onClick={() => navigate('/payroll')}>
                  Generate Payroll
                </Button>
              )}
            </Box>
            <Typography variant="caption" color="textSecondary" display="block" mt={1}>
              {isHR
                ? 'Try generating a payroll or updating compliance to trigger notifications.'
                : 'You will see notifications when your payroll is processed or your profile is updated.'}
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      selectedIds.length === filteredNotifications.length &&
                      filteredNotifications.length > 0
                    }
                    indeterminate={
                      selectedIds.length > 0 &&
                      selectedIds.length < filteredNotifications.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                }
                label="Select All"
              />
            </Box>
            <List disablePadding>
              {filteredNotifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      backgroundColor: notification.is_read ? 'transparent' : 'action.hover',
                      borderLeft: notification.is_read ? 'none' : '4px solid #1976d2',
                      py: 2,
                    }}
                    secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={selectedIds.includes(notification.id)}
                        onChange={() => handleSelect(notification.id)}
                      />
                    }
                  >
                    <Box
                      onClick={() => handleNotificationClick(notification)}
                      sx={{
                        display: 'flex',
                        width: '100%',
                        cursor: 'pointer',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box sx={{ mr: 2, fontSize: '2rem', minWidth: 40, textAlign: 'center' }}>
                        {getNotificationIcon(notification.title)}
                      </Box>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1">
                              {notification.title}
                            </Typography>
                            {!notification.is_read && (
                              <Chip
                                label="NEW"
                                color="primary"
                                size="small"
                                icon={<FiberManualRecord sx={{ fontSize: 10 }} />}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <>
                            {/* Fixed: set component="span" to avoid nested <p> tags */}
                            <Typography variant="body2" component="span" sx={{ mt: 0.5, display: 'block' }}>
                              {notification.message}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              component="span"
                              sx={{ mt: 0.5, display: 'block' }}
                            >
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </Typography>
                          </>
                        }
                      />
                      {!notification.is_read && (
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          title="Mark as read"
                          size="small"
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </ListItem>
                  {index < filteredNotifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default NotificationsPage;