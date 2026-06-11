import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import type { SurveyStatus } from '../../types'

const STATUS_STYLES: Record<SurveyStatus, string> = {
  draft:     'bg-gray-100 text-gray-500 border border-gray-200',
  running:   'bg-emerald-50 text-emerald-600 border border-emerald-100',
  paused:    'bg-amber-50 text-amber-600 border border-amber-100',
  completed: 'bg-blue-50 text-blue-600 border border-blue-100',
}

export function StatusBadge({ status }: { status: SurveyStatus }) {
  const { t } = useTranslation()
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
      STATUS_STYLES[status]
    )}>
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
        : 'bg-blue-50 text-blue-600 border border-blue-100'
    )}>
      {type}
    </span>
  )
}
