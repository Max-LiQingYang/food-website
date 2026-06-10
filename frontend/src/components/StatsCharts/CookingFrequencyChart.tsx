import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface CookingFrequencyChartProps {
  data: Array<{ date: string; count: number; avgRating: number }>
}

export default function CookingFrequencyChart({ data }: CookingFrequencyChartProps) {
  if (!data.length) return null

  return (
    <div className="cooking-freq-chart" style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
          <YAxis tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          />
          <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="烹饪次数" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
