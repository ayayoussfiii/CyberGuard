import { useEffect, useState } from 'react'
import { Box, Typography, Paper, Skeleton, Alert, Button } from '@mui/material'

import NetworkActivity from '../components/NetworkActivity'
import RecentThreats from '../components/RecentThreats'
import ThreatDistribution from '../components/ThreatDistribution'
import { getSummary, getMetrics, getActivity, getRecentAlerts, DEMO_MODE } from '../services/api'

const panelStyle = {
  borderRadius: '16px',
  border: '1px solid rgba(20, 80, 85, 0.1)',
  boxShadow: '0 8px 24px rgba(10, 40, 45, 0.06)',
  p: 2.5,
}

function Overview() {
  const [summary, setSummary] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [activity, setActivity] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setLoading(true)
      setError(null)
      const results = await Promise.allSettled([
        getSummary(),
        getMetrics(),
        getActivity(),
        getRecentAlerts(5),
      ])

      if (!active) return
      const [summaryResult, metricsResult, activityResult, alertsResult] = results
      setSummary(summaryResult.status === 'fulfilled' ? summaryResult.value : null)
      setMetrics(metricsResult.status === 'fulfilled' ? metricsResult.value : null)
      setActivity(
        activityResult.status === 'fulfilled' && Array.isArray(activityResult.value)
          ? activityResult.value
          : [],
      )
      setRecentAlerts(
        alertsResult.status === 'fulfilled' && Array.isArray(alertsResult.value)
          ? alertsResult.value
          : [],
      )
      if (results.some(result => result.status === 'rejected')) {
        setError('Certaines données sont indisponibles.')
      }
      setLoading(false)
    }

    loadDashboard()
    return () => {
      active = false
    }
  }, [refreshKey])

  const formatNumber = value => {
    if (value === null || value === undefined) return '—'
    const number = Number(value)
    return Number.isFinite(number) ? number.toLocaleString('fr-FR') : '—'
  }

  const formatPercent = value => {
    if (value === null || value === undefined) return '—'
    const number = Number(value)
    return Number.isFinite(number) ? `${(number * 100).toFixed(1)}%` : '—'
  }

  const renderValue = (value, formatter = formatNumber) => (
    loading ? <Skeleton variant="text" width={120} height={62} /> : formatter(value)
  )

  return (
    <Box className="cg-dashboard">
      <Box className="cg-dashboard-header">
        <Box>
          <Typography sx={{ fontSize: 11, letterSpacing: 2, color: '#087E8B' }}>
            01 / NETWORK INTELLIGENCE
          </Typography>
          <Typography sx={{ mt: 1, color: '#68838A' }}>
            Explore the signals behind network activity.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          disabled={loading}
          onClick={() => setRefreshKey(key => key + 1)}
        >
          Refresh data
        </Button>
      </Box>

      {DEMO_MODE && (
        <Alert severity="info" sx={{ mb: 2.5 }}>
          DEMO DATA — Les données affichées sont fictives.
        </Alert>
      )}
      {error && <Alert severity="warning" sx={{ mb: 2.5 }}>{error}</Alert>}

      <div className="cg-primary-layout">
        <ThreatDistribution />

        <div className="cg-dashboard-right">
          <div className="cg-stat-grid">
            <Paper className="cg-stat-card cg-stat-featured" sx={{ ...panelStyle, backgroundColor: '#102F35', color: '#FFFFFF' }}>
              <Typography className="cg-stat-label" sx={{ color: '#8FC9C8' }}>NETWORK OBSERVATION</Typography>
              <Typography sx={{ mt: 1, fontSize: 12, color: '#B4D1CF' }}>Total analyzed network events</Typography>
              <Typography className="cg-stat-value" sx={{ color: '#FFFFFF' }}>
                {renderValue(summary?.total_predictions)}
              </Typography>
            </Paper>

            <Paper className="cg-stat-card cg-stat-alerts" sx={{ ...panelStyle, backgroundColor: '#E4F2EF' }}>
              <Typography className="cg-stat-label" sx={{ color: '#087E8B' }}>DETECTED ALERTS</Typography>
              <Typography className="cg-stat-value" sx={{ color: '#102F35' }}>
                {renderValue(summary?.total_alerts)}
              </Typography>
              <Typography sx={{ color: '#68838A', fontSize: 12 }}>Total security alerts recorded</Typography>
            </Paper>

            <Paper className="cg-stat-card" sx={panelStyle}>
              <Typography className="cg-stat-label" sx={{ color: '#68838A' }}>MODEL ACCURACY</Typography>
              <Typography className="cg-stat-value" sx={{ color: '#102F35' }}>
                {renderValue(metrics?.accuracy, formatPercent)}
              </Typography>
              <Typography sx={{ color: '#68838A', fontSize: 12 }}>Overall classification accuracy</Typography>
            </Paper>

            <Paper className="cg-stat-card" sx={panelStyle}>
              <Typography className="cg-stat-label" sx={{ color: '#68838A' }}>MODEL RECALL</Typography>
              <Typography className="cg-stat-value" sx={{ color: '#102F35' }}>
                {renderValue(metrics?.recall, formatPercent)}
              </Typography>
              <Typography sx={{ color: '#68838A', fontSize: 12 }}>Ability to identify actual threats</Typography>
            </Paper>
          </div>

          {!loading && <RecentThreats alerts={recentAlerts} />}
          {!loading && summary?.total_predictions === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>No predictions available yet.</Alert>
          )}
        </div>
      </div>

      {loading ? (
        <Box sx={{ mt: 3 }}><Skeleton variant="rounded" height={320} /></Box>
      ) : (
        <NetworkActivity data={activity} />
      )}
    </Box>
  )
}

export default Overview
