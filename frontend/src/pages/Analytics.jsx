import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { DEMO_MODE, getAnalytics } from '../services/api'

const PERIOD_OPTIONS = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All available data' },
]
const CHART_COLORS = ['#4BD2D0', '#168E94', '#24777F', '#7ABFBC', '#A6D9D4', '#D29B69']

const numberFormat = new Intl.NumberFormat('en-US')

function formatPercent(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—'
}

function formatCount(value) {
  return Number.isFinite(value) ? numberFormat.format(value) : '—'
}

function formatTick(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? String(value ?? '')
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function AnalyticsStat({ label, value, detail, accent = false }) {
  return (
    <Paper className={`an-stat${accent ? ' an-stat-accent' : ''}`} elevation={0}>
      <span className="an-stat-label">{label}</span>
      <strong className="an-stat-value">{value}</strong>
      {detail && <span className="an-stat-detail">{detail}</span>}
    </Paper>
  )
}

function ChartPanel({ eyebrow, title, description, className = '', children }) {
  return (
    <Paper className={`an-panel ${className}`} elevation={0}>
      <div className="an-panel-heading">
        <div>
          <span className="an-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </Paper>
  )
}

function Analytics() {
  const [period, setPeriod] = useState('7d')
  const [attackType, setAttackType] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getAnalytics({ period, attackType })
      .then(result => {
        if (active) {
          setAnalytics(result)
          setError('')
        }
      })
      .catch(() => {
        if (active) {
          setAnalytics(null)
          setError('Analytics data could not be loaded. Check the API connection and try again.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [period, attackType, refreshKey])

  const changeFilter = (setter, value) => {
    setLoading(true)
    setError('')
    setter(value)
  }

  const refresh = () => {
    setLoading(true)
    setError('')
    setRefreshKey(key => key + 1)
  }

  const summary = analytics?.summary ?? {}
  const traffic = Array.isArray(analytics?.traffic) ? analytics.traffic : []
  const attackDistribution = Array.isArray(analytics?.attack_distribution) ? analytics.attack_distribution : []
  const protocolDistribution = Array.isArray(analytics?.protocol_distribution) ? analytics.protocol_distribution : []
  const topSources = Array.isArray(analytics?.top_sources) ? analytics.top_sources : []
  const attackOptions = Array.isArray(analytics?.options?.attack_types) ? analytics.options.attack_types : []

  return (
    <Box className="an-page">
      <header className="an-header">
        <div>
          <span className="an-eyebrow">03 / NETWORK ANALYTICS</span>
          <h1>Analytics</h1>
          <p>Explore traffic patterns, attack behavior and suspicious sources.</p>
        </div>
        <div className="an-header-actions">
          {DEMO_MODE && <span className="an-demo-badge"><i /> DEMO DATA</span>}
          <Button variant="outlined" startIcon={<RefreshRounded />} onClick={refresh} disabled={loading}>
            Refresh Data
          </Button>
        </div>
      </header>

      {error && <Alert severity="error" className="an-alert">{error}</Alert>}
      {!error && analytics?.warnings?.length > 0 && (
        <Alert severity="warning" className="an-alert">Some analytics data sources are unavailable; the panels below show the data that loaded.</Alert>
      )}

      <section className="an-filter-bar" aria-label="Analytics filters">
        <div className="an-filter-caption">
          <span className="an-eyebrow">ANALYSIS SCOPE</span>
          <span>Refine every panel with the same filters</span>
        </div>
        <div className="an-filter-controls">
          <FormControl size="small" className="an-filter-select">
            <InputLabel id="an-period-label">Period</InputLabel>
            <Select
              labelId="an-period-label"
              value={period}
              label="Period"
              onChange={event => changeFilter(setPeriod, event.target.value)}
            >
              {PERIOD_OPTIONS.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" className="an-filter-select">
            <InputLabel id="an-attack-label">Attack type</InputLabel>
            <Select
              labelId="an-attack-label"
              value={attackType}
              label="Attack type"
              onChange={event => changeFilter(setAttackType, event.target.value)}
            >
              <MenuItem value="all">All attack types</MenuItem>
              {attackOptions.map(option => <MenuItem key={option} value={option}>{option}</MenuItem>)}
            </Select>
          </FormControl>
        </div>
      </section>

      <section className="an-overview" aria-labelledby="an-overview-title">
        <div className="an-section-heading">
          <div>
            <span className="an-eyebrow">SIGNAL SUMMARY / 01</span>
            <h2 id="an-overview-title">Analytics overview</h2>
          </div>
          <span className="an-scope-caption">{PERIOD_OPTIONS.find(option => option.value === period)?.label}</span>
        </div>
        <div className="an-stat-grid">
          {loading ? Array.from({ length: 3 }, (_, index) => <Skeleton key={index} variant="rounded" height={128} />) : (
            <>
              <AnalyticsStat label="Total network events" value={formatCount(summary.total_events)} detail="Events in the selected scope" />
              <AnalyticsStat label="Attack rate" value={formatPercent(summary.attack_rate)} detail="Malicious events / total events" accent />
              <AnalyticsStat label="Most frequent attack" value={summary.top_attack ?? '—'} detail="Leading attack category" />
            </>
          )}
        </div>
      </section>

      <div className="an-main-grid">
        <ChartPanel eyebrow="TRAFFIC PATTERNS / 02" title="Traffic evolution" description="Normal and malicious events over time" className="an-traffic-panel">
          {loading ? <Skeleton variant="rounded" height={300} /> : traffic.length ? (
            <div className="an-chart an-traffic-chart">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={traffic} margin={{ top: 12, right: 14, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="analyticsNormalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4BD2D0" stopOpacity={0.34} />
                      <stop offset="100%" stopColor="#4BD2D0" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="analyticsMaliciousFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D97862" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="#D97862" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E6EEEC" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="timestamp" tickFormatter={formatTick} tick={{ fill: '#819497', fontSize: 10 }} axisLine={{ stroke: '#D4E0DE' }} tickLine={false} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fill: '#819497', fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                  <Tooltip
                    labelFormatter={value => {
                      const date = new Date(value)
                      return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
                    }}
                    formatter={value => numberFormat.format(Number(value))}
                    contentStyle={{ borderRadius: 11, border: '1px solid #DDE8E6', fontSize: 11 }}
                  />
                  <Legend verticalAlign="top" height={34} iconType="circle" wrapperStyle={{ fontSize: 11, color: '#506C70' }} />
                  <Area type="monotone" dataKey="normal" name="Normal traffic" stroke="#168E94" strokeWidth={2.5} fill="url(#analyticsNormalFill)" activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="malicious" name="Malicious traffic" stroke="#D97862" strokeWidth={2.5} fill="url(#analyticsMaliciousFill)" activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="an-empty-state">No traffic data for this period and attack type.</div>}
        </ChartPanel>

        <ChartPanel eyebrow="ATTACK PROFILE / 03" title="Attack distribution" description="Detected attack categories" className="an-attack-panel">
          {loading ? <Skeleton variant="rounded" height={260} /> : attackDistribution.length ? (
            <div className="an-chart an-attack-chart">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={attackDistribution} layout="vertical" margin={{ top: 4, right: 14, bottom: 4, left: 2 }}>
                  <CartesianGrid stroke="#E6EEEC" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#819497', fontSize: 10 }} />
                  <YAxis type="category" dataKey="category" width={100} axisLine={false} tickLine={false} tick={{ fill: '#506C70', fontSize: 10 }} />
                  <Tooltip formatter={value => numberFormat.format(Number(value))} contentStyle={{ borderRadius: 11, border: '1px solid #DDE8E6', fontSize: 11 }} />
                  <Bar dataKey="count" name="Events" radius={[0, 7, 7, 0]} barSize={18}>
                    {attackDistribution.map((item, index) => <Cell key={item.category} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="an-empty-state">No attack distribution is available for this selection.</div>}
        </ChartPanel>

        <ChartPanel eyebrow="PROTOCOL MIX / 04" title="Protocol analysis" description="Protocols present in the available event records" className="an-protocol-panel">
          {loading ? <Skeleton variant="rounded" height={250} /> : protocolDistribution.length ? (
            <div className="an-protocol-content">
              <div className="an-chart an-protocol-chart">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie data={protocolDistribution} dataKey="count" nameKey="protocol" innerRadius="58%" outerRadius="82%" paddingAngle={3} stroke="none">
                      {protocolDistribution.map((item, index) => <Cell key={item.protocol} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={value => numberFormat.format(Number(value))} contentStyle={{ borderRadius: 11, border: '1px solid #DDE8E6', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="an-protocol-legend">
                {protocolDistribution.map((item, index) => (
                  <div className="an-protocol-row" key={item.protocol}>
                    <i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <span>{item.protocol}</span>
                    <strong>{numberFormat.format(item.count)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="an-empty-state">Protocol data unavailable</div>}
        </ChartPanel>

        <ChartPanel eyebrow="SOURCE INTELLIGENCE / 05" title="Top suspicious sources" description="Source addresses most often linked to alerts" className="an-sources-panel">
          {loading ? <Skeleton variant="rounded" height={250} /> : topSources.length ? (
            <div className="an-source-table-wrap">
              <Table size="small" className="an-source-table" aria-label="Top suspicious sources">
                <TableHead><TableRow><TableCell>Source IP</TableCell><TableCell align="right">Attack count</TableCell><TableCell>Dominant attack type</TableCell></TableRow></TableHead>
                <TableBody>
                  {topSources.map(source => (
                    <TableRow key={source.source_ip}>
                      <TableCell className="an-ip-cell">{source.source_ip}</TableCell>
                      <TableCell align="right">{numberFormat.format(source.attack_count)}</TableCell>
                      <TableCell>{source.dominant_attack_type ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : <div className="an-empty-state">Source IP data unavailable for this period and attack type.</div>}
        </ChartPanel>
      </div>
    </Box>
  )
}

export default Analytics
