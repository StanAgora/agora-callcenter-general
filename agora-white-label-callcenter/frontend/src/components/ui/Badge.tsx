import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import type { SurveyStatus } from '../../types'

const STATUS_STYLES: Record<SurveyStatus, string> = {
  draft:     'bg-surface text-ink-tertiary border border-border',
  running:   'bg-ggreen-50 text-ggreen-500 border border-ggreen-100',
  paused:    'bg-gyellow-50 text-gyellow-600 border border-gyellow-100',
  completed: 'bg-gblue-50 text-gblue-500 border border-gblue-100',
}

export function StatusBadge({ status }: { status: SurveyStatus }) {
  const { t } = useTranslation()
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
      STATUS_STYLES[status]
    )}>
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-ggreen-400 animate-pulse" />
      )}
      {t(`status.${status}`)}
    </span>
  )
}

export function TypeBadge({ type }: { type: 'CATI' | 'URL' }) {
  return (
    <span className={cn(
      'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
      type === 'CATI'
        ? 'bg-gblue-50 text-gblue-500 border border-gblue-100'
        : 'bg-gteal-50 text-gteal-500 border border-gteal-50'
    )}>
      {type}
    </span>
  )
}
