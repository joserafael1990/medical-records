#!/usr/bin/env python3

import re

# Read the file
with open('frontend/src/components/views/DoctorProfileView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the Quick Actions section with Schedule Management
old_section = '''        {/* Schedule Management */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon color="primary" />
              Acciones Rápidas
                  </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<ScheduleIcon />}
                onClick={() => setScheduleConfigDialogOpen(true)}
                sx={{ borderRadius: '8px' }}
              >
                Configurar Horarios
              </Button>
                </Box>
              </CardContent>
            </Card>'''

new_section = '''        {/* Schedule Management */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon color="primary" />
                Horarios
              </Typography>
            </Box>
            
            <Card 
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
            </Card>
          </CardContent>
        </Card>'''

# Use regex to find and replace the section
pattern = r'        /\* Schedule Management \*/\s*<Card sx=\{\{ mt: 3 \}\}>.*?</Card>'
content = re.sub(pattern, new_section, content, flags=re.DOTALL)

# Write the updated content back
with open('frontend/src/components/views/DoctorProfileView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ DoctorProfileView.tsx updated successfully!")
