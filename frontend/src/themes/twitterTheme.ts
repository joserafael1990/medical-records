import { createTheme } from '@mui/material/styles';

// Tema inspirado en Twitter/X usando Material-UI
export const twitterTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1d9bf0', // Twitter blue
      light: '#5cbcf7',
      dark: '#1976d2',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#657786', // Twitter gray
      light: '#8899a6',
      dark: '#434b58',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f1419', // Twitter dark text
      secondary: '#536471', // Twitter light text
    },
    divider: '#eff3f4', // Twitter light border
    error: {
      main: '#f4212e', // Twitter red
    },
    warning: {
      main: '#ffad1f', // Twitter yellow
    },
    success: {
      main: '#00ba7c', // Twitter green
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 800,
      fontSize: '2rem',
    },
    h2: {
      fontWeight: 700,
      fontSize: '1.75rem',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.5rem',
    },
    h4: {
      fontWeight: 700,
      fontSize: '1.25rem',
    },
    h5: {
      fontWeight: 700,
      fontSize: '1.125rem',
    },
    h6: {
      fontWeight: 700,
      fontSize: '1rem',
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.3,
    },
    body2: {
      fontSize: '0.875rem',
      color: '#536471',
    },
    button: {
      fontWeight: 700,
      textTransform: 'none', // Twitter no usa mayúsculas
    },
  },
  shape: {
    borderRadius: 16, // Twitter rounded corners
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20, // Twitter pill buttons
          textTransform: 'none',
          fontWeight: 700,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            backgroundColor: '#1a8cd8',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #eff3f4',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #eff3f4',
          color: '#0f1419',
          boxShadow: 'none',
          '& .MuiToolbar-root': {
            minHeight: '64px',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: '#eff3f4',
            },
            '&:hover fieldset': {
              borderColor: '#1d9bf0',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1d9bf0',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontSize: '0.8125rem',
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #eff3f4',
          boxShadow: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: '1px solid #eff3f4',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: '12px !important',
          border: '1px solid #eff3f4',
          boxShadow: 'none',
          '&:before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: '8px 0',
          },
        },
      },
    },
  },
});

// Tema dark mode inspirado en Twitter
export const twitterDarkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1d9bf0',
      light: '#5cbcf7',
      dark: '#1976d2',
    },
    background: {
      default: '#000000',
      paper: '#16181c',
    },
    text: {
      primary: '#e7e9ea',
      secondary: '#71767b',
    },
    divider: '#2f3336',
  },
  // Inherit typography and components from light theme
  ...twitterTheme,
});
