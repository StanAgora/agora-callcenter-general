import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Radio, StopCircle, LayoutDashboard, PieChart, Bot } from 'lucide-react'
import { cn } from '../../lib/utils'
import { campaignAgentSourceLabel, campaignQuotaModeLabel } from '../../lib/campaignDisplayLabels'
import { bcp47ForI18n } from '../../i18n'

const API = 'http://localhost:8000'

interface CampaignV2Item {
  id: number
  campaign_id: string
  campaign_name: string
  questionnaire_type: string | null
  quota_mode: string | null
  total_numbers: number | null
  calls_count: number | null
  phone_number_id: string | null
  phone_number: string | null
  agent_id: string | null
  agent_name: string | null
  start_immediately: boolean | null
  enable_transcript: boolean | null
  enable_recording: boolean | null
  status: string | null
  created_at: string | null
  updated_at: string | null
}

// Google-palette status chips
const STATUS_STYLE: Record<string, { chip: string; dot?: string }> = {
  completed:   { chip: 'bg-gblue-50  text-gblue-500  border border-gblue-100' },
  interrupted: { chip: 'bg-gred-50   text-gred-500   border border-gred-100' },
  interrupt:   { chip: 'bg-gred-50   text-gred-500   border border-gred-100' },
  running:     { chip: 'bg-ggreen-50 text-ggreen-500 border border-ggreen-100', dot: 'bg-ggreen-400' },
  scheduled:   { chip: 'bg-gblue-50  text-gblue-500  border border-gblue-100' },
  paused:      { chip: 'bg-gyellow-50 text-gyellow-600 border border-gyellow-100' },
  pending:     { chip: 'bg-surface   text-ink-tertiary border border-border' },
  failed:      { chip: 'bg-gred-50   text-gred-500   border border-gred-100' },
}

