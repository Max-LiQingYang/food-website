import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface FavoritesTrendChartProps {
  data: Array<{ date: string; dailyNew: number; cumulative: number }>
}

export default function FavoritesTrendChart({ data }: FavoritesTrendChartProps) {
  if (!data.length) return null

  return (
    <div className="favorites-trend-chart" style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="favGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
          <YAxis tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
          <Tooltip
            contentStyle={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          />
          <Area type="monotone" dataKey="cumulative" stroke="var(--color-primary)" fill="url(#favGrad)" strokeWidth={2} name="累计收藏" />
          <Area type="monotone" dataKey="dailyNew" stroke="var(--color-accent)" fill="none" strokeWidth={1.5} strokeDasharray="4 4" name="每日新增" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
