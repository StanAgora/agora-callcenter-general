import { cn } from '../../lib/utils'
import { pct } from '../../lib/utils'

interface Props {
  completed: number
  target: number
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function ProgressBar({ completed, target, showLabel = true, size = 'md', className }: Props) {
  const percent = pct(completed, target)
  const full = percent >= 100

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-ink-secondary font-medium">{completed} / {target}</span>
          <span className={cn('font-medium', full ? 'text-ggreen-500' : 'text-gblue-500')}>
            {percent}%
          </span>
        </div>
      )}
      <div className={cn(
        'w-full bg-border-light rounded-full overflow-hidden',
        size === 'sm' ? 'h-1' : 'h-2'
      )}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            full ? 'bg-ggreen-400' : 'bg-gblue-500'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
