// Tree shaking optimization for MUI imports
// Instead of importing the entire MUI library, import only what we need

// Core components - import individually
export {
  Box,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  Chip,
  Avatar,
  LinearProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  Container,
  AppBar,
  Toolbar,
  CircularProgress
} from '@mui/material';

// Icons - import individually
export {
  MedicalServices as MedicalIcon,
  Dashboard as DashboardIcon,
  People as PatientIcon,
  CalendarToday as CalendarIcon,
  Speed as SpeedIcon,
  Message as MessageIcon,
  Check as CheckIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

// Theme
export { ThemeProvider, createTheme } from '@mui/material/styles';
export { default as CssBaseline } from '@mui/material/CssBaseline';
