import React from 'react';
import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import type { DashboardMetrics } from '../../../services/analytics/AnalyticsService';

interface MetricsCardsProps {
  metrics: DashboardMetrics;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics }) => {
  const { patients, consultations, appointments, occupation } = metrics;

  const cards = [
    {
      title: 'Total de Pacientes',
      value: patients.total,
      subtitle: `${patients.newThisMonth} nuevos este mes`,
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2'
    },
    {
      title: 'Consultas',
      value: consultations.thisMonth,
      subtitle: `Promedio: ${consultations.averagePerDay.toFixed(1)} por día`,
      trend: consultations.trend,
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32'
    },
    {
      title: 'Citas Hoy',
      value: appointments.today,
      subtitle: `${appointments.thisWeek} esta semana`,
      icon: <CalendarIcon sx={{ fontSize: 40 }} />,
      color: '#ed6c02'
    },
    {
      title: 'Horas Trabajadas',
      value: `${occupation.hoursWorkedThisMonth}h`,
      subtitle: `${occupation.appointmentsCompleted} citas completadas`,
      icon: <TimeIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0'
    }
  ];

  return (
    <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 3 }}>
      {cards.map((card, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: 2,
                  flex: 1
                }}
              >
                <Box>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    sx={{
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      letterSpacing: 0.5
                    }}
                    gutterBottom
                  >
                    {card.title}
                  </Typography>
                  <Typography
                    variant="h4"
                    component="div"
                    sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '1.8rem', md: '2.125rem' } }}
                  >
                    {card.value}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: { xs: 0.5, sm: 1 }
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      {card.subtitle}
                    </Typography>
                    {card.trend !== undefined && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {card.trend >= 0 ? (
                          <TrendingUp sx={{ fontSize: 16, color: '#2e7d32' }} />
                        ) : (
                          <TrendingDown sx={{ fontSize: 16, color: '#d32f2f' }} />
                        )}
                        <Typography
                          variant="body2"
                          sx={{ color: card.trend >= 0 ? '#2e7d32' : '#d32f2f' }}
                        >
                          {Math.abs(card.trend).toFixed(1)}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
                <Box
                  sx={{
                    backgroundColor: `${card.color}15`,
                    borderRadius: '50%',
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    alignSelf: { xs: 'flex-start', sm: 'center' }
                  }}
                >
                  <Box sx={{ color: card.color }}>{card.icon}</Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

