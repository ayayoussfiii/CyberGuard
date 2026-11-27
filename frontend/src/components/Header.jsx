
import { useLocation } from 'react-router-dom'
import { Box, Typography, Divider } from '@mui/material'

const pages = {
  '/': {
    number: '01',
    title: 'Security overview',
    subtitle: 'A clearer perspective on network security.',
    category: 'NETWORK / OVERVIEW'
  },
  '/alerts': {
    number: '02',
    title: 'Threat intelligence',
    subtitle: 'Explore detected threats and suspicious activity.',
    category: 'SECURITY / DETECTION'
  },
  '/analytics': {
    number: '03',
    title: 'Threat analytics',
    subtitle: 'Discover patterns hidden within network traffic.',
    category: 'DATA / ANALYTICS'
  },
  '/performance': {
    number: '04',
    title: 'Model performance',
    subtitle: 'Understand the reliability behind every prediction.',
    category: 'MACHINE LEARNING / EVALUATION'
  },
  '/methodology': {
    number: '05',
    title: 'Methodology',
    subtitle: 'Explore the architecture and analytical workflow.',
    category: 'RESEARCH / METHODOLOGY'
  },
  '/api-status': {
    number: '06',
    title: 'API connection',
    subtitle: 'Monitor the connection between our services.',
    category: 'SYSTEM / INFRASTRUCTURE'
  }
}

function Header() {
  const location = useLocation()

  const page = pages[location.pathname] || pages['/']

  return (
    <Box
      component="header"
      sx={{
        backgroundColor: '#F8F7F2',
        px: { xs: 3, md: 5 },
        pt: 4,
        pb: 3,
        borderBottom: '1px solid #DDE5E2'
      }}
    >
      {/* Ligne supérieure */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 24,
              height: 2,
              backgroundColor: '#087E8B'
            }}
          />

          <Typography
            sx={{
              fontSize: 10,
              letterSpacing: 1.4,
              color: '#68838A'
            }}
          >
            CYBERGUARD / INTELLIGENCE PLATFORM
          </Typography>
        </Box>

        <Typography
          sx={{
            fontSize: 10,
            letterSpacing: 1,
            color: '#68838A'
          }}
        >
          RESEARCH EDITION · 2026
        </Typography>
      </Box>

      <Divider sx={{ my: 3, borderColor: '#DDE5E2' }} />

      {/* Titre principal */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 3
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 30, md: 42 },
              fontWeight: 650,
              letterSpacing: '-1.7px',
              color: '#102F35',
              lineHeight: 1.15
            }}
          >
            {page.title}
            <Box component="span" sx={{ color: '#087E8B' }}>
              .
            </Box>
          </Typography>

          <Typography
            sx={{
              mt: 1.5,
              fontSize: 14,
              color: '#68838A'
            }}
          >
            {page.subtitle}
          </Typography>
        </Box>

        {/* Numéro de section */}
        <Box
          sx={{
            backgroundColor: '#E6F3F0',
            border: '1px solid #C8E3DF',
            borderRadius: '6px',
            px: 3,
            py: 2,
            minWidth: 105,
            display: { xs: 'none', sm: 'block' }
          }}
        >
          <Typography
            sx={{
              fontSize: 10,
              color: '#087E8B',
              letterSpacing: 1.5
            }}
          >
            SECTION
          </Typography>

          <Typography
            sx={{
              fontSize: 24,
              fontWeight: 600,
              color: '#102F35'
            }}
          >
            {page.number}
            <Box component="span" sx={{ color: '#68838A' }}>
              {' / 06'}
            </Box>
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mt: 4, mb: 2, borderColor: '#DDE5E2' }} />

      {/* Ligne inférieure */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap'
        }}
      >
        <Typography
          sx={{
            fontSize: 10,
            letterSpacing: 1.2,
            color: '#68838A'
          }}
        >
          {page.category}
        </Typography>

        <Typography
          sx={{
            fontSize: 10,
            letterSpacing: 1.2,
            color: '#087E8B'
          }}
        >
          CYBERGUARD
        </Typography>
      </Box>
    </Box>
  )
}

export default Header
