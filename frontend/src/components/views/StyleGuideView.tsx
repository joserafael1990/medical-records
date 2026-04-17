import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Chip,
  Avatar,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  Slider,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Badge,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Palette as PaletteIcon,
  TextFormat as TypographyIcon,
  Widgets as WidgetsIcon,
  Animation as AnimationIcon,
  Code as CodeIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  LocalHospital as HospitalIcon,
  MedicalServices as MedicalServicesIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  Science as ScienceIcon,
  Favorite as HeartIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { twitterTheme } from '../../themes/twitterTheme';
import CortexLogo from '../common/CortexLogo';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`styleguide-tabpanel-${index}`}
      aria-labelledby={`styleguide-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const StyleGuideView: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(false);
  const [sliderValue, setSliderValue] = useState(30);
  const [autocompleteValue, setAutocompleteValue] = useState<string | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const colorPalette = [
    { name: 'Primary', color: twitterTheme.palette.primary.main, usage: 'Botones principales, enlaces' },
    { name: 'Secondary', color: twitterTheme.palette.secondary.main, usage: 'Elementos secundarios' },
    { name: 'Success', color: twitterTheme.palette.success.main, usage: 'Éxito, confirmaciones' },
    { name: 'Warning', color: twitterTheme.palette.warning.main, usage: 'Advertencias' },
    { name: 'Error', color: twitterTheme.palette.error.main, usage: 'Errores, alertas' },
    { name: 'Info', color: twitterTheme.palette.info?.main || '#1d9bf0', usage: 'Información' },
  ];

  const typographySamples = [
    { variant: 'h1', text: 'Heading 1 - Título Principal', weight: '800' },
    { variant: 'h2', text: 'Heading 2 - Título Secundario', weight: '700' },
    { variant: 'h3', text: 'Heading 3 - Subtítulo', weight: '700' },
    { variant: 'h4', text: 'Heading 4 - Sección', weight: '700' },
    { variant: 'h5', text: 'Heading 5 - Subsección', weight: '700' },
    { variant: 'h6', text: 'Heading 6 - Pequeño', weight: '700' },
    { variant: 'body1', text: 'Body 1 - Texto principal del contenido', weight: '400' },
    { variant: 'body2', text: 'Body 2 - Texto secundario y descripciones', weight: '400' },
    { variant: 'button', text: 'Button - Texto de botones', weight: '700' },
    { variant: 'caption', text: 'Caption - Texto pequeño y notas', weight: '400' },
  ];

  const buttonVariants = [
    { variant: 'contained', label: 'Contained', color: 'primary' },
    { variant: 'outlined', label: 'Outlined', color: 'primary' },
    { variant: 'text', label: 'Text', color: 'primary' },
    { variant: 'contained', label: 'Success', color: 'success' },
    { variant: 'contained', label: 'Warning', color: 'warning' },
    { variant: 'contained', label: 'Error', color: 'error' },
  ];

  const iconSamples = [
    { icon: PersonIcon, name: 'Person', usage: 'Usuarios, perfiles' },
    { icon: EmailIcon, name: 'Email', usage: 'Correo electrónico' },
    { icon: PhoneIcon, name: 'Phone', usage: 'Teléfonos' },
    { icon: HomeIcon, name: 'Home', usage: 'Direcciones' },
    { icon: WorkIcon, name: 'Work', usage: 'Trabajo, profesión' },
    { icon: SchoolIcon, name: 'School', usage: 'Educación' },
    { icon: HospitalIcon, name: 'Hospital', usage: 'Médico, salud' },
    { icon: MedicalServicesIcon, name: 'Medical Services', usage: 'Servicios médicos' },
    { icon: ScheduleIcon, name: 'Schedule', usage: 'Horarios, citas' },
    { icon: NotificationsIcon, name: 'Notifications', usage: 'Notificaciones' },
    { icon: SettingsIcon, name: 'Settings', usage: 'Configuración' },
    { icon: DashboardIcon, name: 'Dashboard', usage: 'Panel principal' },
    { icon: PeopleIcon, name: 'People', usage: 'Pacientes, usuarios' },
    { icon: CalendarIcon, name: 'Calendar', usage: 'Calendario' },
    { icon: ScienceIcon, name: 'Science', usage: 'Estudios clínicos' },
    { icon: HeartIcon, name: 'Heart', usage: 'Salud, vital' },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <CortexLogo variant="full" sx={{ mb: 2 }} />
        <Typography variant="h1" component="h1" gutterBottom>
          CORTEX Style Guide
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          Sistema de diseño completo para la aplicación médica CORTEX. 
          Incluye colores, tipografía, componentes, animaciones y guías de uso.
        </Typography>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="styleguide tabs">
          <Tab icon={<PaletteIcon />} label="Colores" />
          <Tab icon={<TypographyIcon />} label="Tipografía" />
          <Tab icon={<WidgetsIcon />} label="Componentes" />
          <Tab icon={<AnimationIcon />} label="Animaciones" />
          <Tab icon={<CodeIcon />} label="Código" />
        </Tabs>
      </Box>

      {/* Colors Tab */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h2" gutterBottom>
          🎨 Paleta de Colores
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Colores principales del sistema basados en el tema de Twitter, adaptados para el contexto médico.
        </Typography>
        
        <Grid container spacing={3}>
          {colorPalette.map((color, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      width: '100%',
                      height: 80,
                      backgroundColor: color.color,
                      borderRadius: 2,
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    {color.color}
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {color.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {color.usage}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Color Usage Examples */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h3" gutterBottom>
            Ejemplos de Uso
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                <CheckIcon sx={{ mr: 1 }} />
                Operación exitosa
              </Alert>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <WarningIcon sx={{ mr: 1 }} />
                Advertencia importante
              </Alert>
              <Alert severity="error" sx={{ mb: 2 }}>
                <ErrorIcon sx={{ mr: 1 }} />
                Error crítico
              </Alert>
              <Alert severity="info" sx={{ mb: 2 }}>
                <InfoIcon sx={{ mr: 1 }} />
                Información útil
              </Alert>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip label="Paciente Activo" color="primary" />
                <Chip label="Cita Programada" color="secondary" />
                <Chip label="Completado" color="success" />
                <Chip label="Pendiente" color="warning" />
                <Chip label="Cancelado" color="error" />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </TabPanel>

      {/* Typography Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h2" gutterBottom>
          📝 Tipografía
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Sistema tipográfico basado en Inter y fuentes del sistema para máxima legibilidad.
        </Typography>

        <Grid container spacing={3}>
          {typographySamples.map((sample, index) => (
            <Grid key={index} size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant={sample.variant as any} gutterBottom>
                    {sample.text}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {sample.variant} • Font Weight: {sample.weight} • Font Family: Inter, -apple-system, BlinkMacSystemFont
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Typography Scale */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h3" gutterBottom>
            Escala Tipográfica
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Elemento</TableCell>
                  <TableCell>Tamaño</TableCell>
                  <TableCell>Peso</TableCell>
                  <TableCell>Uso</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>H1</TableCell>
                  <TableCell>2rem (32px)</TableCell>
                  <TableCell>800</TableCell>
                  <TableCell>Títulos principales</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>H2</TableCell>
                  <TableCell>1.75rem (28px)</TableCell>
                  <TableCell>700</TableCell>
                  <TableCell>Títulos de sección</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>H3</TableCell>
                  <TableCell>1.5rem (24px)</TableCell>
                  <TableCell>700</TableCell>
                  <TableCell>Subtítulos</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Body1</TableCell>
                  <TableCell>0.9375rem (15px)</TableCell>
                  <TableCell>400</TableCell>
                  <TableCell>Texto principal</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Body2</TableCell>
                  <TableCell>0.875rem (14px)</TableCell>
                  <TableCell>400</TableCell>
                  <TableCell>Texto secundario</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </TabPanel>

      {/* Components Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h2" gutterBottom>
          🧩 Componentes
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Biblioteca completa de componentes Material-UI personalizados para CORTEX.
        </Typography>

        {/* Buttons */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" gutterBottom>
            Botones
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            {buttonVariants.map((button, index) => (
              <Button
                key={index}
                variant={button.variant as any}
                color={button.color as any}
                startIcon={<SaveIcon />}
              >
                {button.label}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Form Controls */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" gutterBottom>
            Controles de Formulario
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Campo de texto"
                placeholder="Escribe aquí..."
                helperText="Texto de ayuda"
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Selección</InputLabel>
                <Select value="option1" label="Selección">
                  <MenuItem value="option1">Opción 1</MenuItem>
                  <MenuItem value="option2">Opción 2</MenuItem>
                  <MenuItem value="option3">Opción 3</MenuItem>
                </Select>
              </FormControl>
              <Autocomplete
                options={['Opción A', 'Opción B', 'Opción C']}
                value={autocompleteValue}
                onChange={(event, newValue) => setAutocompleteValue(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Autocompletado" />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={switchChecked}
                    onChange={(e) => setSwitchChecked(e.target.checked)}
                  />
                }
                label="Interruptor"
                sx={{ mb: 2 }}
              />
              <Typography gutterBottom>Deslizador: {sliderValue}</Typography>
              <Slider
                value={sliderValue}
                onChange={(e, newValue) => setSliderValue(newValue as number)}
                min={0}
                max={100}
                valueLabelDisplay="auto"
              />
            </Grid>
          </Grid>
        </Box>

        {/* Cards and Content */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" gutterBottom>
            Tarjetas y Contenido
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Tarjeta Simple
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Contenido de ejemplo en una tarjeta con bordes redondeados.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Papel Simple
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Contenido en un papel con elevación sutil.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Icons */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" gutterBottom>
            Iconos
          </Typography>
          <Grid container spacing={2}>
            {iconSamples.map((iconItem, index) => (
              <Grid key={index} size={{ xs: 6, sm: 4, md: 3 }}>
                <Card sx={{ textAlign: 'center', p: 2 }}>
                  <iconItem.icon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
                  <Typography variant="body2" gutterBottom>
                    {iconItem.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {iconItem.usage}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Navigation Components */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" gutterBottom>
            Navegación
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="h6" gutterBottom>
                Chips
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                <Chip label="Default" />
                <Chip label="Primary" color="primary" />
                <Chip label="Secondary" color="secondary" />
                <Chip label="Success" color="success" />
                <Chip label="Warning" color="warning" />
                <Chip label="Error" color="error" />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="h6" gutterBottom>
                Avatares
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Avatar><PersonIcon /></Avatar>
                <Avatar sx={{ bgcolor: 'primary.main' }}>JD</Avatar>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>MG</Avatar>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={<CheckIcon sx={{ color: 'success.main', fontSize: 12 }} />}
                >
                  <Avatar sx={{ bgcolor: 'success.main' }}>AC</Avatar>
                </Badge>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Progress Indicators */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" gutterBottom>
            Indicadores de Progreso
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="h6" gutterBottom>
                Circular Progress
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <CircularProgress size={24} />
                <CircularProgress size={24} color="secondary" />
                <CircularProgress size={24} color="success" />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="h6" gutterBottom>
                Linear Progress
              </Typography>
              <LinearProgress sx={{ mb: 1 }} />
              <LinearProgress color="secondary" sx={{ mb: 1 }} />
              <LinearProgress color="success" />
            </Grid>
          </Grid>
        </Box>

        {/* Dialog Example */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" gutterBottom>
            Diálogos
          </Typography>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Abrir Diálogo de Ejemplo
          </Button>
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon color="primary" />
                Diálogo de Ejemplo
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1">
                Este es un ejemplo de diálogo con el tema de CORTEX aplicado.
                Incluye bordes redondeados, espaciado consistente y colores del sistema.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button variant="contained" onClick={() => setDialogOpen(false)}>
                Confirmar
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </TabPanel>

      {/* Animations Tab */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h2" gutterBottom>
          ✨ Animaciones
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Transiciones y animaciones suaves para mejorar la experiencia de usuario.
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card sx={{ 
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
              }
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Hover Animation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pasa el mouse sobre esta tarjeta para ver la animación.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card sx={{
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.7 },
                '100%': { opacity: 1 }
              }
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Pulse Animation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Esta tarjeta tiene una animación de pulso continua.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Loading States */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h3" gutterBottom>
            Estados de Carga
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Skeleton Loading
                  </Typography>
                  <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Circular Progress
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Linear Progress
                  </Typography>
                  <LinearProgress sx={{ mt: 2 }} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </TabPanel>

      {/* Code Tab */}
      <TabPanel value={tabValue} index={4}>
        <Typography variant="h2" gutterBottom>
          💻 Guías de Código
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Mejores prácticas y patrones de código para mantener consistencia en el desarrollo.
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Estructura de Componentes
                </Typography>
                <Box sx={{ 
                  backgroundColor: '#f5f5f5', 
                  p: 2, 
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }}>
                  {`// Estructura recomendada
import React from 'react';
import { ComponentProps } from '@mui/material';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

const MyComponent: React.FC<MyComponentProps> = ({
  title,
  onAction
}) => {
  return (
    <Box>
      <Typography variant="h6">{title}</Typography>
      <Button onClick={onAction}>Action</Button>
    </Box>
  );
};`}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Uso de Tema
                </Typography>
                <Box sx={{ 
                  backgroundColor: '#f5f5f5', 
                  p: 2, 
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }}>
                  {`// Acceso a colores del tema
const MyComponent = () => {
  return (
    <Box sx={{
      color: 'primary.main',
      backgroundColor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider'
    }}>
      <Typography color="text.primary">
        Texto principal
      </Typography>
    </Box>
  );
};`}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Best Practices */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h3" gutterBottom>
            Mejores Prácticas
          </Typography>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Consistencia Visual</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Usa siempre el tema de Twitter para consistencia" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Mantén espaciado consistente (múltiplos de 8px)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Usa bordes redondeados (borderRadius: 12-16px)" />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Accesibilidad</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Usa contraste adecuado (mínimo 4.5:1)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Incluye texto alternativo en imágenes" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Usa etiquetas semánticas apropiadas" />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Performance</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Usa lazy loading para componentes pesados" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Optimiza imágenes y assets" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Implementa memoización cuando sea necesario" />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>
          
          {/* Cursor AI Rules */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">🤖 Reglas del Cursor AI</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom color="primary">
                    <strong>Comunicación y Documentación</strong>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="Comunicación en español, código en inglés" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="NUNCA crear archivos .md a menos que se solicite" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="Commits en inglés: feat:, fix:, refactor:" />
                    </ListItem>
                  </List>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom color="primary">
                    <strong>Desarrollo y Compilación</strong>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="TODAS las compilaciones con Docker" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="Máximo 100 líneas por función" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="Máximo 300 líneas por componente" />
                    </ListItem>
                  </List>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom color="primary">
                    <strong>Backend (FastAPI + Python)</strong>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="Siempre usar async def para endpoints" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="get_current_user dependency para auth" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="now_cdmx() para timestamps" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="encrypt_sensitive_data() para datos médicos" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="api_logger con emojis y contexto" />
                    </ListItem>
                  </List>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom color="primary">
                    <strong>Frontend (React + TypeScript)</strong>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="Custom hooks para lógica compleja" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="useScrollToError para errores" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="Errores en rojo (#d32f2f)" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="jspdf para PDFs con header/footer" />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Medical System Patterns */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">🏥 Patrones del Sistema Médico</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom color="primary">
                    <strong>Validación Médica</strong>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="useRealTimeValidation con debounce 500ms" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="Validaciones CURP, RFC, teléfonos mexicanos" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="Signos vitales con rangos por edad" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="medicalErrorMessages.ts para mensajes humanizados" />
                    </ListItem>
                  </List>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom color="primary">
                    <strong>Manejo de Errores</strong>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="ErrorBoundary para errores de React" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="useToast para feedback inmediato" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="useSmartLoading para estados específicos" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                      <ListItemText primary="useFormErrorNavigation para scroll automático" />
                    </ListItem>
                  </List>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" gutterBottom color="primary">
                    <strong>Estructura de Archivos</strong>
                  </Typography>
                  <Box sx={{ 
                    backgroundColor: '#f5f5f5', 
                    p: 2, 
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem'
                  }}>
                    {`frontend/src/
├── components/
│   ├── common/          # Componentes reutilizables
│   ├── dialogs/         # Modales y diálogos
│   ├── layout/          # Layout components
│   └── views/           # Vistas principales
├── hooks/               # Custom hooks (use*)
├── services/            # API services
├── utils/               # Utilidades y helpers
├── types/               # TypeScript interfaces
└── themes/              # Temas de Material-UI`}
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>
      </TabPanel>
    </Container>
  );
};

export default StyleGuideView;
