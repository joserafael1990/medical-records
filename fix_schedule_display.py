#!/usr/bin/env python3

# Read the file
with open('frontend/src/components/views/DoctorProfileView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the schedule display logic
old_condition = '''            ) : scheduleData ? ('''
new_condition = '''            ) : scheduleData && Object.values(scheduleData).some(day => day && day.is_active) ? ('''

content = content.replace(old_condition, new_condition)

# Also add a fallback for when there's no schedule data but no error
old_else = '''            ) : (
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
            )}'''
new_else = '''            ) : scheduleData ? (
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
            )}'''

content = content.replace(old_else, new_else)

# Write the updated content back
with open('frontend/src/components/views/DoctorProfileView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Schedule display logic fixed!")

