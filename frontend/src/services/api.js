import {
  mockSummary,
  mockMetrics,
  mockDistribution,
  mockActivity,
  mockRecentAlerts,
} from './mockData'

const API_BASE_URL = 'http://127.0.0.1:5000/api'

// true : données de démonstration ; false : données réelles Flask.
export const DEMO_MODE = true

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
  if (DEMO_MODE) return mockMetrics
  const result = responseData(await apiRequest('/metrics'))
  const metrics = Array.isArray(result) ? result[0] : result
  return metrics ?? {}
}

export const getDistribution = async () => {
  if (DEMO_MODE) return mockDistribution
  const result = responseData(await apiRequest('/distribution'))
  const rows = Array.isArray(result)
    ? result
    : result?.by_attack_type ?? result?.by_predicted_label ?? []
  return rows
    .filter(item => item && item.value != null)
    .map(item => ({ name: String(item.name ?? item.value), value: Number(item.count ?? item.value_count ?? item.value) }))
    .filter(item => Number.isFinite(item.value) && item.value > 0)
}

export const getAlerts = async () => {
  if (DEMO_MODE) return mockRecentAlerts
  const firstPage = await apiRequest('/alerts?limit=500&page=1')
  const pageCount = Math.max(1, Number(firstPage?.pagination?.pages) || 1)
  const remainingPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      apiRequest(`/alerts?limit=500&page=${index + 2}`),
    ),
  )
  const result = [firstPage, ...remainingPages]
    .flatMap(payload => {
      const data = responseData(payload)
      return Array.isArray(data) ? data : []
    })
  return result.map(alert => ({
    ...alert,
    id: alert.id ?? alert.alert_id ?? alert.record_id,
    type: alert.attack_type ?? alert.type ?? alert.predicted_label,
    source_ip: alert.source_ip ?? alert.src_ip ?? alert.source ?? null,
    destination_ip: alert.destination_ip ?? alert.dst_ip ?? alert.destination ?? null,
    timestamp: alert.timestamp ?? alert.created_at,
    confidence: alert.confidence ?? alert.confidence_score,
    model_result: alert.model_result ?? alert.prediction_result,
  }))
}

export const getPredictions = async () => {
  if (DEMO_MODE) return []
  const result = responseData(await apiRequest('/predictions'))
  return Array.isArray(result) ? result : []
}

export const getHealth = () =>
  DEMO_MODE ? Promise.resolve({ status: 'demo' }) : apiRequest('/health')

export const getActivity = async () => {
  if (DEMO_MODE) return mockActivity

  // Flask exposes predictions rather than a dedicated activity endpoint.
  // Build hourly chart points from the timestamps and labels it actually returns.
  const predictions = await getPredictions()
  const buckets = new Map()
  predictions.forEach(prediction => {
    const date = new Date(prediction.created_at ?? prediction.timestamp)
    if (Number.isNaN(date.getTime())) return
    date.setMinutes(0, 0, 0)
    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const point = buckets.get(time) ?? { time, normal: 0, attacks: 0, sortTime: date.getTime() }
    const label = String(prediction.predicted_label ?? '').toUpperCase()
    if (label === 'BENIGN' || label === 'NORMAL') point.normal += 1
    else point.attacks += 1
    buckets.set(time, point)
  })
  return [...buckets.values()]
    .sort((a, b) => a.sortTime - b.sortTime)
    .map(({ time, normal, attacks }) => ({ time, normal, attacks }))
}
