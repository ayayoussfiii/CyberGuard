import { Link } from 'react-router-dom'

function severityClass(severity) {
  const normalized = String(severity ?? 'unknown').toLowerCase()
  if (['critical', 'high', 'medium', 'low', 'info'].includes(normalized)) {
    return `cg-severity-${normalized}`
  }
  return 'cg-severity-unknown'
}

function formatTime(timestamp) {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function RecentThreats({ alerts = [] }) {
  const rows = Array.isArray(alerts) ? alerts.slice(0, 5) : []

  return (
    <section className="cg-panel" aria-labelledby="recent-threats-title">
      <div className="cg-panel-header">
        <div>
          <span className="cg-eyebrow">SECURITY MONITORING / 03</span>
          <h2 id="recent-threats-title">Recent Threats</h2>
          <p>Dernières alertes enregistrées</p>
        </div>
        <Link className="cg-view-all" to="/alerts">View all</Link>
      </div>

      <div className="cg-table-wrapper">
        <table className="cg-table">
          <thead>
            <tr>
              <th scope="col">Threat</th>
              <th scope="col">Source IP</th>
              <th scope="col">Severity</th>
              <th scope="col">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="4" className="cg-empty-state">Aucune alerte disponible.</td></tr>
            ) : rows.map((alert, index) => {
              const severity = String(alert?.severity ?? 'Unknown')
              return (
                <tr key={alert?.id ?? `${alert?.type ?? 'alert'}-${index}`}>
                  <td className="cg-threat-name">{alert?.type ?? '—'}</td>
                  <td>{alert?.source_ip ?? '—'}</td>
                  <td><span className={`cg-severity ${severityClass(severity)}`}>{severity}</span></td>
                  <td>{formatTime(alert?.timestamp)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
