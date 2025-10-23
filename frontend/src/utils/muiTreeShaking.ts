/**
 * Optimized Material-UI imports for tree shaking
 * This file ensures we only import what we need from Material-UI
 * to reduce bundle size
 */

// Core components - import only what's needed
export {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Paper,
  Container,
  Grid,
  Stack,
  Divider,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Badge,
  Skeleton,
  LinearProgress,
  CircularProgress,
  Alert,
  AlertTitle,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Radio,
  RadioGroup,
  Switch,
  Slider,
  Autocomplete,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  ListItemAvatar,
  ListSubheader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  AppBar,
  Toolbar,
  Drawer,
  CssBaseline,
  ThemeProvider,
  createTheme,
  useTheme,
  styled,
  alpha,
  useMediaQuery,
  useScrollTrigger,
  Fade,
  Grow,
  Slide,
  Zoom,
  Collapse,
  Backdrop,
  Modal,
  Popover,
  Popper,
  ClickAwayListener,
  Portal,
  NoSsr
} from '@mui/material';

// Icons - import only what's needed
export {
  // Navigation
  Menu as MenuIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Home as HomeIcon,
  Dashboard as DashboardIcon,
  
  // User & Profile
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  AccountCircle as AccountCircleIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  
  // Medical
  LocalHospital as HospitalIcon,
  MedicalServices as MedicalServicesIcon,
  MonitorHeart as MonitorHeartIcon,
  Favorite as HeartIcon,
  Science as ScienceIcon,
  LocalPharmacy as PharmacyIcon,
  
  // Actions
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  
  // Communication
  Phone as PhoneIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  Message as MessageIcon,
  
  // Time & Calendar
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  AccessTime as TimeIcon,
  
  // Status
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  
  // Navigation & UI
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  MoreVert as MoreVertIcon,
  MoreHoriz as MoreHorizIcon
} from '@mui/icons-material';

// Date pickers - import only what's needed
export {
  LocalizationProvider,
  DatePicker,
  TimePicker,
  DateTimePicker,
  StaticDatePicker,
  StaticTimePicker,
  StaticDateTimePicker
} from '@mui/x-date-pickers';

export { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Data grid - import only what's needed
export {
  DataGrid,
  GridColDef,
  GridRowsProp,
  GridRowParams,
  GridCellParams,
  GridToolbar,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport
} from '@mui/x-data-grid';

// Lab components - import only what's needed
export {
  LoadingButton,
  TabList,
  TabContext,
  TabPanel,
  Masonry,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';

// System - import only what's needed
export {
  createStyled,
  createTheme,
  createBreakpoints,
  createSpacing,
  createPalette,
  createTypography,
  createShadows,
  createTransitions,
  createZIndex,
  createMixins,
  createOverrides,
  createComponents
} from '@mui/system';