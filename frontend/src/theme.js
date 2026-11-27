
import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',

    primary: {
      main: '#087E8B'
    },

    secondary: {
      main: '#23B7CE'
    },

    background: {
      default: '#F8F7F2',
      paper: '#FFFFFF'
    },

    text: {
      primary: '#0B3038',
      secondary: '#68838A'
    },

    divider: '#E5E8E5'
  },

  typography: {
    fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: {
      textTransform: 'none',
      fontWeight: 600
    }
  },

  shape: {
    borderRadius: 14
  },

  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E8E5',
          borderRadius: 18,
          boxShadow: '0 8px 30px rgba(11, 48, 56, 0.06)'
        }
      }
    }
  }
})

export default theme
