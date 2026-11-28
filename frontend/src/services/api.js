import {
  mockSummary,
  mockMetrics,
  mockDistribution,
  mockActivity,
  mockRecentAlerts,
} from './mockData'

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api'
).replace(/\/+$/, '')

export const API_ENDPOINTS = [
  { path: '/health', method: 'GET', label: 'Health check' },
  { path: '/summary', method: 'GET', label: 'Dashboard summary' },
  { path: '/analytics?probe=1', method: 'GET', label: 'Analytics aggregation check' },
  { path: '/alerts', method: 'GET', label: 'Threat alerts' },
  { path: '/distribution', method: 'GET', label: 'Threat distribution' },
  { path: '/metrics', method: 'GET', label: 'Model metrics' },
  { path: '/predictions', method: 'GET', label: 'Predictions' },
]

const HEALTH_TIMEOUT_MS = 4500
const ENDPOINT_TIMEOUT_MS = 4500

// true : données de démonstration ; false : données réelles Flask.
// Keep demo data enabled by default; opt into live API data with VITE_DEMO_MODE=false.
export const DEMO_MODE = String(import.meta.env.VITE_DEMO_MODE ?? 'true').trim().toLowerCase() !== 'false'

async function apiRequest(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`)
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}

function responseData(payload) {
  return payload && Object.prototype.hasOwnProperty.call(payload, 'data')
    ? payload.data
    : payload
}

function queryString(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  return query.toString()
}

async function fetchAllPages(endpoint, filters = {}) {
  const makeUrl = page => {
    const query = queryString({ ...filters, limit: 500, page })
    return `${endpoint}?${query}`
  }
  const firstPage = await apiRequest(makeUrl(1))
  const pages = Math.max(1, Number(firstPage?.pagination?.pages) || 1)
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) => apiRequest(makeUrl(index + 2))),
  )
  return [firstPage, ...rest].flatMap(payload => {
    const data = responseData(payload)
    return Array.isArray(data) ? data : []
  })
}

function normalizeAlert(alert) {
  return {
    ...alert,
    id: alert.id ?? alert.alert_id ?? alert.record_id,
    type: alert.attack_type ?? alert.type ?? alert.predicted_label,
    source_ip: alert.source_ip ?? alert.src_ip ?? alert.source ?? null,
    destination_ip: alert.destination_ip ?? alert.dst_ip ?? alert.destination ?? null,
    timestamp: alert.timestamp ?? alert.created_at,
    protocol: alert.protocol ?? alert.protocol_type ?? alert.transport_protocol,
    confidence: alert.confidence ?? alert.confidence_score,
    model_result: alert.model_result ?? alert.prediction_result,
  }
}

function normalizePrediction(prediction) {
  const label = prediction.predicted_label ?? prediction.label
  const isNormal = ['BENIGN', 'NORMAL'].includes(String(label ?? '').toUpperCase())
  return {
    ...prediction,
    timestamp: prediction.timestamp ?? prediction.created_at ?? prediction.date,
    predicted_label: label,
    attack_type: prediction.attack_type ?? (isNormal ? null : label),
    protocol: prediction.protocol ?? prediction.protocol_type ?? prediction.transport_protocol,
    source_ip: prediction.source_ip ?? prediction.src_ip,
  }
}

function periodStart(period, now = Date.now()) {
  const duration = { '24h': 24 * 60 * 60 * 1000, '7d': 7, '30d': 30, '90d': 90 }[period]
  if (!duration) return null
  const milliseconds = period === '24h' ? duration : duration * 24 * 60 * 60 * 1000
  return now - milliseconds
}

function matchesPeriod(record, period, now) {
  const start = periodStart(period, now)
  if (start === null) return true
  const date = new Date(record.timestamp ?? record.created_at)
  return !Number.isNaN(date.getTime()) && date.getTime() >= start && date.getTime() <= now
}

function dominantName(counts) {
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function buildTopSources(alerts) {
  const sources = new Map()
  alerts.forEach(alert => {
    const ip = alert.source_ip
    if (!ip) return
    const entry = sources.get(ip) ?? { source_ip: ip, attack_count: 0, types: new Map() }
    entry.attack_count += 1
    const type = alert.type
    if (type) entry.types.set(type, (entry.types.get(type) ?? 0) + 1)
    sources.set(ip, entry)
  })
  return [...sources.values()]
    .map(({ source_ip, attack_count, types }) => ({
      source_ip,
      attack_count,
      dominant_attack_type: dominantName(types),
    }))
    .sort((a, b) => b.attack_count - a.attack_count)
    .slice(0, 8)
}

function buildMockAnalytics(filters) {
  const now = Date.now()
  const period = filters.period ?? '7d'
  const selectedType = filters.attackType && filters.attackType !== 'all'
    ? filters.attackType
    : null
  const activity = mockActivity.filter(row => matchesPeriod(row, period, now))
  const attackCounts = new Map()
  let totalEvents = 0
  let maliciousEvents = 0

  const traffic = activity.map(row => {
    const breakdown = row.attack_breakdown ?? {}
    const matchingAttacks = Object.entries(breakdown)
      .filter(([name]) => !selectedType || name.toLowerCase() === selectedType.toLowerCase())
    const malicious = matchingAttacks.reduce((sum, [, value]) => sum + Number(value || 0), 0)
    matchingAttacks.forEach(([name, value]) => {
      attackCounts.set(name, (attackCounts.get(name) ?? 0) + Number(value || 0))
    })
    const normal = Number(row.normal) || 0
    totalEvents += normal + malicious
    maliciousEvents += malicious
    return { timestamp: row.timestamp, normal, malicious }
  })

  const filteredAlerts = mockRecentAlerts
    .map(normalizeAlert)
    .filter(alert => matchesPeriod(alert, period, now))
    .filter(alert => !selectedType || String(alert.type ?? '').toLowerCase() === selectedType.toLowerCase())

  const protocols = new Map()
  filteredAlerts.forEach(alert => {
    if (alert.protocol) protocols.set(alert.protocol, (protocols.get(alert.protocol) ?? 0) + 1)
  })

  return {
    summary: {
      total_events: totalEvents,
      attack_rate: totalEvents ? maliciousEvents / totalEvents : null,
      top_attack: dominantName(attackCounts),
    },
    traffic,
    attack_distribution: [...attackCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    protocol_distribution: [...protocols.entries()]
      .map(([protocol, count]) => ({ protocol, count }))
      .sort((a, b) => b.count - a.count),
    top_sources: buildTopSources(filteredAlerts),
    options: {
      attack_types: [...new Set([
        ...mockDistribution.filter(item => !['normal', 'benign'].includes(item.name.toLowerCase())).map(item => item.name),
        ...Object.keys(mockActivity[0]?.attack_breakdown ?? {}),
      ])].sort(),
    },
  }
}

/**
 * Analytics contract returned in both modes:
 * summary { total_events, attack_rate (0..1|null), top_attack },
 * traffic [{ timestamp (ISO date), normal, malicious }],
 * attack_distribution [{ category, count }],
 * protocol_distribution [{ protocol, count }],
 * top_sources [{ source_ip, attack_count, dominant_attack_type }],
 * options { attack_types }.
 * `period` and `attackType` are applied here so page components never know
 * the Flask or MongoDB field names. In live mode the backend returns aggregates.
 */
export const getAnalytics = async (filters = {}) => {
  if (DEMO_MODE) return buildMockAnalytics(filters)
  const params = queryString({
    period: filters.period ?? '7d',
    attack_type: filters.attackType ?? 'all',
  })
  const result = responseData(await apiRequest(`/analytics?${params}`)) ?? {}
  return {
    summary: result.summary ?? { total_events: 0, attack_rate: null, top_attack: null },
    traffic: Array.isArray(result.traffic) ? result.traffic : [],
    attack_distribution: Array.isArray(result.attack_distribution) ? result.attack_distribution : [],
    protocol_distribution: Array.isArray(result.protocol_distribution) ? result.protocol_distribution : [],
    top_sources: Array.isArray(result.top_sources) ? result.top_sources : [],
    options: {
      attack_types: Array.isArray(result.options?.attack_types) ? result.options.attack_types : [],
    },
  }
}

export const getSummary = async () => {
  if (DEMO_MODE) return mockSummary
  const summary = responseData(await apiRequest('/summary')) ?? {}
  return {
    ...summary,
    total_predictions: summary.total_predictions ?? summary.predictions,
    total_alerts: summary.total_alerts ?? summary.alerts,
  }
}

export const getMetrics = async () => {
  if (DEMO_MODE) return normalizeModelPerformance(mockMetrics)
  const result = responseData(await apiRequest('/metrics?limit=1'))
  const latest = Array.isArray(result) ? result[0] : result
  return normalizeModelPerformance(latest ?? {})
}

function normalizeMetric(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) return null
  // Metrics in the frontend contract are fractions. Accept legacy percentage values.
  return numeric > 1 ? numeric / 100 : numeric
}

function finiteOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null
}

function normalizeMatrix(raw, source) {
  const matrixSource = raw?.confusion_matrix ?? raw?.matrix ?? source?.confusion_matrix
  const labels = matrixSource?.labels ?? matrixSource?.classes ?? raw?.class_labels ?? raw?.labels
  const values = matrixSource?.values ?? matrixSource?.matrix ?? matrixSource
  if (!Array.isArray(labels) || !Array.isArray(values) || labels.length === 0) return null
  if (values.length !== labels.length) return null
  const normalized = values.map(row => {
    if (!Array.isArray(row) || row.length !== labels.length) return null
    const cells = row.map(value => finiteOrNull(value))
    return cells.some(value => value === null) ? null : cells
  })
  if (normalized.some(row => row === null)) return null
  return { labels: labels.map(String), values: normalized }
}

function normalizePerClassMetrics(raw, source) {
  const rows = raw?.per_class_metrics ?? raw?.class_metrics ?? source?.per_class_metrics ?? []
  const entries = Array.isArray(rows)
    ? rows
    : Object.entries(rows).map(([class_name, value]) => ({ class_name, ...value }))
  return entries
    .filter(row => row && typeof row === 'object' && (row.class_name ?? row.label ?? row.name))
    .map(row => ({
      class_name: String(row.class_name ?? row.label ?? row.name),
      precision: normalizeMetric(row.precision),
      recall: normalizeMetric(row.recall),
      f1_score: normalizeMetric(row.f1_score ?? row.f1),
      support: finiteOrNull(row.support),
    }))
}

/** Normalize a stored evaluation record to the stable Model Performance contract. */
export function normalizeModelPerformance(raw = {}) {
  const modelSource = raw.model && typeof raw.model === 'object' ? raw.model : raw
  const evaluationSource = raw.evaluation && typeof raw.evaluation === 'object' ? raw.evaluation : raw
  const metricSource = raw.metrics && typeof raw.metrics === 'object' ? raw.metrics : raw
  const metrics = {
    accuracy: normalizeMetric(metricSource.accuracy),
    precision: normalizeMetric(metricSource.precision),
    recall: normalizeMetric(metricSource.recall),
    f1_score: normalizeMetric(metricSource.f1_score ?? metricSource.f1),
    average: metricSource.average ?? metricSource.average_method ?? metricSource.aggregation ?? null,
  }
  const confusion_matrix = normalizeMatrix(raw, evaluationSource)
  const per_class_metrics = normalizePerClassMetrics(raw, metricSource)
  const model = {
    name: modelSource.name ?? modelSource.model_name ?? null,
    algorithm: modelSource.algorithm ?? modelSource.model_algorithm ?? null,
    version: modelSource.version ?? modelSource.model_version ?? null,
    trained_at: modelSource.trained_at ?? null,
  }
  const evaluation = {
    dataset: evaluationSource.dataset ?? evaluationSource.evaluation_dataset ?? evaluationSource.test_dataset ?? null,
    evaluated_at: evaluationSource.evaluated_at ?? evaluationSource.evaluation_date ?? null,
    sample_count: finiteOrNull(evaluationSource.sample_count ?? evaluationSource.evaluation_samples ?? evaluationSource.test_size),
    method: evaluationSource.method ?? evaluationSource.evaluation_method ?? null,
    id: evaluationSource.id ?? evaluationSource.evaluation_id ?? evaluationSource.run_id ?? null,
  }

  return {
    model,
    evaluation,
    metrics,
    confusion_matrix,
    per_class_metrics,
    // Compatibility aliases used by Overview while it is migrated to the contract.
    accuracy: metrics.accuracy,
    precision: metrics.precision,
    recall: metrics.recall,
    f1_score: metrics.f1_score,
  }
}

export const getDistribution = async () => {
  if (DEMO_MODE) return mockDistribution
  const result = responseData(await apiRequest('/distribution'))
  const attackTypes = result?.by_attack_type
  const predictedLabels = result?.by_predicted_label
  const hasAttackTypes = Array.isArray(attackTypes)
    && attackTypes.some(item => item?.value != null && Number(item.count ?? item.value_count ?? item.value) > 0)
  const rows = Array.isArray(result)
    ? result
    : hasAttackTypes
      ? attackTypes
      : Array.isArray(predictedLabels)
        ? predictedLabels
        : []
  return rows
    .filter(item => item && item.value != null)
    .map(item => ({ name: String(item.name ?? item.value), value: Number(item.count ?? item.value_count ?? item.value) }))
    .filter(item => Number.isFinite(item.value) && item.value > 0)
}

export const getAlerts = async (filters = {}) => {
  if (DEMO_MODE) return mockRecentAlerts
  const query = filters.attackType ? { attack_type: filters.attackType } : {}
  const result = await fetchAllPages('/alerts', query)
  return result.map(normalizeAlert)
}

export const getAlertsPage = async ({ page = 1, limit = 100, ...filters } = {}) => {
  if (DEMO_MODE) {
    const start = (page - 1) * limit
    return {
      data: mockRecentAlerts.slice(start, start + limit),
      pagination: {
        page,
        limit,
        total: mockRecentAlerts.length,
        pages: Math.ceil(mockRecentAlerts.length / limit),
      },
    }
  }
  const query = queryString({ ...filters, page, limit })
  const payload = await apiRequest(`/alerts?${query}`)
  const rows = responseData(payload)
  return {
    data: Array.isArray(rows) ? rows.map(normalizeAlert) : [],
    pagination: payload?.pagination ?? null,
  }
}

export const getRecentAlerts = async (limit = 5) => {
  if (DEMO_MODE) return mockRecentAlerts.slice(0, limit)
  const query = queryString({ page: 1, limit })
  const payload = await apiRequest(`/alerts?${query}`)
  const rows = responseData(payload)
  return Array.isArray(rows) ? rows.map(normalizeAlert) : []
}

export const getPredictionsPage = async ({ page = 1, limit = 100, ...filters } = {}) => {
  if (DEMO_MODE) return { data: [], pagination: { page, limit, total: 0, pages: 0 } }
  const query = queryString({ ...filters, page, limit })
  const payload = await apiRequest(`/predictions?${query}`)
  const rows = responseData(payload)
  return {
    data: Array.isArray(rows) ? rows.map(normalizePrediction) : [],
    pagination: payload?.pagination ?? null,
  }
}

export const getPredictions = async options => {
  const result = await getPredictionsPage(options)
  return Array.isArray(result) ? result : result.data
}

function apiEndpointUrl(path) {
  return `${API_BASE_URL}${path}`
}

function endpointStatusFromResponse(response) {
  if (response.status === 404) return 'not_configured'
  return response.ok ? 'online' : 'degraded'
}

async function probeEndpoint(path, timeoutMs = ENDPOINT_TIMEOUT_MS, readJson = false) {
  const startedAt = Date.now()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(apiEndpointUrl(path), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    let payload = null
    if (readJson) {
      try {
        payload = await response.json()
      } catch {
        // Health status remains useful when an older backend returns non-JSON.
      }
    }
    return {
      path,
      status: endpointStatusFromResponse(response),
      http_status: response.status,
      response_time_ms: Date.now() - startedAt,
      checked_at: new Date().toISOString(),
      error: response.ok || response.status === 404
        ? null
        : `The endpoint returned HTTP ${response.status}.`,
      payload,
      responded: true,
    }
  } catch (error) {
    const timedOut = error?.name === 'AbortError'
    return {
      path,
      status: 'offline',
      http_status: null,
      response_time_ms: Date.now() - startedAt,
      checked_at: new Date().toISOString(),
      error: timedOut
        ? `The request timed out after ${timeoutMs} ms.`
        : 'No response. Flask may be stopped, unreachable, or blocked by CORS.',
      responded: false,
    }
  } finally {
    window.clearTimeout(timeout)
  }
}

function safeServiceStatus(value) {
  const status = String(value ?? '').toLowerCase()
  return ['online', 'offline', 'degraded', 'unknown'].includes(status)
    ? status
    : 'unknown'
}

/** Always performs a real network request, including when DEMO_MODE is enabled. */
export const getHealth = async () => {
  const probe = await probeEndpoint('/health', HEALTH_TIMEOUT_MS, true)
  const payload = probe.payload ?? {}
  const suppliedServices = payload.services ?? {}
  const flaskStatus = probe.responded ? 'online' : 'offline'

  let mongoStatus = safeServiceStatus(suppliedServices.mongodb?.status)
  if (!suppliedServices.mongodb) {
    if (payload.status === 'success') mongoStatus = 'online'
    else if (payload.status === 'error' && probe.http_status >= 500) mongoStatus = 'offline'
  }

  const service = (key, fallbackStatus, responseTime = null) => ({
    status: safeServiceStatus(suppliedServices[key]?.status ?? fallbackStatus),
    required: suppliedServices[key]?.required ?? false,
    response_time_ms: suppliedServices[key]?.response_time_ms
      ?? suppliedServices[key]?.latency_ms
      ?? responseTime,
  })

  const services = {
    flask: {
      status: flaskStatus,
      required: true,
      response_time_ms: probe.response_time_ms,
      checked_at: probe.checked_at,
    },
    mongodb: {
      ...service('mongodb', mongoStatus),
      required: true,
      checked_at: probe.checked_at,
    },
    pyspark: {
      ...service('pyspark', 'unknown'),
      required: false,
      checked_at: probe.checked_at,
    },
    ml_model: {
      ...service('ml_model', 'unknown'),
      required: false,
      checked_at: probe.checked_at,
    },
  }

  const status = !probe.responded
    ? 'offline'
    : mongoStatus === 'online' && probe.status === 'online'
      ? 'online'
      : 'degraded'

  return {
    status,
    services,
    checked_at: probe.checked_at,
    endpoint: {
      path: probe.path,
      status: probe.status,
      http_status: probe.http_status,
      response_time_ms: probe.response_time_ms,
      error: probe.error,
      responded: probe.responded,
    },
  }
}

function safeBackendUrl() {
  try {
    const url = new URL(API_BASE_URL)
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
  } catch {
    return API_BASE_URL.replace(/[?#].*$/, '')
  }
}

function endpointDisplayPath(path) {
  try {
    const basePath = new URL(API_BASE_URL).pathname.replace(/\/+$/, '')
    return `${basePath}${path}` || path
  } catch {
    return path
  }
}

/** Live, read-only status snapshot for the API Status page. */
export const checkApiStatus = async () => {
  const health = await getHealth()
  const nonHealthEndpoints = API_ENDPOINTS.filter(endpoint => endpoint.path !== '/health')
  const endpointProbes = await Promise.all(
    nonHealthEndpoints.map(endpoint => probeEndpoint(endpoint.path)),
  )
  const healthEndpoint = API_ENDPOINTS.find(endpoint => endpoint.path === '/health')
  const endpoints = [
    {
      ...healthEndpoint,
      ...health.endpoint,
      display_path: endpointDisplayPath(healthEndpoint.path),
      last_checked: health.checked_at,
    },
    ...endpointProbes.map(probe => ({
      ...API_ENDPOINTS.find(endpoint => endpoint.path === probe.path),
      ...probe,
      display_path: endpointDisplayPath(probe.path),
      last_checked: probe.checked_at,
    })),
  ]

  const requiredServices = [health.services.flask, health.services.mongodb]
  const endpointIssue = endpoints.some(endpoint => endpoint.status !== 'online')
  const overallStatus = health.services.flask.status === 'offline'
    ? 'offline'
    : requiredServices.some(service => service.status !== 'online') || endpointIssue
      ? 'degraded'
      : 'online'

  return {
    backend_url: safeBackendUrl(),
    overall_status: overallStatus,
    checked_at: health.checked_at,
    health_check: {
      status: health.endpoint.status,
      response_time_ms: health.endpoint.response_time_ms,
      http_status: health.endpoint.http_status,
      error: health.endpoint.error,
    },
    services: health.services,
    endpoints,
  }
}

export const getActivity = async () => {
  if (DEMO_MODE) return mockActivity
  const analytics = await getAnalytics({ period: '24h', attackType: 'all' })
  return analytics.traffic.map(point => ({
    time: new Date(point.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    normal: point.normal,
    attacks: point.malicious,
  }))
}
