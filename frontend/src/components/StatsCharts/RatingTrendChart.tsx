import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface RatingTrendChartProps {
  data: Array<{ date: string; count: number; avgRating: number }>
}

export default function RatingTrendChart({ data }: RatingTrendChartProps) {
  if (!data.length) return null

  return (
    <div className="rating-trend-chart" style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
          <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
          <Tooltip
            contentStyle={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          />
          <Line type="monotone" dataKey="avgRating" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 4 }} name="平均评分" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
