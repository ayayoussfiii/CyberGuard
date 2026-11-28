import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import { API_BASE_URL, checkApiStatus } from '../services/api'

const REFRESH_INTERVAL_MS = 30_000

const services = [
  { key: 'flask', name: 'Flask API', description: 'Application backend and HTTP endpoints' },
  { key: 'mongodb', name: 'MongoDB', description: 'Database connectivity' },
  { key: 'pyspark', name: 'PySpark', description: 'Data processing readiness' },
  { key: 'ml_model', name: 'ML model', description: 'Model readiness' },
]

const statusLabels = {
  online: 'Operational',
  offline: 'Offline',
  degraded: 'Degraded',
  unknown: 'Unknown',
  not_configured: 'Not configured',
}

function StatusChip({ status = 'unknown' }) {
  return (
    <Chip
      className={`api-status-chip is-${status}`}
      label={statusLabels[status] ?? statusLabels.unknown}
      size="small"
    />
  )
}

function formatTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatLatency(value) {
  return value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
    ? '—'
    : `${Math.round(Number(value))} ms`
}

function ApiStatus() {
  const [snapshot, setSnapshot] = useState(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState(false)
  const requestRef = useRef(null)
  const checkRef = useRef(null)

  useEffect(() => {
    let active = true

    const runCheck = async (showLoading = false) => {
      if (showLoading) setChecking(true)
      let request = requestRef.current
      if (!request) {
        request = checkApiStatus()
        requestRef.current = request
      }

      try {
        const result = await request
        if (active) {
          setSnapshot(result)
          setError(false)
        }
      } catch {
        if (active) setError(true)
      } finally {
        if (requestRef.current === request) requestRef.current = null
        if (active) setChecking(false)
      }
    }

    checkRef.current = () => runCheck(true)
    void runCheck()
    const interval = window.setInterval(() => void runCheck(), REFRESH_INTERVAL_MS)

    return () => {
      active = false
      window.clearInterval(interval)
      checkRef.current = null
    }
  }, [])

  const refresh = useCallback(() => checkRef.current?.(), [])
  const serviceRows = snapshot?.services ?? {}
  const serviceValues = services.map(service => serviceRows[service.key] ?? { status: 'unknown' })
  const onlineCount = serviceValues.filter(service => service.status === 'online').length
  const unavailableCount = serviceValues.filter(service => ['offline', 'degraded'].includes(service.status)).length
  const overallStatus = snapshot?.overall_status ?? 'unknown'
  const checkedAt = snapshot?.checked_at
  const endpoints = snapshot?.endpoints ?? []
  const backendUrl = snapshot?.backend_url ?? API_BASE_URL

  return (
    <Box className="api-status-page">
      <header className="api-status-header">
        <div>
          <p className="api-status-eyebrow">06 / SYSTEM OPERATIONS</p>
          <h1>API Status</h1>
          <p className="api-status-subtitle">
            Live connectivity checks for the CyberGuard services and endpoints.
          </p>
        </div>
        <Button
          className="api-status-refresh"
          variant="outlined"
          onClick={refresh}
          disabled={checking}
          startIcon={checking ? <CircularProgress size={16} /> : <RefreshRoundedIcon />}
        >
          {checking ? 'Checking…' : 'Check now'}
        </Button>
      </header>

      <Alert severity="info" className="api-status-demo-note">
        Status checks use real HTTP requests. Demo mode affects dashboard data only.
      </Alert>

      {error && (
        <Alert severity="warning" className="api-status-error">
          The status check could not be completed. Try again or verify the backend address below.
        </Alert>
      )}

      <section className="api-status-summary" aria-label="API status summary">
        <Paper className="api-status-summary-card api-status-summary-primary" elevation={0}>
          <span className="api-status-card-label">Overall status</span>
          <div className="api-status-summary-value">
            <StatusChip status={overallStatus} />
          </div>
          <span className="api-status-card-note">Based on the latest live checks</span>
        </Paper>
        <Paper className="api-status-summary-card" elevation={0}>
          <span className="api-status-card-label">Services operational</span>
          <strong>{checking && !snapshot ? '—' : `${onlineCount} / ${services.length}`}</strong>
          <span className="api-status-card-note">Services with a confirmed response</span>
        </Paper>
        <Paper className="api-status-summary-card" elevation={0}>
          <span className="api-status-card-label">Unavailable / degraded</span>
          <strong>{checking && !snapshot ? '—' : unavailableCount}</strong>
          <span className="api-status-card-note">Unknown services are counted separately</span>
        </Paper>
        <Paper className="api-status-summary-card" elevation={0}>
          <span className="api-status-card-label">Last checked</span>
          <strong className="api-status-time-value">{formatTime(checkedAt)}</strong>
          <span className="api-status-card-note">Automatic refresh every 30 seconds</span>
        </Paper>
      </section>

      <section className="api-status-section">
        <div className="api-status-section-heading">
          <div>
            <p className="api-status-eyebrow">SERVICE HEALTH</p>
            <h2>Connected services</h2>
          </div>
          <span>Health reported by Flask</span>
        </div>
        <div className="api-status-service-grid">
          {services.map((service, index) => {
            const result = serviceRows[service.key] ?? { status: 'unknown' }
            return (
              <Paper className={`api-status-service-card${index === 0 ? ' is-featured' : ''}`} elevation={0} key={service.key}>
                <div className="api-status-service-top">
                  <span className="api-status-service-indicator" />
                  <StatusChip status={result.status} />
                </div>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <div className="api-status-service-meta">
                  <span>Response time</span>
                  <strong>{formatLatency(result.response_time_ms)}</strong>
                </div>
                <div className="api-status-service-meta">
                  <span>Required</span>
                  <strong>{result.required ? 'Yes' : 'Optional'}</strong>
                </div>
              </Paper>
            )
          })}
        </div>
        {(serviceRows.pyspark?.status === 'unknown' || serviceRows.ml_model?.status === 'unknown') && (
          <p className="api-status-footnote">
            PySpark and the ML model are marked unknown until the backend provides a readiness check.
          </p>
        )}
      </section>

      <section className="api-status-section api-status-endpoints-section">
        <div className="api-status-section-heading">
          <div>
            <p className="api-status-eyebrow">HTTP MONITOR</p>
            <h2>API endpoints</h2>
          </div>
          <span>Read-only GET checks</span>
        </div>
        <TableContainer component={Paper} className="api-status-table-wrap" elevation={0}>
          <Table className="api-status-table" aria-label="API endpoint health checks">
            <TableHead>
              <TableRow>
                <TableCell>Endpoint</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>HTTP</TableCell>
                <TableCell>Response</TableCell>
                <TableCell>Last checked</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {endpoints.map(endpoint => (
                <TableRow key={endpoint.path}>
                  <TableCell><code>{endpoint.display_path ?? endpoint.path}</code></TableCell>
                  <TableCell><span className="api-status-method">{endpoint.method}</span></TableCell>
                  <TableCell><StatusChip status={endpoint.status} /></TableCell>
                  <TableCell>{endpoint.http_status ?? '—'}</TableCell>
                  <TableCell>{formatLatency(endpoint.response_time_ms)}</TableCell>
                  <TableCell>{formatTime(endpoint.last_checked ?? endpoint.checked_at)}</TableCell>
                </TableRow>
              ))}
              {checking && endpoints.length === 0 && (
                <TableRow><TableCell colSpan={6} className="api-status-empty">Checking endpoints…</TableCell></TableRow>
              )}
              {!checking && endpoints.length === 0 && (
                <TableRow><TableCell colSpan={6} className="api-status-empty">No endpoint results are available yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </section>

      <section className="api-status-diagnostics">
        <div>
          <p className="api-status-eyebrow">DIAGNOSTICS</p>
          <h2>Connection details</h2>
        </div>
        <div className="api-status-diagnostic-grid">
          <div><span>Backend URL</span><code>{backendUrl}</code></div>
          <div><span>Health endpoint</span><strong>{snapshot?.health_check?.http_status ?? 'No response'}</strong></div>
          <div><span>Health response time</span><strong>{formatLatency(snapshot?.health_check?.response_time_ms)}</strong></div>
          <div><span>Last attempt</span><strong>{formatTime(checkedAt)}</strong></div>
        </div>
        {snapshot?.health_check?.error && (
          <p className="api-status-diagnostic-note">{snapshot.health_check.error}</p>
        )}
      </section>
    </Box>
  )
}

export default ApiStatus
