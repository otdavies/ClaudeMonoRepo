import { memo } from 'react'
import { InterestLevel } from '../types'

const LEVELS: { level: InterestLevel; label: string; color: string; activeColor: string; bg: string }[] = [
  { level: 1, label: 'Maybe', color: 'text-slate-400', activeColor: 'text-slate-300', bg: 'bg-slate-400/10' },
  { level: 2, label: 'Want', color: 'text-amber-400', activeColor: 'text-amber-300', bg: 'bg-amber-400/10' },
  { level: 3, label: 'Must', color: 'text-rose-400', activeColor: 'text-rose-300', bg: 'bg-rose-400/10' },
]

interface Props {
  level: InterestLevel
  onChange: (level: InterestLevel) => void
  compact?: boolean
}

export const InterestRating = memo(function InterestRating({ level, onChange, compact }: Props) {
  return (
    <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
      {LEVELS.map(({ level: n, label, color, bg }) => {
        const filled = n <= level
        return (
          <button
            key={n}
            onClick={e => {
              e.stopPropagation()
              onChange(level === n ? 0 : n)
            }}
            className={`star-btn rounded-md transition-all duration-150 ${compact ? 'p-1' : 'p-1.5'} ${
              filled
                ? `${color} ${bg}`
                : 'text-gdc-textMuted/50 hover:text-gdc-textMuted/80'
            }`}
            title={label}
            aria-label={`Set interest to ${label}`}
          >
            <svg
              className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}
              viewBox="0 0 24 24"
              fill={filled ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={filled ? '0' : '2'}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        )
      })}
      {!compact && level > 0 && (
        <span className={`text-[10px] ml-0.5 font-medium ${LEVELS[level - 1].color}`}>
          {LEVELS[level - 1].label}
        </span>
      )}
    </div>
  )
})
