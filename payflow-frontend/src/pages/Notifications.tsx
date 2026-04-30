import React, { useEffect, useState, useCallback } from 'react';
import {
  Container, Typography, Box, Button, Chip, Checkbox, FormControlLabel,
  Tabs, Tab, Paper, Grid, Card, CardContent, CardActions, IconButton,
  Skeleton, Alert, Avatar, Tooltip
} from '@mui/material';
import {
  CheckCircle, NotificationsOff, Refresh,
  Delete, DoneAll
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

  const handleDelete = async (id: number) => {
    try {
      await notificationAPI.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setSelectedIds(prev => prev.filter(i => i !== id));
      toast.success('Notification deleted');
    } catch (err) {
      toast.error('Failed to delete notification');
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

  // Extract emoji from title (returns a string like "💰", or "🔔" as fallback)
  const extractEmoji = (title: string): string => {
    const trimmed = title.trimStart();
    if (trimmed.length === 0) return '🔔';
    const code = trimmed.codePointAt(0);
    if (code && code > 127) {
      return String.fromCodePoint(code);
    }
    return '🔔';
  };

  // Remove emoji prefix from title (so we don't show it twice)
  const cleanTitle = (title: string): string => {
    const trimmed = title.trimStart();
    if (trimmed.length === 0) return title;
    const code = trimmed.codePointAt(0);
    if (code && code > 127) {
      // Remove the first character (or two, if it's a surrogate pair)
      const emojiLen = String.fromCodePoint(code).length;
      return trimmed.slice(emojiLen).trimStart();
    }
    return title;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="text" width={300} height={60} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" action={<Button onClick={fetchNotifications}>Retry</Button>}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
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
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="All Notifications" />
          <Tab label={`Unread (${unreadCount})`} />
        </Tabs>
      </Paper>

      {/* Batch actions bar */}
      {selectedIds.length > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ flexGrow: 1 }}>
            {selectedIds.length} selected
          </Typography>
          <Button size="small" onClick={handleMarkSelectedAsRead} startIcon={<DoneAll />}>
            Mark as Read
          </Button>
          <Button
            size="small"
            color="error"
            onClick={handleDeleteSelected}
            startIcon={<Delete />}
            variant="contained"
          >
            Delete
          </Button>
        </Paper>
      )}

      {/* Notification Cards */}
      {filteredNotifications.length === 0 ? (
        <Paper sx={{ py: 8, textAlign: 'center', borderRadius: 2 }}>
          <NotificationsOff sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            {tabValue === 0 ? 'All clear! 🎉' : 'No unread notifications'}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            {tabValue === 0
              ? 'You have read all your notifications.'
              : 'Everything is caught up.'}
          </Typography>
          <Box display="flex" justifyContent="center" gap={2}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchNotifications}>
              Refresh
            </Button>
            {isHR && (
              <Button variant="contained" onClick={() => navigate('/payroll')}>
                Generate Payroll
              </Button>
            )}
          </Box>
        </Paper>
      ) : (
        <>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedIds.length === filteredNotifications.length && filteredNotifications.length > 0}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < filteredNotifications.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              }
              label="Select All"
            />
          </Box>
          <Grid container spacing={2}>
            {filteredNotifications.map((notification) => (
              <Grid item xs={12} sm={6} lg={4} key={notification.id}>
                <Card
                  sx={{
                    position: 'relative',
                    borderLeft: notification.is_read ? 'none' : '4px solid #1976d2',
                    transition: 'box-shadow 0.2s',
                    '&:hover': {
                      boxShadow: 4,
                      cursor: 'pointer',
                    },
                    bgcolor: notification.is_read ? 'background.paper' : '#f0f7ff',
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Selection checkbox */}
                  <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}>
                    <Checkbox
                      checked={selectedIds.includes(notification.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelect(notification.id);
                      }}
                      size="small"
                      sx={{ p: 0 }}
                    />
                  </Box>

                  {/* Delete button (top right corner) */}
                  <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <CardContent sx={{ pl: 5, pt: 4, pr: 5 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      {/* Only the emoji, no duplicate */}
                      <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32, fontSize: 18 }}>
                        {extractEmoji(notification.title)}
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={notification.is_read ? 400 : 600}>
                        {cleanTitle(notification.title)}
                      </Typography>
                      {!notification.is_read && (
                        <Chip
                          label="NEW"
                          color="primary"
                          size="small"
                          sx={{ ml: 'auto' }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, pl: 5 }}>
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ pl: 5 }}>
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </Typography>
                  </CardContent>

                  {/* Mark as read action (bottom right) */}
                  <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
                    {!notification.is_read && (
                      <Tooltip title="Mark as read">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Container>
  );
};

export default NotificationsPage;