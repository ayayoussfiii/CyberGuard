import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { DEMO_MODE, getMetrics } from '../services/api'

const METRIC_INFO = {
  accuracy: 'Share of evaluation samples classified correctly.',
  precision: 'Share of predicted positives that were correct.',
  recall: 'Share of actual positives detected by the model.',
  f1_score: 'Harmonic mean of precision and recall.',
}

function displayText(value) {
  return value === null || value === undefined || value === '' ? 'Not available' : String(value)
}

function displayDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

function asFraction(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) return null
  return numeric > 1 ? numeric / 100 : numeric
}

function formatScore(value) {
  const fraction = asFraction(value)
  return fraction === null ? 'Not available' : `${(fraction * 100).toFixed(1)}%`
}

function MetricCard({ label, value, description }) {
  const fraction = asFraction(value)
  return (
    <Tooltip title={description} placement="top" arrow>
      <Paper className="mp-metric-card" elevation={0} tabIndex={0}>
        <span className="mp-metric-label">{label}</span>
        <strong className="mp-metric-value">{formatScore(value)}</strong>
        {fraction === null ? (
          <span className="mp-progress-na">Score unavailable</span>
        ) : (
          <LinearProgress
            className="mp-metric-progress"
            variant="determinate"
            value={fraction * 100}
            aria-label={`${label} score`}
          />
        )}
        <span className="mp-metric-caption">Evaluation score</span>
      </Paper>
    </Tooltip>
  )
}

function InfoField({ label, value, date = false }) {
  return (
    <div className="mp-info-field">
      <span>{label}</span>
      <strong>{date ? displayDate(value) : displayText(value)}</strong>
    </div>
  )
}

