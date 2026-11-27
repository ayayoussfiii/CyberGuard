import { useEffect, useMemo, useState } from 'react'
import {
  Alert as MuiAlert,
  Box,
  Button,
  Chip,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material'
import SearchRounded from '@mui/icons-material/SearchRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import FilterAltOffRounded from '@mui/icons-material/FilterAltOffRounded'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { DEMO_MODE, getAlerts } from '../services/api'

const PAGE_SIZE = 8
const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 }
const SEVERITY_COLORS = {
  Critical: '#E56E67',
  High: '#E6A15C',
  Medium: '#53B8BD',
  Low: '#73C9A2',
}

function severityKey(value) {
  return String(value ?? '').trim().toLowerCase()
}

function attackType(alert) {
  return alert?.type ?? alert?.attack_type ?? alert?.predicted_label ?? ''
}

function confidencePercent(alert) {
  const raw = alert?.confidence ?? alert?.confidence_score
  if (raw === null || raw === undefined || raw === '') return null
  const numeric = Number(raw)
  if (!Number.isFinite(numeric)) return null
  return Math.max(0, Math.min(100, numeric <= 1 ? numeric * 100 : numeric))
}

function formatDate(value, includeDate = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', includeDate
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { hour: '2-digit', minute: '2-digit' })
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function SeverityBadge({ severity }) {
  const normalized = severityKey(severity)
  const label = severity || 'Unknown'
  return <Chip size="small" label={label} className={`ti-severity ti-severity-${normalized || 'unknown'}`} />
}

function StatCard({ label, value, detail, tone = 'default' }) {
  return (
    <Paper className={`ti-stat-card ti-stat-${tone}`} elevation={0}>
      <span className="ti-stat-label">{label}</span>
      <strong className="ti-stat-value">{value}</strong>
      {detail && <span className="ti-stat-detail">{detail}</span>}
    </Paper>
  )
}

