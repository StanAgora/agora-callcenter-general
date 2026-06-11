import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Play, Pause, Square, ChevronLeft, Phone, Clock, CheckCircle, XCircle, PhoneOff } from 'lucide-react'
import { MOCK_SURVEYS, MOCK_STATS, MOCK_QUOTA_CELLS, MOCK_CALL_LOGS, MOCK_ACTIVE_CALLS } from '../../mocks/data'
import { MockWebSocket } from '../../mocks/ws-mock'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { StatusBadge } from '../../components/ui/Badge'
import { CALL_RESULT_LABELS } from '../../types'
import { cn, formatDuration, formatTime, pct } from '../../lib/utils'
import type { ActiveCall, CallLog, QuotaCell, CampaignStats, WsMessage, SurveyStatus } from '../../types'

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', color ?? 'text-gray-900')}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const survey = MOCK_SURVEYS.find(s => s.id === id)

  const [status, setStatus] = useState<SurveyStatus>(survey?.status ?? 'paused')
  const [stats, setStats] = useState<CampaignStats>(MOCK_STATS)
  const [cells, setCells] = useState<QuotaCell[]>(MOCK_QUOTA_CELLS)
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>(status === 'running' ? MOCK_ACTIVE_CALLS : [])
  const [callLogs, setCallLogs] = useState<CallLog[]>(MOCK_CALL_LOGS)
  const [selectedCallId, setSelectedCallId] = useState<string | null>(MOCK_ACTIVE_CALLS[0]?.callId ?? null)

  const wsRef = useRef<MockWebSocket | null>(null)

  useEffect(() => {
    if (status !== 'running') return
    const ws = new MockWebSocket()
    wsRef.current = ws

    const listener = (msg: WsMessage) => {
      if (msg.type === 'quota_update') {
        setCells(prev => prev.map(c => c.id === msg.cell.id ? msg.cell : c))
        setStats(msg.overallStats)
      } else if (msg.type === 'call_started') {
        setActiveCalls(prev => [...prev, msg.call])
      } else if (msg.type === 'transcript_update') {
        setActiveCalls(prev => prev.map(c =>
          c.callId === msg.callId
            ? { ...c, transcript: [...c.transcript, msg.line] }
            : c
        ))
      } else if (msg.type === 'call_completed') {
        setActiveCalls(prev => {
          const call = prev.find(c => c.callId === msg.callId)
          if (call) {
            const log: CallLog = {
              id: `log-ws-${msg.callId}`,
              phone: call.phone,
              quotaCell: call.quotaCell,
              startedAt: call.startedAt,
              endedAt: new Date().toISOString(),
              duration: Math.floor((Date.now() - new Date(call.startedAt).getTime()) / 1000),
              resultCode: msg.resultCode,
              responses: msg.responses,
            }
            setCallLogs(logs => [log, ...logs])
          }
          return prev.filter(c => c.callId !== msg.callId)
        })
      } else if (msg.type === 'campaign_completed') {
        setStatus('completed')
      } else if (msg.type === 'campaign_status') {
        setStatus(msg.status)
      }
    }

    ws.subscribe(listener)
    ws.start()

    return () => { ws.stop(); ws.unsubscribe(listener) }
  }, [status])

  function handleStart() { setStatus('running'); setActiveCalls(MOCK_ACTIVE_CALLS) }
  function handlePause() { setStatus('paused'); wsRef.current?.stop(); wsRef.current = null }
  function handleStop()  { setStatus('completed'); wsRef.current?.stop(); wsRef.current = null; setActiveCalls([]) }

  const selectedCall = activeCalls.find(c => c.callId === selectedCallId) ?? activeCalls[0] ?? null
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [selectedCall?.transcript.length])

  function cellColor(c: QuotaCell) {
    const p = pct(c.completed, c.target)
    if (c.status === 'closed') return 'bg-emerald-50 border-emerald-200'
    if (p >= 75) return 'bg-indigo-50 border-indigo-100'
    if (p >= 25) return 'bg-gray-50 border-gray-100'
    return 'bg-white border-gray-200'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900">{survey?.name ?? t('nav.campaigns')}</h1>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'running' ? (
            <>
              <button onClick={handlePause} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors">
                <Pause size={13} /> {t('dashboard.btn_pause')}
              </button>
              <button onClick={handleStop} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors">
                <Square size={13} /> {t('dashboard.btn_stop')}
              </button>
            </>
          ) : status === 'paused' ? (
            <button onClick={handleStart} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
              <Play size={13} /> {t('dashboard.btn_resume')}
            </button>
          ) : status === 'draft' ? (
            <button onClick={handleStart} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
              <Play size={13} /> {t('dashboard.btn_start')}
            </button>
          ) : null}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100 flex-shrink-0">
        <StatCard label={t('dashboard.stat_total_called')} value={stats.totalCalled} />
        <StatCard label={t('dashboard.stat_success')} value={stats.totalSuccess} sub={t('dashboard.stat_success_rate', { pct: stats.successRate })} color="text-emerald-600" />
        <StatCard label={t('dashboard.stat_refused')} value={stats.totalRefused} color="text-red-600" />
        <StatCard label={t('dashboard.stat_avg_duration')} value={formatDuration(stats.avgDuration)} sub={t('dashboard.stat_est_remaining', { n: stats.estimatedRemaining })} />
      </div>

      {/* Body: 3 columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Quota matrix */}
        <div className="w-72 border-r border-gray-100 overflow-y-auto p-4 flex-shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{t('dashboard.quota_status')}</p>
          <div className="space-y-4">
            {Array.from(new Set(cells.map(c => c.areaName))).map(area => (
              <div key={area}>
                <p className="text-xs font-medium text-gray-600 mb-2">{area}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {cells.filter(c => c.areaName === area).map(cell => (
                    <div key={cell.id} className={cn('rounded-lg border p-2 text-xs', cellColor(cell))}>
                      <p className="text-gray-400 truncate">{cell.genderName} · {cell.ageName.replace('세', '')}</p>
                      <p className="font-medium text-gray-900 mt-0.5">{cell.completed}/{cell.target}</p>
                      <div className="mt-1">
                        <ProgressBar completed={cell.completed} target={cell.target} showLabel={false} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Active calls + transcript */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 border-b border-gray-100 px-4 pt-3 bg-white">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('dashboard.active_calls_count', { n: activeCalls.length })}</p>
            <div className="flex gap-2 pb-3 overflow-x-auto">
              {activeCalls.length === 0 && (
                <p className="text-xs text-gray-400 py-1">{t('dashboard.no_active_calls')}</p>
              )}
              {activeCalls.map(call => (
                <button
                  key={call.callId}
                  onClick={() => setSelectedCallId(call.callId)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors',
                    selectedCallId === call.callId
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Phone size={11} className="text-emerald-500" />
                  <span>{call.phone}</span>
                  <span className="text-gray-400">·</span>
                  <span>{call.quotaCell.areaName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Transcript */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedCall ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                  <Clock size={11} />
                  <span>{t('dashboard.call_start')} {formatTime(selectedCall.startedAt)}</span>
                  <span>·</span>
                  <span>{selectedCall.quotaCell.areaName} / {selectedCall.quotaCell.genderName} / {selectedCall.quotaCell.ageName}</span>
                </div>
                {selectedCall.transcript.map((line, i) => (
                  <div key={i} className={cn('flex', line.speaker === 'agent' ? 'justify-start' : 'justify-end')}>
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                      line.speaker === 'agent'
                        ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                        : 'bg-indigo-600 text-white rounded-tr-sm'
                    )}>
                      <p className={cn('text-[10px] mb-1 font-medium', line.speaker === 'agent' ? 'text-gray-400' : 'text-indigo-200')}>
                        {line.speaker === 'agent' ? t('dashboard.speaker_agent') : t('dashboard.speaker_respondent')}
                      </p>
                      {line.text}
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                <div className="text-center">
                  <PhoneOff size={32} className="mx-auto mb-3 opacity-40" />
                  <p>{t('dashboard.select_call')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Call log */}
        <div className="w-80 border-l border-gray-100 overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('dashboard.call_log')}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {callLogs.map(log => {
              const success = log.resultCode === 0
              return (
                <div key={log.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-gray-600">{log.phone}</span>
                    <div className="flex items-center gap-1">
                      {success
                        ? <CheckCircle size={11} className="text-emerald-500" />
                        : <XCircle size={11} className="text-gray-400" />
                      }
                      <span className={cn('text-xs font-medium', success ? 'text-emerald-600' : 'text-gray-400')}>
                        {CALL_RESULT_LABELS[log.resultCode]}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {log.quotaCell.areaName} / {log.quotaCell.genderName} / {log.quotaCell.ageName}
                    {' · '}{formatDuration(log.duration)}
                    {' · '}{formatTime(log.startedAt)}
                  </p>
                  {log.responses && success && (
                    <p className="text-[10px] text-indigo-600 mt-0.5">
                      Q1={log.responses.Q1} Q2={log.responses.Q2} Q3={log.responses.Q3}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
