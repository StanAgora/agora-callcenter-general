import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Target, CheckCircle2, Loader2, AlertCircle, TrendingUp, BarChart3, Percent } from 'lucide-react'
import { cn } from '../../lib/utils'

const API = 'http://localhost:8000'
const QUOTA_INSIGHT_POLL_MS = 10_000

interface QuotaHitEvidenceRow {
  call_id: string
  at?: string
  confidence?: number
  evidence?: string
  variables?: Record<string, string | number | null | undefined>
}

interface QuotaCell {
  id: number
  campaign_id: string
  label: string
  filters: Record<string, string>
  target: number
  completed: number
  hit_evidence?: QuotaHitEvidenceRow[] | null
}

interface CampaignInfo {
  campaign_id: string
  campaign_name: string
  status: string | null
}

function pct(completed: number, target: number): number {
  if (!target) return 0
  return Math.min(100, Math.round((completed / target) * 100))
}

function cellColor(p: number) {
  if (p >= 100) return { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-emerald-200' }
  if (p >= 60)  return { bar: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200',           border: 'border-blue-200' }
  if (p >= 20)  return { bar: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200',        border: 'border-amber-200' }
  return               { bar: 'bg-slate-300',   badge: 'bg-slate-50 text-slate-500 border-slate-200',        border: 'border-slate-200' }
}

/** 有 transcript 命中记录时，卡片底色：未完成淡黄、已满额淡绿；无命中沿用默认白底 */
function quotaCardSurface(hasHits: boolean, isQuotaFull: boolean): { bg: string; border: string } {
  if (!hasHits) return { bg: 'bg-white', border: '' }
  if (isQuotaFull) return { bg: 'bg-emerald-50', border: 'border-emerald-200' }
  return { bg: 'bg-amber-50', border: 'border-amber-200' }
}

export function QuotaInsightPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [cells, setCells]         = useState<QuotaCell[]>([])
  const [campaign, setCampaign]   = useState<CampaignInfo | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [selectedCellId, setSelectedCellId] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function loadQuotaInsight(initial: boolean) {
      if (initial) {
        setLoading(true)
        setError('')
      }
      try {
        const [cellData, campData] = await Promise.all([
          fetch(`${API}/api/quota-v2/${id}/cells`).then(r => r.json()),
          fetch(`${API}/api/campaigns-v2/${id}`).then(r => r.json()),
        ])
        if (cancelled) {
          return
        }
        setCells(cellData)
        const c = campData?.local ? { ...campData.local, ...campData.detail } : campData
        setCampaign({
          campaign_id: id,
          campaign_name: c.campaign_name ?? id,
          status: c.status ?? null,
        })
        if (initial) {
          setError('')
        }
      } catch {
        if (cancelled) {
          return
        }
        if (initial) {
          setError(t('quota_insight.load_fail'))
        }
      } finally {
        if (!cancelled && initial) {
          setLoading(false)
        }
      }
    }

    void loadQuotaInsight(true)
    const timer = window.setInterval(() => {
      void loadQuotaInsight(false)
    }, QUOTA_INSIGHT_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [id, t])

  useEffect(() => {
    if (selectedCellId == null) return
    if (!cells.some(c => c.id === selectedCellId)) {
      setSelectedCellId(null)
    }
  }, [cells, selectedCellId])

  const totalTarget    = cells.reduce((s, c) => s + (c.target || 0), 0)
  const totalCompleted = cells.reduce((s, c) => s + (c.completed || 0), 0)
  const overallPct     = pct(totalCompleted, totalTarget)
  const doneCount      = cells.filter(c => pct(c.completed, c.target) >= 100).length

  const selectedCell = selectedCellId != null ? cells.find(c => c.id === selectedCellId) : null
  const hitRows: QuotaHitEvidenceRow[] = (() => {
    const raw = selectedCell?.hit_evidence
    if (!raw || !Array.isArray(raw)) return []
    return [...raw].reverse()
  })()

  const showHitDataRows = selectedCellId != null && selectedCell != null && hitRows.length > 0
  const hitTablePlaceholder: string = (() => {
    if (selectedCellId == null) return t('quota_insight.hit_records_hint')
    if (!selectedCell) return t('quota_insight.hit_records_hint')
    if (hitRows.length === 0) return t('quota_insight.hit_records_empty')
    return ''
  })()

  function formatConfidence(n: number | undefined): string {
    if (n == null || Number.isNaN(n)) return '—'
    if (n <= 1 && n >= 0) return `${Math.round(n * 100)}%`
    return String(n)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-white">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={15} /> {t('agora.back')}
        </button>
        <div className="w-px h-4 bg-slate-200" />
        <div>
          <h1 className="font-semibold text-slate-900 text-sm leading-none">
            {campaign?.campaign_name ?? id}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">{id}</p>
        </div>
        <span className="ml-auto text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-1">
          Quota Insight
        </span>
      </div>

      {/* Body */}
      {loading && (
        <div className="flex-1 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 size={18} className="animate-spin" /> {t('agora.loading')}
        </div>
      )}

      {error && (
        <div className="m-6 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex-1 overflow-hidden flex min-h-0">

          {/* ── LEFT: summary + hit records 表格（固定视区高度）── */}
          <div
            className={cn(
              'flex-1 min-w-0 min-h-0 flex flex-col gap-5 overflow-hidden p-6',
              'bg-slate-50/60',
            )}
          >
            <div className="flex-shrink-0 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {t('quota_insight.summary')}
              </p>

              <div
                className={cn(
                  'flex w-full min-w-0 flex-nowrap items-stretch gap-3',
                  'overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                )}
              >
                {/* 与 CampaignDetail 通话概览卡一致：rounded-lg px-3 py-2.5、11px 标签、lg 数字 */}
                <div
                  className={cn(
                    'flex min-w-[9.5rem] flex-1 items-start gap-2 rounded-lg border border-slate-200',
                    'bg-white px-3 py-2.5 shadow-sm',
                  )}
                >
                  <div className="mt-0.5 rounded-md bg-slate-50 p-1.5 text-slate-600">
                    <Percent size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-slate-500">
                      {t('quota_insight.overall')}
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-slate-900 tracking-tight">
                      {overallPct}%
                    </p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-700',
                          overallPct >= 100
                            ? 'bg-emerald-500'
                            : overallPct >= 50
                              ? 'bg-blue-500'
                              : 'bg-amber-400',
                        )}
                        style={{ width: `${overallPct}%` }}
                      />
                    </div>
                  </div>
                </div>
                {[
                  {
                    icon: Target,
                    label: t('quota_insight.stat_target'),
                    value: totalTarget,
                    color: 'text-violet-600',
                    box: 'bg-violet-50',
                  },
                  {
                    icon: TrendingUp,
                    label: t('quota_insight.stat_done'),
                    value: totalCompleted,
                    color: 'text-blue-600',
                    box: 'bg-blue-50',
                  },
                  {
                    icon: CheckCircle2,
                    label: t('quota_insight.stat_met'),
                    value: `${doneCount} / ${cells.length}`,
                    color: 'text-emerald-600',
                    box: 'bg-emerald-50',
                  },
                ].map(({ icon: Icon, label, value, color, box }) => (
                  <div
                    key={label}
                    className={cn(
                      'flex min-w-[8.5rem] flex-1 items-start gap-2 rounded-lg border border-slate-200',
                      'bg-white px-3 py-2.5 shadow-sm',
                    )}
                  >
                    <div className={cn('mt-0.5 rounded-md p-1.5', box)}>
                      <Icon size={14} className={color} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-500">{label}</p>
                      <p className="text-lg font-semibold tabular-nums text-slate-900">
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <p className="flex-shrink-0 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {t('quota_insight.hit_records')}
              </p>
              <div
                className={cn(
                  'h-[min(50vh,28rem)] min-h-[16rem] min-w-0 flex-1',
                  'overflow-hidden rounded-lg border border-slate-200',
                  'bg-white shadow-sm',
                )}
              >
                <div className="h-full overflow-auto">
                  <table className="w-full border-collapse text-left text-sm text-slate-800">
                    <thead className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th
                          className="w-[22%] max-w-xs whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {t('quota_insight.hit_call_id')}
                        </th>
                        <th
                          className="w-40 min-w-[8rem] whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {t('quota_insight.hit_confidence')}
                        </th>
                        <th
                          className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {t('quota_insight.hit_evidence')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {showHitDataRows ? (
                        hitRows.map((row, idx) => (
                          <tr
                            key={`${row.call_id}-${row.at ?? idx}`}
                            className={cn(
                              'align-top transition-colors',
                              'odd:bg-white even:bg-blue-50',
                              'hover:bg-blue-100/60',
                            )}
                          >
                            <td className="px-3 py-2.5 font-mono text-xs text-slate-700 break-all">
                              {row.call_id}
                            </td>
                            <td className="px-3 py-2.5 text-sm tabular-nums text-slate-800">
                              {formatConfidence(row.confidence)}
                            </td>
                            <td className="px-3 py-2.5 text-sm leading-relaxed text-slate-700 break-words">
                              {row.evidence?.trim() ? row.evidence : '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr
                          className={cn(
                            'odd:bg-white even:bg-blue-50',
                            'hover:bg-blue-100/60',
                          )}
                        >
                          <td
                            colSpan={3}
                            className="px-3 py-20 text-center text-sm text-slate-400"
                          >
                            {hitTablePlaceholder}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: quota cell cards (原 By condition 区域) ─────────── */}
          <div className="w-72 flex-shrink-0 border-l border-slate-200 bg-slate-50 overflow-y-auto p-6 space-y-3 min-h-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              {t('quota_insight.quota_title', { n: cells.length })}
            </p>

            {cells.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-300 gap-3">
                <BarChart3 size={40} className="opacity-40" />
                <p className="text-sm text-slate-400 text-center">
                  {t('quota_insight.no_cells')}
                </p>
                <p className="text-xs text-slate-400 text-center">
                  {t('quota_insight.no_cells_hint')}
                </p>
              </div>
            )}

            {cells.map(cell => {
              const p = pct(cell.completed, cell.target)
              const c = cellColor(p)
              const isDone = p >= 100
              const isSelected = selectedCellId === cell.id
              const hitList = Array.isArray(cell.hit_evidence) ? cell.hit_evidence : []
              const hasHits = hitList.length > 0
              const surface = quotaCardSurface(hasHits, isDone)
              const cardBorder = surface.border || c.border
              return (
                <button
                  key={cell.id}
                  type="button"
                  onClick={() => {
                    setSelectedCellId(s => (s === cell.id ? null : cell.id))
                  }}
                  className={cn(
                    'w-full text-left border rounded-xl p-4 space-y-3 transition-shadow',
                    surface.bg,
                    'hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
                    cardBorder,
                    isSelected && 'ring-2 ring-violet-400 border-violet-300 shadow-sm',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {Object.keys(cell.filters).length > 0 ? (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          {Object.entries(cell.filters).map(([k, v], i, arr) => (
                            <span key={k} className="inline-flex items-baseline gap-1 text-sm">
                              <span className="text-slate-400 text-xs">{k}</span>
                              <span className="text-slate-300 text-xs">=</span>
                              <span className="text-slate-800 font-semibold break-all">{v}</span>
                              {i < arr.length - 1 && (
                                <span className="text-slate-200 ml-0.5 text-xs">·</span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-slate-700 break-words">
                          {cell.label}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        'flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border',
                        c.badge,
                      )}
                    >
                      {isDone && <CheckCircle2 size={10} />}
                      {p}%
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', c.bar)}
                        style={{ width: `${p}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 gap-2">
                      <span>
                        {t('quota_insight.completed')}{' '}
                        <strong className="text-slate-700">{cell.completed}</strong>
                        <span className="mx-1">/</span>
                        {t('quota_insight.target')}{' '}
                        <strong className="text-slate-700">{cell.target}</strong>
                      </span>
                      <span className="text-right">
                        {t('quota_insight.remaining', { n: Math.max(0, cell.target - cell.completed) })}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
