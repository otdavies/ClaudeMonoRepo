import { memo } from 'react'
import { InterestLevel } from '../types'

const LABELS = ['', 'Maybe', 'Want', 'Must']

interface Props {
  level: InterestLevel
  onChange: (level: InterestLevel) => void
  compact?: boolean
}

export const InterestRating = memo(function InterestRating({ level, onChange, compact }: Props) {
  return (
    <div className="flex items-center gap-0.5">
      {([1, 2, 3] as const).map(n => (
        <button
          key={n}
          onClick={e => {
            e.stopPropagation()
            onChange(level === n ? 0 : n)
          }}
          className={`star-btn ${compact ? 'text-base p-1' : 'text-lg p-1'} ${
            n <= level
              ? n === 3 ? 'text-red-400' : n === 2 ? 'text-gdc-gold' : 'text-gdc-textMuted'
              : 'text-gdc-border hover:text-gdc-textMuted'
          }`}
          title={LABELS[n]}
          aria-label={`Set interest to ${LABELS[n]}`}
        >
          {n <= level ? '\u2605' : '\u2606'}
        </button>
      ))}
      {!compact && level > 0 && (
        <span className={`text-xs ml-1 font-medium ${
          level === 3 ? 'text-red-400' : level === 2 ? 'text-gdc-gold' : 'text-gdc-textMuted'
        }`}>
          {LABELS[level]}
        </span>
      )}
    </div>
  )
})
