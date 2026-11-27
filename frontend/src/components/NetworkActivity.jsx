import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function NetworkActivity({ data = [] }) {
  const chartData = Array.isArray(data) ? data : []

  return (
    <section className="cg-panel" aria-labelledby="network-activity-title">
      <div className="cg-panel-header">
        <div>
          <span className="cg-eyebrow">NETWORK OBSERVATION / 01</span>
          <h2 id="network-activity-title">Network Activity</h2>
          <p>Évolution du trafic normal et malveillant</p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <p className="cg-empty-state">Aucune activité disponible.</p>
      ) : (
        <div className="cg-chart">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart
              data={chartData}
              margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
            >
              <defs>
                <linearGradient id="normalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4BD2D0" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4BD2D0" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E5EEEE" strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: '#648084', fontSize: 11 }}
                axisLine={{ stroke: '#CCD9D8' }}
                tickLine={{ stroke: '#CCD9D8' }}
                tickMargin={9}
                minTickGap={20}
              />
              <YAxis
                width={44}
                tick={{ fill: '#648084', fontSize: 11 }}
                axisLine={{ stroke: '#CCD9D8' }}
                tickLine={{ stroke: '#CCD9D8' }}
                tickMargin={8}
              />
              <Tooltip
                contentStyle={{
                  border: '1px solid #DDE8E6',
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(16, 47, 53, 0.12)',
                  color: '#102F35',
                  fontSize: 12,
                }}
                labelStyle={{ color: '#68838A', fontWeight: 600, marginBottom: 6 }}
                formatter={value => Number(value).toLocaleString('fr-FR')}
              />
              <Legend
                verticalAlign="bottom"
                height={32}
                iconType="circle"
                wrapperStyle={{ fontSize: 11, color: '#506C70' }}
              />
              <Area
                type="monotone"
                dataKey="normal"
                name="Normal traffic"
                stroke="#168E94"
                strokeWidth={3}
                fill="url(#normalGradient)"
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="attacks"
                name="Detected attacks"
                stroke="#D97862"
                strokeWidth={2.5}
                fill="transparent"
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
