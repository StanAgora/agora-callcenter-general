import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts'
import { Loader2, PhoneCall, PhoneIncoming, Clock, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'

const API = 'http://localhost:8000'

// ── Types ──────────────────────────────────────────────────────────────────────

interface DailyStats {
  date: string
  total_calls: number
  answered_calls: number
  answer_rate: number
  total_duration_seconds: number
}

interface CategoryEntry {
  category: string
  count: number
}

interface Totals {
  total_calls: number
  total_answered: number
  overall_answer_rate: number
  total_duration_seconds: number
}

interface StatsData {
  daily_stats: DailyStats[]
  category_distribution: CategoryEntry[]
  totals: Totals
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const RANGE_OPTIONS = [
  { label: '7d',  value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: 'All', value: 0 },
]

const PIE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, iconBg,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  iconBg: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-6 py-5 flex items-center gap-4">
      <div className={cn('p-3 rounded-xl', iconBg)}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-40 text-slate-300 text-sm">
      No data available
    </div>
  )
}

// Tooltip: total calls
function CallsTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-slate-700">{label}</p>
      <p className="text-slate-500 mt-0.5">{payload[0].value} calls</p>
    </div>
  )
}

// Tooltip: answer rate
function RateTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-slate-700">{label}</p>
      <p className="text-slate-500 mt-0.5">{payload[0].value}%</p>
    </div>
  )
}

// Tooltip: duration (shows HH:MM:SS)
function DurationTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { payload: DailyStats }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-slate-700">{label}</p>
      <p className="text-slate-500 mt-0.5">{formatDuration(payload[0].payload.total_duration_seconds)}</p>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function AnalyticsDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [range, setRange] = useState(30)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data: StatsData = await fetch(`${API}/api/dashboard/stats`).then(r => {
        if (!r.ok) throw new Error(r.statusText)
        return r.json()
      })
      setStats(data)
    } catch (e) {
      setError(`Failed to load data: ${e instanceof Error ? e.message : e}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Apply date-range filter
  const filteredDaily = (() => {
    if (!stats) return []
    if (range === 0) return stats.daily_stats
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - range)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return stats.daily_stats.filter(d => d.date >= cutoffStr)
  })()

  // Re-compute totals from filtered days
  const ft = (() => {
    if (!filteredDaily.length) return stats?.totals ?? null
    const total_calls    = filteredDaily.reduce((s, d) => s + d.total_calls, 0)
    const total_answered = filteredDaily.reduce((s, d) => s + d.answered_calls, 0)
    const total_duration = filteredDaily.reduce((s, d) => s + d.total_duration_seconds, 0)
    return {
      total_calls,
      total_answered,
      overall_answer_rate: total_calls > 0
        ? Math.round(total_answered / total_calls * 1000) / 10
        : 0,
      total_duration_seconds: total_duration,
    }
  })()

  // Chart data: add a display label and duration_minutes for Y-axis
  const chartData = filteredDaily.map(d => ({
    ...d,
    dateLabel: shortDate(d.date),
    duration_minutes: Math.round(d.total_duration_seconds / 60),
  }))

  return (
    <div className="p-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Call analytics overview</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Range pills */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  range === opt.value
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Loading / Error ─────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm">Loading…</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && ft && (
        <>
          {/* ── Stat Cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={PhoneCall}
              label="Total Calls"
              value={ft.total_calls.toLocaleString()}
              sub={range > 0 ? `Last ${range} days` : 'All time'}
              iconBg="bg-blue-500"
            />
            <StatCard
              icon={PhoneIncoming}
              label="Answer Rate"
              value={`${ft.overall_answer_rate}%`}
              sub={`${ft.total_answered.toLocaleString()} answered`}
              iconBg="bg-emerald-500"
            />
            <StatCard
              icon={Clock}
              label="Total Duration"
              value={formatDuration(ft.total_duration_seconds)}
              sub="HH:MM:SS"
              iconBg="bg-violet-500"
            />
          </div>

          {/* ── Line Charts ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6">

            {/* Total Calls */}
            <ChartCard title="Total Calls per Day">
              {chartData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CallsTooltip />} />
                    <Line
                      type="monotone" dataKey="total_calls" name="Total Calls"
                      stroke="#3b82f6" strokeWidth={2}
                      dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Answer Rate */}
            <ChartCard title="Answer Rate per Day (%)">
              {chartData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis
                      domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false} axisLine={false} tickFormatter={v => `${v}%`}
                    />
                    <Tooltip content={<RateTooltip />} />
                    <Line
                      type="monotone" dataKey="answer_rate" name="Answer Rate"
                      stroke="#10b981" strokeWidth={2}
                      dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Duration */}
            <ChartCard title="Total Call Duration per Day">
              {chartData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                      tickFormatter={v => `${v}m`}
                    />
                    <Tooltip content={<DurationTooltip />} />
                    <Line
                      type="monotone" dataKey="duration_minutes" name="Duration"
                      stroke="#8b5cf6" strokeWidth={2}
                      dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* ── Pie Chart ──────────────────────────────────────────────── */}
          {stats && (
            <ChartCard title="Call Status Distribution (All Time)">
              {stats.category_distribution.length === 0 ? <EmptyChart /> : (
                <div className="flex items-center justify-center gap-10 flex-wrap py-2">
                  <ResponsiveContainer width={280} height={260}>
                    <PieChart>
                      <Pie
                        data={stats.category_distribution}
                        dataKey="count"
                        nameKey="category"
                        cx="50%" cy="50%"
                        outerRadius={100} innerRadius={56}
                        paddingAngle={2}
                      >
                        {stats.category_distribution.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                        formatter={(value: number, name: string) => {
                          const pct = stats.totals.total_calls > 0
                            ? Math.round(value / stats.totals.total_calls * 1000) / 10
                            : 0
                          return [`${value.toLocaleString()} (${pct}%)`, name]
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Custom legend */}
                  <div className="space-y-2.5 min-w-[180px]">
                    {stats.category_distribution.map((entry, i) => {
                      const pct = stats.totals.total_calls > 0
                        ? Math.round(entry.count / stats.totals.total_calls * 1000) / 10
                        : 0
                      return (
                        <div key={entry.category} className="flex items-center gap-2.5 text-sm">
                          <span
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="text-slate-600 capitalize flex-1">{entry.category}</span>
                          <span className="text-slate-800 font-medium tabular-nums">{entry.count.toLocaleString()}</span>
                          <span className="text-slate-400 text-xs tabular-nums w-10 text-right">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </ChartCard>
          )}
        </>
      )}
    </div>
  )
}
