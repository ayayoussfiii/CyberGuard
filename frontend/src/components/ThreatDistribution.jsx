import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import { getDistribution, DEMO_MODE } from '../services/api'

const COLORS = ['#4BD2D0', '#147C85', '#2E9FA6', '#85C9C8', '#B7D9D7']

export default function ThreatDistribution() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let active = true

    getDistribution()
      .then(result => {
        if (!active) return
        const validData = Array.isArray(result)
          ? result.filter(item => item && item.name != null && Number.isFinite(Number(item.value)))
            .map(item => ({ ...item, value: Number(item.value) }))
          : []
        setData(validData)
      })
      .catch(() => {
        if (active) setError('Impossible de charger les données.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <section className="threat-card" aria-labelledby="threat-distribution-title">
      <div className="threat-heading">
        <div>
          <span className="threat-eyebrow">02 / THREAT INTELLIGENCE</span>
          <h2 id="threat-distribution-title">Threat Distribution</h2>
          <p>Répartition des événements analysés</p>
        </div>
        {DEMO_MODE && <span className="demo-label">DEMO DATA</span>}
      </div>

      {loading ? (
        <p className="threat-state">Chargement des données…</p>
      ) : error ? (
        <p className="threat-state" role="status">{error}</p>
      ) : data.length === 0 ? (
        <p className="threat-state">Aucune donnée disponible.</p>
      ) : (
        <div className="threat-body">
          <div className="threat-chart">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={3}
                  stroke="none"
                  onMouseEnter={(_, index) => setSelected(index)}
                  onMouseLeave={() => setSelected(null)}
                >
                  {data.map((item, index) => (
                    <Cell
                      key={`${item.name}-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      opacity={selected === null || selected === index ? 1 : 0.35}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={value => Number(value).toLocaleString('fr-FR')}
                  contentStyle={{
                    border: '1px solid #DDE8E6',
                    borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="threat-chart-center" aria-live="polite">
              <strong>{total.toLocaleString('fr-FR')}</strong>
              <span>EVENTS</span>
            </div>
          </div>

          <div className="threat-legend" aria-label="Threat categories">
            {data.map((item, index) => {
              const percent = total ? ((item.value / total) * 100).toFixed(1) : '0.0'
              return (
                <div
                  key={`${item.name}-${index}`}
                  className="threat-legend-row"
                  onMouseEnter={() => setSelected(index)}
                  onMouseLeave={() => setSelected(null)}
                >
                  <span className="threat-dot" style={{ background: COLORS[index % COLORS.length] }} />
                  <span className="threat-name" title={item.name}>{item.name}</span>
                  <strong>{percent}%</strong>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
