import React from 'react';
import { Container, Typography, Grid, Paper, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Receipt, AttachMoney, AccessTime, Assessment, Gavel, Description
} from '@mui/icons-material';

const EmployeeSelfService: React.FC = () => {
  const navigate = useNavigate();

  const cards = [
    { title: 'My Payslips', icon: <Receipt />, path: '/payslips' },
    { title: 'Expense Reimbursements', icon: <AttachMoney />, path: '/reimbursements' },
    { title: 'Overtime Summary', icon: <AccessTime />, path: '/overtime' },
    { title: 'Tax Reports', icon: <Assessment />, path: '/tax-reports' },
    { title: 'Raise a Dispute', icon: <Gavel />, path: '/disputes' },
    { title: 'Documents', icon: <Description />, path: '/documents' },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Employee Self‑Service Portal
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your payroll, reimbursements, overtime, tax reports, disputes, and documents all in one place.
      </Typography>
      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
            <Paper
              sx={{
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => navigate(card.path)}
            >
              <Box sx={{ fontSize: 40, color: 'primary.main' }}>{card.icon}</Box>
              <Typography variant="h6" sx={{ mt: 1 }}>{card.title}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default EmployeeSelfService;