function ConfusionMatrix({ matrix }) {
  const [mode, setMode] = useState('absolute')
  const [selectedCell, setSelectedCell] = useState(null)
  const labels = matrix?.labels ?? []
  const values = matrix?.values ?? []
  const valid = labels.length > 0
    && values.length === labels.length
    && values.every(row => Array.isArray(row) && row.length === labels.length)

  if (!valid) {
    return (
      <div className="mp-empty-state">
        <span className="mp-empty-symbol">∑</span>
        <strong>Confusion matrix unavailable</strong>
        <span>A valid evaluation matrix has not been provided by the API.</span>
      </div>
    )
  }

  const rowTotals = values.map(row => row.reduce((sum, count) => sum + Number(count || 0), 0))
  const maximum = Math.max(1, ...values.flat().map(Number))

  return (
    <div className="mp-matrix-content">
      <div className="mp-matrix-toolbar">
        <p>Rows are actual classes; columns are predicted classes.</p>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          aria-label="Confusion matrix value format"
          onChange={(_, nextMode) => nextMode && setMode(nextMode)}
        >
          <ToggleButton value="absolute">Counts</ToggleButton>
          <ToggleButton value="row">Row %</ToggleButton>
        </ToggleButtonGroup>
      </div>

      <div className="mp-matrix-scroll">
        <Table size="small" className="mp-matrix-table" aria-label="Confusion matrix">
          <TableHead>
            <TableRow>
              <TableCell className="mp-corner-cell">Actual ↓ / Predicted →</TableCell>
              {labels.map(label => <TableCell key={label} align="center">{label}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {labels.map((actual, rowIndex) => (
              <TableRow key={actual}>
                <TableCell className="mp-row-label">{actual}</TableCell>
                {labels.map((predicted, columnIndex) => {
                  const count = Number(values[rowIndex][columnIndex])
                  const ratio = mode === 'row'
                    ? (rowTotals[rowIndex] ? count / rowTotals[rowIndex] : 0)
                    : count / maximum
                  const shownValue = mode === 'row'
                    ? (rowTotals[rowIndex] ? `${(ratio * 100).toFixed(1)}%` : '—')
                    : count.toLocaleString('en-US')
                  const cellKey = `${rowIndex}-${columnIndex}`
                  const isSelected = selectedCell === cellKey
                  return (
                    <TableCell key={predicted} align="center" className="mp-matrix-cell-wrap">
                      <Tooltip
                        arrow
                        title={`${actual} classified as ${predicted}: ${count.toLocaleString('en-US')} sample${count === 1 ? '' : 's'}${rowTotals[rowIndex] ? ` (${((count / rowTotals[rowIndex]) * 100).toFixed(1)}% of actual ${actual})` : ''}`}
                      >
                        <button
                          type="button"
                          className={`mp-matrix-cell${isSelected ? ' is-selected' : ''}`}
                          style={{ '--cell-strength': Math.max(0.08, ratio) }}
                          onClick={() => setSelectedCell(isSelected ? null : cellKey)}
                          aria-label={`${actual} actual, ${predicted} predicted, ${shownValue}`}
                        >
                          {shownValue}
                        </button>
                      </Tooltip>
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mp-matrix-legend"><i /> More samples in this cell</div>
    </div>
  )
}

function PerClassPerformance({ rows }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <div className="mp-empty-state">
        <span className="mp-empty-symbol">↗</span>
        <strong>Per-class metrics unavailable</strong>
        <span>The evaluation API has not supplied class-level scores.</span>
      </div>
    )
  }

  const chartHeight = Math.max(220, rows.length * 42)
  return (
    <div className="mp-perclass-content">
      <div className="mp-perclass-chart-scroll">
        <div className="mp-perclass-chart" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 6 }}>
              <CartesianGrid stroke="#E6EEEC" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 1]}
                tickFormatter={value => `${Math.round(value * 100)}%`}
                tick={{ fill: '#819497', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis type="category" dataKey="class_name" width={118} tick={{ fill: '#506C70', fontSize: 10 }} axisLine={false} tickLine={false} />
              <ChartTooltip
                formatter={(value, name) => [formatScore(value), name]}
                contentStyle={{ borderRadius: 10, border: '1px solid #DDE8E6', fontSize: 11 }}
              />
              <Bar dataKey="precision" name="Precision" fill="#168E94" radius={[0, 5, 5, 0]} barSize={8} />
              <Bar dataKey="recall" name="Recall" fill="#4BD2D0" radius={[0, 5, 5, 0]} barSize={8} />
              <Bar dataKey="f1_score" name="F1-score" fill="#D29B69" radius={[0, 5, 5, 0]} barSize={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mp-class-table-scroll">
        <Table size="small" className="mp-class-table" aria-label="Per-class metric support">
          <TableHead><TableRow><TableCell>Class</TableCell><TableCell align="right">Support</TableCell></TableRow></TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.class_name}>
                <TableCell>{row.class_name}</TableCell>
                <TableCell align="right">{row.support === null || row.support === undefined ? 'Not available' : Number(row.support).toLocaleString('en-US')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function ModelPerformance() {
  const [performance, setPerformance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    getMetrics()
      .then(data => {
        if (active) {
          setPerformance(data)
          setError('')
        }
      })
      .catch(() => {
        if (active) {
          setPerformance(null)
          setError('Model evaluation data could not be loaded. Check the API connection and try again.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [refreshKey])

  const refresh = () => {
    setLoading(true)
    setError('')
    setRefreshKey(key => key + 1)
  }

  const model = performance?.model ?? {}
  const evaluation = performance?.evaluation ?? {}
  const metrics = performance?.metrics ?? {}
  const matrix = performance?.confusion_matrix ?? null
  const perClass = performance?.per_class_metrics ?? []
  const classCount = matrix?.labels?.length || perClass.length || null

  return (
    <Box className="mp-page">
      <header className="mp-header">
        <div>
          <span className="mp-eyebrow">04 / MACHINE LEARNING INTELLIGENCE</span>
          <h1>Model Performance</h1>
          <p>Evaluate model accuracy, detection reliability and classification performance.</p>
        </div>
        <div className="mp-header-actions">
          {DEMO_MODE && <span className="mp-demo-badge"><i /> DEMO DATA</span>}
          <Button variant="outlined" startIcon={<RefreshRounded />} onClick={refresh} disabled={loading}>
            Refresh Data
          </Button>
        </div>
      </header>

      {DEMO_MODE && (
        <Alert severity="info" className="mp-demo-notice">
          Demo metrics are illustrative only. No real model evaluation is connected.
        </Alert>
      )}
      {error && <Alert severity="error" className="mp-error-notice">{error}</Alert>}

      <section className="mp-section" aria-labelledby="mp-metrics-title">
        <div className="mp-section-heading">
          <div>
            <span className="mp-eyebrow">EVALUATION SNAPSHOT / 01</span>
            <h2 id="mp-metrics-title">Performance metrics</h2>
          </div>
          {metrics.average && <span className="mp-average-tag">{displayText(metrics.average)} average</span>}
        </div>
        <div className="mp-metrics-grid">
          {loading ? Array.from({ length: 4 }, (_, index) => <Skeleton key={index} variant="rounded" height={150} />) : (
            <>
              <MetricCard label="Accuracy" value={metrics.accuracy} description={METRIC_INFO.accuracy} />
              <MetricCard label="Precision" value={metrics.precision} description={METRIC_INFO.precision} />
              <MetricCard label="Recall" value={metrics.recall} description={METRIC_INFO.recall} />
              <MetricCard label="F1-score" value={metrics.f1_score} description={METRIC_INFO.f1_score} />
            </>
          )}
        </div>
      </section>

      <div className="mp-info-grid">
        <section className="mp-section" aria-labelledby="mp-model-info-title">
          <div className="mp-panel-heading">
            <span className="mp-eyebrow">MODEL PROFILE / 02</span>
            <h2 id="mp-model-info-title">Model information</h2>
          </div>
          {loading ? <Skeleton variant="rounded" height={190} /> : (
            <div className="mp-info-grid-fields">
              <InfoField label="Model name" value={model.name} />
              <InfoField label="Algorithm" value={model.algorithm} />
              <InfoField label="Version" value={model.version} />
              <InfoField label="Training date" value={model.trained_at} date />
              <InfoField label="Evaluation dataset" value={evaluation.dataset} />
              <InfoField label="Evaluation samples" value={evaluation.sample_count === null ? null : Number(evaluation.sample_count).toLocaleString('en-US')} />
            </div>
          )}
        </section>

        <section className="mp-section" aria-labelledby="mp-evaluation-title">
          <div className="mp-panel-heading">
            <span className="mp-eyebrow">VALIDATION CONTEXT / 03</span>
            <h2 id="mp-evaluation-title">Evaluation details</h2>
          </div>
          {loading ? <Skeleton variant="rounded" height={190} /> : (
            <div className="mp-info-grid-fields mp-evaluation-fields">
              <InfoField label="Evaluation samples" value={evaluation.sample_count === null ? null : Number(evaluation.sample_count).toLocaleString('en-US')} />
              <InfoField label="Number of classes" value={classCount} />
              <InfoField label="Evaluation method" value={evaluation.method} />
              <InfoField label="Evaluation ID" value={evaluation.id} />
              <InfoField label="Evaluation date" value={evaluation.evaluated_at} date />
            </div>
          )}
        </section>
      </div>

      <div className="mp-analysis-grid">
        <section className="mp-section mp-matrix-section" aria-labelledby="mp-matrix-title">
          <div className="mp-panel-heading">
            <span className="mp-eyebrow">CLASSIFICATION ERRORS / 04</span>
            <h2 id="mp-matrix-title">Confusion matrix</h2>
          </div>
          {loading ? <Skeleton variant="rounded" height={300} /> : <ConfusionMatrix matrix={matrix} />}
        </section>

        <section className="mp-section mp-perclass-section" aria-labelledby="mp-perclass-title">
          <div className="mp-panel-heading">
            <span className="mp-eyebrow">CLASS-LEVEL QUALITY / 05</span>
            <h2 id="mp-perclass-title">Per-class performance</h2>
          </div>
          {loading ? <Skeleton variant="rounded" height={300} /> : <PerClassPerformance rows={perClass} />}
        </section>
      </div>
    </Box>
  )
}

export default ModelPerformance
