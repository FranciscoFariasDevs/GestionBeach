// frontend/src/theme.js
import { createTheme, alpha } from '@mui/material/styles';

// Definimos el array completo de sombras
const createShadows = () => {
  const baseShadow = '0px 3px 5px rgba(0, 0, 0, 0.02), 0px 0px 2px rgba(0, 0, 0, 0.05)';
  
  // Creamos un array con las 25 sombras que MUI espera (0-24)
  return [
    'none', // 0 - sin sombra
    `0px 1px 2px rgba(0, 0, 0, 0.04)`, // 1
    `0px 1px 3px rgba(0, 0, 0, 0.05), ${baseShadow}`, // 2
    `0px 2px 4px rgba(0, 0, 0, 0.06), ${baseShadow}`, // 3
    `0px 3px 5px rgba(0, 0, 0, 0.07), ${baseShadow}`, // 4
    `0px 4px 6px rgba(0, 0, 0, 0.08), ${baseShadow}`, // 5
    `0px 5px 7px rgba(0, 0, 0, 0.09), ${baseShadow}`, // 6
    `0px 6px 8px rgba(0, 0, 0, 0.10), ${baseShadow}`, // 7
    `0px 7px 10px rgba(0, 0, 0, 0.11), ${baseShadow}`, // 8
    `0px 8px 12px rgba(0, 0, 0, 0.12), ${baseShadow}`, // 9
    `0px 9px 14px rgba(0, 0, 0, 0.13), ${baseShadow}`, // 10
    `0px 10px 16px rgba(0, 0, 0, 0.14), ${baseShadow}`, // 11
    `0px 11px 18px rgba(0, 0, 0, 0.15), ${baseShadow}`, // 12
    `0px 12px 20px rgba(0, 0, 0, 0.16), ${baseShadow}`, // 13
    `0px 13px 22px rgba(0, 0, 0, 0.17), ${baseShadow}`, // 14
    `0px 14px 24px rgba(0, 0, 0, 0.18), ${baseShadow}`, // 15
    `0px 15px 26px rgba(0, 0, 0, 0.19), ${baseShadow}`, // 16
    `0px 16px 28px rgba(0, 0, 0, 0.20), ${baseShadow}`, // 17
    `0px 17px 30px rgba(0, 0, 0, 0.21), ${baseShadow}`, // 18
    `0px 18px 32px rgba(0, 0, 0, 0.22), ${baseShadow}`, // 19
    `0px 19px 34px rgba(0, 0, 0, 0.23), ${baseShadow}`, // 20
    `0px 20px 36px rgba(0, 0, 0, 0.24), ${baseShadow}`, // 21
    `0px 21px 38px rgba(0, 0, 0, 0.25), ${baseShadow}`, // 22
    `0px 22px 40px rgba(0, 0, 0, 0.26), ${baseShadow}`, // 23
    `0px 23px 42px rgba(0, 0, 0, 0.27), ${baseShadow}`, // 24
  ];
};

// Paleta de colores elegante con naranja como color principal
const theme = createTheme({
  palette: {
    primary: {
      main: '#FF7A00', // Naranja vibrante como color principal
      light: '#FFA84D',
      dark: '#E05F00',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2D3748', // Gris azulado oscuro
      light: '#4A5568',
      dark: '#1A202C',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F7FAFC', // Gris muy claro para el fondo
      paper: '#FFFFFF',
    },
    success: {
      main: '#38A169', // Verde elegante
      light: '#68D391',
      dark: '#276749',
    },
    info: {
      main: '#3182CE', // Azul claro
      light: '#63B3ED',
      dark: '#2B6CB0',
    },
    warning: {
      main: '#F6AD55', // Naranja claro
      light: '#FBD38D',
      dark: '#DD6B20',
    },
    error: {
      main: '#E53E3E', // Rojo más suave
      light: '#FC8181',
      dark: '#C53030',
    },
    text: {
      primary: '#2D3748', // Texto principal en gris azulado oscuro
      secondary: '#718096', // Texto secundario en gris medio
    },
    divider: '#E2E8F0', // Divisor claro
  },
  typography: {
    fontFamily: [
      'Inter',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.7,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      fontSize: '0.875rem',
    },
  },
  shape: {
    borderRadius: 10,
  },
  // Establecer array completo de sombras
  shadows: createShadows(),
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F7FAFC',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#F1F1F1',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#BBBBBB',
            borderRadius: '4px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(90deg, #FF7A00 0%, #FF9F45 100%)', // Gradiente naranja elegante
          boxShadow: '0 4px 10px rgba(255, 122, 0, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 14px rgba(255, 122, 0, 0.4)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.06)',
          borderRadius: 16,
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            boxShadow: '0 12px 20px rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '20px 24px 16px',
        },
        title: {
          fontSize: '1.25rem',
          fontWeight: 600,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '0px 24px 24px',
          '&:last-child': {
            paddingBottom: 24,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16,
        },
        elevation1: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#FF7A00', 0.05),
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #E2E8F0',
          padding: '16px 24px',
        },
        head: {
          fontWeight: 600,
          color: '#2D3748',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: alpha('#FF7A00', 0.02),
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& fieldset': {
            borderColor: '#E2E8F0',
          },
          '&:hover fieldset': {
            borderColor: '#FF7A00',
          },
        },
        notchedOutline: {
          borderColor: '#E2E8F0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minWidth: 0,
          paddingLeft: 20,
          paddingRight: 20,
          '&.Mui-selected': {
            color: '#FF7A00',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
        colorPrimary: {
          backgroundColor: alpha('#FF7A00', 0.12),
          color: '#FF7A00',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '12px 16px',
        },
        standardSuccess: {
          backgroundColor: alpha('#38A169', 0.1),
          color: '#276749',
        },
        standardError: {
          backgroundColor: alpha('#E53E3E', 0.1),
          color: '#C53030',
        },
        standardWarning: {
          backgroundColor: alpha('#F6AD55', 0.1),
          color: '#DD6B20',
        },
        standardInfo: {
          backgroundColor: alpha('#3182CE', 0.1),
          color: '#2B6CB0',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#E2E8F0',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          fontWeight: 600,
        },
        colorDefault: {
          backgroundColor: alpha('#FF7A00', 0.1),
          color: '#FF7A00',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#2D3748',
          fontSize: '0.75rem',
          padding: '8px 12px',
          borderRadius: 6,
        },
      },
    },
  },
});

export default theme;