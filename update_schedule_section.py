#!/usr/bin/env python3

# Read the file
with open('frontend/src/components/views/DoctorProfileView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add the schedule hook after useOfficeManagement
old_section = '''  } = useOfficeManagement();

  // Office management functions'''

new_section = '''  } = useOfficeManagement();

  // Schedule data hook
  const { 
    scheduleData, 
    loading: scheduleLoading, 
    error: scheduleError,
    refetch: refetchSchedule
  } = useScheduleData();

  // Office management functions'''

content = content.replace(old_section, new_section)

# Now update the schedule section to show actual schedule data
old_schedule_section = '''            <Card 
              variant="outlined" 
              sx={{ 
                p: 3, 
                bgcolor: 'primary.50',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'primary.100',
                  transform: 'translateY(-2px)',
                  boxShadow: 2
                },
                transition: 'all 0.2s ease-in-out'
              }}
              onClick={() => setScheduleConfigDialogOpen(true)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <ScheduleIcon />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Configurar Horarios de Atención
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Establece tus horarios de disponibilidad para cada día de la semana
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label="Lunes - Viernes" 
                      color="primary" 
                      size="small" 
                      variant="outlined"
                    />
                    <Chip 
                      label="Sábados" 
                      color="secondary" 
                      size="small" 
                      variant="outlined"
                    />
                    <Chip 
                      label="Domingos" 
                      color="default" 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<EditIcon />}
                    sx={{ borderRadius: '8px' }}
                  >
                    Configurar
                  </Button>
                </Box>
              </Box>
            </Card>'''

new_schedule_section = '''            {scheduleLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : scheduleError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                Error al cargar horarios: {scheduleError}
              </Alert>
            ) : scheduleData ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(200px, 1fr))' }, gap: 2 }}>
                {Object.entries(scheduleData).map(([day, schedule]) => {
                  if (!schedule || !schedule.is_active) return null;
                  
                  const dayNames = {
                    monday: 'Lunes',
                    tuesday: 'Martes', 
                    wednesday: 'Miércoles',
                    thursday: 'Jueves',
                    friday: 'Viernes',
                    saturday: 'Sábado',
                    sunday: 'Domingo'
                  };
                  
                  const timeBlocks = schedule.time_blocks || [];
                  
                  return (
                    <Card 
                      key={day}
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        bgcolor: 'primary.50',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'primary.100',
                          transform: 'translateY(-2px)',
                          boxShadow: 2
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                      onClick={() => setScheduleConfigDialogOpen(true)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <ScheduleIcon color="primary" sx={{ fontSize: 20 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                          {dayNames[day as keyof typeof dayNames]}
                        </Typography>
                      </Box>
                      
                      {timeBlocks.length > 0 ? (
                        <Box>
                          {timeBlocks.map((block, index) => (
                            <Chip
                              key={index}
                              label={`${block.start_time} - ${block.end_time}`}
                              color="primary"
                              size="small"
                              variant="outlined"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Sin horarios configurados
                        </Typography>
                      )}
                    </Card>
                  );
                })}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No hay horarios configurados
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                  onClick={() => setScheduleConfigDialogOpen(true)}
                  sx={{ mt: 1 }}
                >
                  Configurar Horarios
                </Button>
              </Box>
            )}
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setScheduleConfigDialogOpen(true)}
                sx={{ borderRadius: '8px' }}
              >
                {scheduleData ? 'Editar Horarios' : 'Configurar Horarios'}
              </Button>
            </Box>'''

content = content.replace(old_schedule_section, new_schedule_section)

# Write the updated content back
with open('frontend/src/components/views/DoctorProfileView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Schedule section updated successfully!")