export function CampaignsPage() {
  const { t, i18n } = useTranslation()
  const statusLabel = useMemo(() => ({
    completed:   t('agora.status_completed'),
    interrupted: t('agora.status_interrupted'),
    interrupt:   t('agora.status_interrupted'),
    running:     t('agora.status_running'),
    scheduled:   t('agora.status_scheduled'),
    paused:      t('agora.status_paused'),
    pending:     t('agora.status_pending'),
    failed:      t('agora.status_failed'),
  }), [t, i18n.language])
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<CampaignV2Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [interruptingId, setInterruptingId] = useState<string | null>(null)

  async function loadCampaigns() {
    try {
      const dbData = await fetch(`${API}/api/campaigns-v2`).then(r => r.json())
      setCampaigns(dbData)
      setLoading(false)
      const synced = await fetch(`${API}/api/campaigns-v2/sync`, { method: 'POST' }).then(r => r.json())
      setCampaigns(synced)
    } catch {
      setError(t('common.server_error'))
      setLoading(false)
    }
  }

  useEffect(() => { loadCampaigns() }, [])

  useEffect(() => {
    const shouldPoll = campaigns.some(c => {
      const s = (c.status ?? '').toLowerCase()
      return s === 'running' || s === 'scheduled'
    })
    if (!shouldPoll) return
    const timer = setInterval(async () => {
      try {
        const dbData = await fetch(`${API}/api/campaigns-v2`).then(r => r.json())
        setCampaigns(dbData)
        const synced = await fetch(`${API}/api/campaigns-v2/sync`, { method: 'POST' }).then(r => r.json())
        setCampaigns(synced)
      } catch { /* ignore */ }
    }, 5000)
    return () => clearInterval(timer)
  }, [campaigns])

  async function handleInterrupt(campaignId: string) {
    setInterruptingId(campaignId)
    try {
      const resp = await fetch(`${API}/api/campaigns-v2/${campaignId}/interrupt`, { method: 'POST' })
      if (!resp.ok) throw new Error()
      setCampaigns(prev =>
        prev.map(c => c.campaign_id === campaignId ? { ...c, status: 'interrupted' } : c)
      )
    } catch {
      alert(t('agora.interrupt_fail'))
    } finally {
      setInterruptingId(null)
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString(bcp47ForI18n(i18n.language), {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page header — Google style top bar */}
      <div className="bg-white border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-medium text-ink">{t('agora.list_title')}</h1>
          <p className="text-sm text-ink-tertiary mt-0.5">{t('agora.list_subtitle')}</p>
        </div>
        <Link
          to="/surveys/new"
          className="inline-flex items-center gap-2 bg-gblue-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gblue-600 transition-colors shadow-fab"
        >
          <Plus size={16} strokeWidth={2.5} />
          {t('nav.new_campaign')}
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading && (
          <div className="flex items-center justify-center py-24 text-ink-tertiary">
            <Loader2 size={20} className="animate-spin mr-2 text-gblue-500" />
            <span className="text-sm">{t('agora.loading')}</span>
          </div>
        )}

        {error && (
          <div className="bg-gred-50 border border-gred-100 rounded-xl p-4 text-sm text-gred-500">{error}</div>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <div className="bg-white rounded-2xl p-16 text-center shadow-card">
            <div className="w-16 h-16 rounded-full bg-gblue-50 flex items-center justify-center mx-auto mb-4">
              <Radio size={28} className="text-gblue-400" />
            </div>
            <p className="text-base font-medium text-ink">{t('agora.empty')}</p>
            <p className="text-sm text-ink-tertiary mt-1">{t('agora.empty_hint')}</p>
          </div>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {campaigns.map(c => {
              const status = c.status ?? 'pending'
              const isTerminal = status === 'completed' || status === 'interrupted' || status === 'interrupt' || status === 'failed'
              const total = Math.max(0, Number(c.total_numbers ?? 0))
              const done = Math.max(0, Number(c.calls_count ?? 0))
              const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
              const st = STATUS_STYLE[status] ?? STATUS_STYLE.pending

              return (
                <div
                  key={c.campaign_id}
                  className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-shadow flex flex-col overflow-hidden"
                >
                  {/* Colored top accent strip */}
                  <div className="h-1" style={{
                    backgroundColor:
                      status === 'running'     ? '#34A853' :
                      status === 'completed'   ? '#1a73e8' :
                      status === 'paused'      ? '#FBBC04' :
                      (status === 'interrupted' || status === 'interrupt' || status === 'failed')
                                               ? '#EA4335' : '#E8EAED',
                  }} />

                  {/* Card header */}
                  <div className="px-5 pt-4 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      {/* Status chip */}
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                        st.chip
                      )}>
                        {st.dot && <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', st.dot)} />}
                        {statusLabel[status] ?? status}
                      </span>
                      {/* Interrupt button */}
                      <button
                        onClick={() => handleInterrupt(c.campaign_id)}
                        disabled={isTerminal || interruptingId === c.campaign_id}
                        title="Interrupt"
                        className={cn(
                          'flex items-center justify-center w-7 h-7 rounded-full transition-colors',
                          isTerminal
                            ? 'text-ink-disabled cursor-not-allowed'
                            : 'text-gred-500 hover:bg-gred-50'
                        )}
                      >
                        {interruptingId === c.campaign_id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <StopCircle size={14} />}
                      </button>
                    </div>

                    <h2 className="font-medium text-ink text-sm leading-snug line-clamp-2 mb-0.5">
                      {c.campaign_name}
                    </h2>
                    <p className="text-xs font-mono text-ink-disabled truncate">{c.campaign_id}</p>
                  </div>

                  {/* Chips row */}
                  <div className="px-5 pb-3 flex items-center gap-1.5 flex-wrap">
                    {c.questionnaire_type && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gpurple-50 text-gpurple-500 border border-gpurple-100">
                        {campaignAgentSourceLabel(t, c.questionnaire_type)}
                      </span>
                    )}
                    {c.quota_mode && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gteal-50 text-gteal-500 border border-gteal-50">
                        {campaignQuotaModeLabel(t, c.quota_mode)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="px-5 pb-3 space-y-1 text-sm text-ink-secondary">
                    {c.phone_number && (
                      <p className="flex items-center gap-2 text-xs">
                        <span className="text-ink-tertiary">Caller</span>
                        <span className="font-mono font-medium text-ink">{c.phone_number}</span>
                      </p>
                    )}
                    {c.agent_name && (
                      <p className="flex items-center gap-2 text-xs">
                        <span className="text-ink-tertiary">Agent</span>
                        <span className="font-medium text-ink">{c.agent_name}</span>
                      </p>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="px-5 pb-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-ink-tertiary">{t('agora.dial_progress')}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-ink-secondary">{done} / {total}</span>
                        <span className={cn(
                          'font-semibold',
                          pct >= 100 ? 'text-ggreen-500' : 'text-gblue-500'
                        )}>{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: '#E8EAED' }}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`,
                          backgroundColor: pct >= 100 ? '#34A853' : '#1a73e8',
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-ink-disabled mt-2">{formatDate(c.created_at)}</p>
                  </div>

                  {/* Actions footer */}
                  <div className="border-t border-border-light grid grid-cols-3">
                    <button
                      onClick={() => navigate(`/campaigns/${c.campaign_id}`)}
                      className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-ink-secondary hover:bg-gblue-50 hover:text-gblue-500 transition-colors border-r border-border-light"
                    >
                      <LayoutDashboard size={13} /> Dashboard
                    </button>
                    <button
                      onClick={() => navigate(`/campaigns/${c.campaign_id}/quota-insight`)}
                      className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-ink-secondary hover:bg-ggreen-50 hover:text-ggreen-500 transition-colors border-r border-border-light"
                    >
                      <PieChart size={13} /> Quota
                    </button>
                    <button
                      onClick={() => navigate(`/campaigns/${c.campaign_id}/agent-prompt`)}
                      className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-ink-secondary hover:bg-gpurple-50 hover:text-gpurple-500 transition-colors"
                    >
                      <Bot size={13} /> Prompt
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