function ThreatCharts({ alerts }) {
  const attackData = useMemo(() => {
    const counts = new Map()
    alerts.forEach(alert => {
      const type = attackType(alert) || 'Unknown'
      counts.set(type, (counts.get(type) ?? 0) + 1)
    })
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [alerts])

  const severityData = useMemo(() => ['Critical', 'High', 'Medium', 'Low'].map(name => ({
    name,
    count: alerts.filter(alert => severityKey(alert.severity) === name.toLowerCase()).length,
    fill: SEVERITY_COLORS[name],
  })), [alerts])

  return (
    <div className="ti-chart-grid">
      <Paper className="ti-panel" elevation={0}>
        <div className="ti-panel-heading">
          <div>
            <span className="ti-eyebrow">THREAT LANDSCAPE / 01</span>
            <h2>Attack distribution</h2>
            <p>Alert categories in the current result set</p>
          </div>
          <span className="ti-panel-index">01</span>
        </div>
        {attackData.length ? (
          <div className="ti-chart ti-attack-chart">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={attackData} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 8 }}>
                <CartesianGrid stroke="#E8EFED" horizontal={false} />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#819497', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={105} axisLine={false} tickLine={false} tick={{ fill: '#506C70', fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#F1F7F5' }} contentStyle={{ borderRadius: 10, border: '1px solid #DDE8E6', fontSize: 12 }} />
                <Bar dataKey="count" name="Alerts" fill="#168E94" radius={[0, 7, 7, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="ti-chart-empty">No threat categories match the current filters.</p>}
      </Paper>

      <Paper className="ti-panel ti-severity-panel" elevation={0}>
        <div className="ti-panel-heading">
          <div>
            <span className="ti-eyebrow">RISK PROFILE / 02</span>
            <h2>Severity analysis</h2>
            <p>Distribution by alert severity</p>
          </div>
          <span className="ti-panel-index">02</span>
        </div>
        <div className="ti-chart ti-severity-chart">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={severityData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="#E8EFED" horizontal={false} />
              <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#819497', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={72} axisLine={false} tickLine={false} tick={{ fill: '#506C70', fontSize: 11 }} />
              <Tooltip cursor={{ fill: '#F1F7F5' }} contentStyle={{ borderRadius: 10, border: '1px solid #DDE8E6', fontSize: 12 }} />
              <Bar dataKey="count" name="Alerts" radius={[0, 7, 7, 0]} barSize={16}>
                {severityData.map(item => <Cell key={item.name} fill={item.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Paper>
    </div>
  )
}

function ThreatDetails({ alert, onClose }) {
  if (!alert) return null
  const confidence = confidencePercent(alert)
  const detailFields = [
    ['Alert ID', alert.id ?? alert.alert_id ?? alert.record_id],
    ['Attack type', attackType(alert)],
    ['Timestamp', alert.timestamp ?? alert.created_at, true],
    ['Source IP', alert.source_ip ?? alert.src_ip],
    ['Destination IP', alert.destination_ip ?? alert.dst_ip],
    ['Protocol', alert.protocol],
    ['Severity', alert.severity],
    ['ML result', alert.model_result ?? alert.prediction_result ?? alert.predicted_label],
  ].filter(([, value]) => displayValue(value) !== null)

  return (
    <Drawer
      anchor="right"
      open={Boolean(alert)}
      onClose={onClose}
      PaperProps={{ className: 'ti-drawer-paper', 'aria-labelledby': 'ti-details-title' }}
    >
      <div className="ti-drawer-header">
        <div>
          <span className="ti-eyebrow">INVESTIGATION / DETAIL</span>
          <h2 id="ti-details-title">Threat details</h2>
        </div>
        <IconButton aria-label="Close threat details" onClick={onClose}>
          <CloseRounded />
        </IconButton>
      </div>
      <div className="ti-drawer-content">
        <div className="ti-detail-summary">
          <span className="ti-detail-mark" aria-hidden="true">!</span>
          <div>
            <strong>{attackType(alert) || 'Threat alert'}</strong>
            <span>{displayValue(alert.id ?? alert.alert_id ?? alert.record_id) ?? 'Alert ID unavailable'}</span>
          </div>
          {alert.severity && <SeverityBadge severity={alert.severity} />}
        </div>
        <div className="ti-detail-list">
          {detailFields.map(([label, value, isDate]) => (
            <div className="ti-detail-row" key={label}>
              <span>{label}</span>
              <strong>{isDate ? formatDate(value, true) : displayValue(value)}</strong>
            </div>
          ))}
          {confidence !== null && (
            <div className="ti-detail-confidence">
              <div><span>Confidence score</span><strong>{confidence.toFixed(1)}%</strong></div>
              <LinearProgress variant="determinate" value={confidence} />
            </div>
          )}
        </div>
        <Button fullWidth variant="outlined" onClick={onClose} className="ti-close-detail">
          Close details
        </Button>
      </div>
    </Drawer>
  )
}

function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [query, setQuery] = useState('')
  const [severity, setSeverity] = useState('all')
  const [attack, setAttack] = useState('all')
  const [protocol, setProtocol] = useState('all')
  const [sortBy, setSortBy] = useState('date-desc')
  const [page, setPage] = useState(1)
  const [selectedAlert, setSelectedAlert] = useState(null)

  useEffect(() => {
    let active = true
    getAlerts()
      .then(data => {
        if (active) setAlerts(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (active) {
          setAlerts([])
          setError('Threat alerts could not be loaded. Check the API connection and try again.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [refreshKey])

  const attackOptions = useMemo(() => [...new Set(alerts.map(attackType).filter(Boolean))].sort(), [alerts])
  const protocolOptions = useMemo(() => [...new Set(alerts.map(alert => alert.protocol).filter(Boolean))].sort(), [alerts])

  const filteredAlerts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = alerts.filter(alert => {
      const searchable = [alert.id, alert.alert_id, alert.record_id, attackType(alert), alert.source_ip, alert.src_ip, alert.destination_ip, alert.dst_ip]
        .filter(Boolean).join(' ').toLowerCase()
      return (!needle || searchable.includes(needle))
        && (severity === 'all' || severityKey(alert.severity) === severity)
        && (attack === 'all' || attackType(alert) === attack)
        && (protocol === 'all' || String(alert.protocol ?? '').toLowerCase() === protocol.toLowerCase())
    })

    return filtered.sort((a, b) => {
      if (sortBy === 'date-asc' || sortBy === 'date-desc') {
        const diff = new Date(a.timestamp ?? a.created_at ?? 0) - new Date(b.timestamp ?? b.created_at ?? 0)
        return sortBy === 'date-desc' ? -diff : diff
      }
      if (sortBy === 'severity') {
        return (SEVERITY_ORDER[severityKey(b.severity)] ?? 0) - (SEVERITY_ORDER[severityKey(a.severity)] ?? 0)
      }
      return (confidencePercent(b) ?? -1) - (confidencePercent(a) ?? -1)
    })
  }, [alerts, query, severity, attack, protocol, sortBy])

  const visibleAlerts = filteredAlerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const criticalCount = alerts.filter(alert => severityKey(alert.severity) === 'critical').length
  const highCount = alerts.filter(alert => severityKey(alert.severity) === 'high').length
  const frequentAttack = useMemo(() => {
    const counts = new Map()
    alerts.forEach(alert => {
      const type = attackType(alert)
      if (type) counts.set(type, (counts.get(type) ?? 0) + 1)
    })
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  }, [alerts])

  const resetFilters = () => {
    setQuery('')
    setSeverity('all')
    setAttack('all')
    setProtocol('all')
    setSortBy('date-desc')
    setPage(1)
  }

  const refreshAlerts = () => {
    setPage(1)
    setLoading(true)
    setError('')
    setRefreshKey(key => key + 1)
  }

  return (
    <Box className="ti-page">
      <header className="ti-page-header">
        <div>
          <span className="ti-eyebrow">02 / THREAT MONITORING</span>
          <h1>Threat Intelligence</h1>
          <p>Monitor, investigate and understand detected network threats.</p>
        </div>
        <div className="ti-header-actions">
          {DEMO_MODE && <span className="ti-demo-badge"><i /> DEMO DATA</span>}
          <Button
            variant="outlined"
            startIcon={<RefreshRounded />}
            onClick={refreshAlerts}
            disabled={loading}
          >
            Refresh Data
          </Button>
        </div>
      </header>

      {error && <MuiAlert severity="error" className="ti-api-error">{error}</MuiAlert>}

      <section className="ti-overview" aria-labelledby="ti-overview-heading">
        <div className="ti-section-heading">
          <div>
            <span className="ti-eyebrow">LIVE SNAPSHOT / 01</span>
            <h2 id="ti-overview-heading">Threat overview</h2>
          </div>
          <span className="ti-total-caption">{alerts.length.toLocaleString('fr-FR')} alerts loaded</span>
        </div>
        <div className="ti-stat-grid">
          {loading ? Array.from({ length: 4 }, (_, index) => <Skeleton key={index} variant="rounded" height={132} />) : (
            <>
              <StatCard label="Total detected threats" value={alerts.length.toLocaleString('fr-FR')} detail="Available alert records" />
              <StatCard label="Critical threats" value={criticalCount.toLocaleString('fr-FR')} detail="Requires immediate review" tone="critical" />
              <StatCard label="High severity" value={highCount.toLocaleString('fr-FR')} detail="Elevated risk signals" tone="high" />
              <StatCard label="Most frequent attack" value={frequentAttack} detail="Across loaded alerts" tone="featured" />
            </>
          )}
        </div>
      </section>

      {!loading && <ThreatCharts alerts={filteredAlerts} />}

      <section className="ti-investigation" aria-labelledby="ti-investigation-heading">
        <div className="ti-section-heading ti-investigation-heading">
          <div>
            <span className="ti-eyebrow">ALERT QUEUE / 03</span>
            <h2 id="ti-investigation-heading">Threat investigation</h2>
            <p>Search and filter detections, then select a row to inspect the available evidence.</p>
          </div>
          <div className="ti-result-count"><strong>{filteredAlerts.length.toLocaleString('fr-FR')}</strong> results</div>
        </div>

        <Paper className="ti-filter-panel" elevation={0}>
          <div className="ti-filter-controls">
            <TextField
              className="ti-search"
              size="small"
              label="Search alerts"
              placeholder="IP address, attack type or alert ID"
              value={query}
              onChange={event => { setQuery(event.target.value); setPage(1) }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }}
            />
            <FormControl size="small" className="ti-filter-select">
              <InputLabel id="ti-severity-label">Severity</InputLabel>
              <Select labelId="ti-severity-label" value={severity} label="Severity" onChange={event => { setSeverity(event.target.value); setPage(1) }}>
                <MenuItem value="all">All severities</MenuItem>
                {['Critical', 'High', 'Medium', 'Low'].map(value => <MenuItem key={value} value={value.toLowerCase()}>{value}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" className="ti-filter-select">
              <InputLabel id="ti-attack-label">Attack type</InputLabel>
              <Select labelId="ti-attack-label" value={attack} label="Attack type" onChange={event => { setAttack(event.target.value); setPage(1) }}>
                <MenuItem value="all">All attack types</MenuItem>
                {attackOptions.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
              </Select>
            </FormControl>
            {protocolOptions.length > 0 && (
              <FormControl size="small" className="ti-filter-select">
                <InputLabel id="ti-protocol-label">Protocol</InputLabel>
                <Select labelId="ti-protocol-label" value={protocol} label="Protocol" onChange={event => { setProtocol(event.target.value); setPage(1) }}>
                  <MenuItem value="all">All protocols</MenuItem>
                  {protocolOptions.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <FormControl size="small" className="ti-sort-select">
              <InputLabel id="ti-sort-label">Sort by</InputLabel>
              <Select labelId="ti-sort-label" value={sortBy} label="Sort by" onChange={event => { setSortBy(event.target.value); setPage(1) }}>
                <MenuItem value="date-desc">Newest first</MenuItem>
                <MenuItem value="date-asc">Oldest first</MenuItem>
                <MenuItem value="severity">Severity</MenuItem>
                <MenuItem value="confidence">Confidence</MenuItem>
              </Select>
            </FormControl>
            <Button className="ti-reset-button" startIcon={<FilterAltOffRounded />} onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>
        </Paper>

        <Paper className="ti-table-panel" elevation={0}>
          {loading ? (
            <Stack spacing={1.5} sx={{ p: 2.5 }}>
              {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} height={42} />)}
            </Stack>
          ) : error ? (
            <div className="ti-empty-state"><strong>Alert data unavailable</strong><span>Refresh the page after checking the API connection.</span></div>
          ) : filteredAlerts.length === 0 ? (
            <div className="ti-empty-state"><strong>No matching threats</strong><span>Try a different search or reset your filters.</span></div>
          ) : (
            <TableContainer className="ti-table-scroll">
              <Table className="ti-table" aria-label="Threat alerts">
                <TableHead>
                  <TableRow>
                    <TableCell>Alert ID</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Attack type</TableCell>
                    <TableCell>Source IP</TableCell>
                    <TableCell>Destination IP</TableCell>
                    <TableCell>Protocol</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Confidence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleAlerts.map((alert, index) => {
                    const confidence = confidencePercent(alert)
                    return (
                      <TableRow
                        key={alert.id ?? alert.alert_id ?? `${attackType(alert)}-${index}`}
                        hover
                        tabIndex={0}
                        onClick={() => setSelectedAlert(alert)}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setSelectedAlert(alert)
                          }
                        }}
                        className="ti-alert-row"
                        aria-label={`View ${attackType(alert) || 'alert'} details`}
                      >
                        <TableCell className="ti-mono ti-id-cell">{alert.id ?? alert.alert_id ?? alert.record_id ?? '—'}</TableCell>
                        <TableCell className="ti-time-cell">{formatDate(alert.timestamp ?? alert.created_at)}</TableCell>
                        <TableCell className="ti-attack-cell">{attackType(alert) || '—'}</TableCell>
                        <TableCell className="ti-mono">{alert.source_ip ?? alert.src_ip ?? '—'}</TableCell>
                        <TableCell className="ti-mono">{alert.destination_ip ?? alert.dst_ip ?? '—'}</TableCell>
                        <TableCell>{alert.protocol ?? '—'}</TableCell>
                        <TableCell><SeverityBadge severity={alert.severity} /></TableCell>
                        <TableCell>
                          {confidence === null ? <span className="ti-missing-value">—</span> : (
                            <div className="ti-confidence-cell">
                              <strong>{confidence.toFixed(0)}%</strong>
                              <LinearProgress variant="determinate" value={confidence} />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {!loading && !error && filteredAlerts.length > 0 && (
            <div className="ti-table-footer">
              <span>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filteredAlerts.length)} of {filteredAlerts.length}</span>
              <Pagination count={Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE))} page={page} onChange={(_, nextPage) => setPage(nextPage)} size="small" shape="rounded" />
            </div>
          )}
        </Paper>
      </section>

      <ThreatDetails alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
    </Box>
  )
}

export default Alerts
