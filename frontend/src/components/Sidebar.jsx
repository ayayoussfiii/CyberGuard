
import { NavLink } from 'react-router-dom'
import {
  Box,
  Typography,
  Divider
} from '@mui/material'

const navigation = [
  {
    section: 'WORKSPACE',
    items: [
      { number: '01', label: 'Overview', path: '/' },
      { number: '02', label: 'Threat intelligence', path: '/alerts' },
      { number: '03', label: 'Analytics', path: '/analytics' },
      { number: '04', label: 'Model performance', path: '/performance' }
    ]
  },
  {
    section: 'DOCUMENTATION & SYSTEM',
    items: [
      { number: '05', label: 'Methodology', path: '/methodology' },
      { number: '06', label: 'API connection', path: '/api-status' }
    ]
  }
]

function Sidebar() {
  return (
    <Box
      component="aside"
      sx={{
        width: 260,
        flexShrink: 0,
        minHeight: '100vh',
        background:
          'linear-gradient(165deg, #102F35 0%, #08272E 100%)',
        borderRight: '1px solid #38666B',
        px: 2.5,
        py: 4,
        display: 'flex',
        flexDirection: 'column',
        color: '#F8F7F2'
      }}
    >
      {/* Identité CyberGuard */}
      <Box sx={{ mb: 7 }}>
        <Typography
          sx={{
            fontSize: 28,
            fontWeight: 650,
            letterSpacing: '-1.5px',
            lineHeight: 1.1
          }}
        >
          cyberguard
          <Box component="span" sx={{ color: '#4BD2D0' }}>
            .
          </Box>
        </Typography>

        <Typography
          sx={{
            mt: 1.5,
            fontSize: 9,
            letterSpacing: 1.8,
            color: '#90BAB9'
          }}
        >
          NETWORK INTELLIGENCE PLATFORM
        </Typography>
      </Box>

      {/* Navigation */}
      <Box component="nav" sx={{ flexGrow: 1 }}>
        {navigation.map((group, index) => (
          <Box key={group.section} sx={{ mb: 4 }}>
            {index > 0 && (
              <Divider
                sx={{
                  borderColor: '#38666B',
                  mb: 3
                }}
              />
            )}

            <Typography
              sx={{
                fontSize: 10,
                letterSpacing: 1.7,
                color: '#91B5B7',
                mb: 2,
                px: 1
              }}
            >
              {group.section}
            </Typography>

            {group.items.map((item) => (
              <Box
                key={item.path}
                component={NavLink}
                to={item.path}
                end={item.path === '/'}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 1.5,
                  py: 1.6,
                  mb: 0.7,
                  borderRadius: '5px',
                  border: '1px solid transparent',
                  textDecoration: 'none',
                  color: '#D4E5E3',
                  transition: 'all 0.2s ease',

                  '&:hover': {
                    backgroundColor: '#1B4A50',
                    color: '#FFFFFF',
                    paddingLeft: '19px'
                  },

                  '&.active': {
                    backgroundColor: '#1B4A50',
                    borderColor: '#337D81',
                    color: '#FFFFFF'
                  },

                  '&.active .nav-number': {
                    color: '#4BD2D0'
                  }
                }}
              >
                <Typography
                  className="nav-number"
                  sx={{
                    fontSize: 12,
                    color: '#6C9B9E',
                    fontWeight: 500,
                    minWidth: 22
                  }}
                >
                  {item.number}
                </Typography>

                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 500
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        ))}
      </Box>

      {/* Signature discrète */}
      <Box>
        <Divider sx={{ borderColor: '#38666B', mb: 2 }} />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mb: 1
          }}
        >
          <Typography sx={{ fontSize: 11, letterSpacing: 1 }}>
            CYBERGUARD
          </Typography>

          <Typography sx={{ fontSize: 11, color: '#91B5B7' }}>
            / 2026
          </Typography>
        </Box>

        <Typography
          sx={{
            fontSize: 9,
            letterSpacing: 1.2,
            color: '#719FA1'
          }}
        >
          RESEARCH & THREAT DETECTION
        </Typography>
      </Box>
    </Box>
  )
}

export default Sidebar
