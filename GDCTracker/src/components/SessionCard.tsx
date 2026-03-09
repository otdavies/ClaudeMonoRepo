import { memo, useCallback } from 'react'
import { Session, UserSessionData, TRACK_COLORS, InterestLevel } from '../types'
import { formatTimeRange, getDurationMinutes } from '../utils/conflicts'
import { InterestRating } from './InterestRating'
import { generateGoogleCalendarURL } from '../utils/calendar'

interface Props {
  session: Session
  userData: UserSessionData
  onUpdateUserData: (id: string, data: Partial<UserSessionData>) => void
  conflicts: string[]
  expanded: boolean
  onToggleExpand: (id: string) => void
}

const DEFAULT_USER_DATA: UserSessionData = { interest: 0, scheduled: false, picked: false, notes: '' }

export const SessionCard = memo(function SessionCard({ session, userData, onUpdateUserData, conflicts, expanded, onToggleExpand }: Props) {
  const duration = getDurationMinutes(session.startTime, session.endTime)
  const hasConflicts = conflicts.length > 0
  const trackColor = TRACK_COLORS[session.track]
  const isScheduled = userData.interest > 0

  const handleClick = useCallback(() => onToggleExpand(session.id), [onToggleExpand, session.id])

  const handleInterestChange = useCallback(
    (v: InterestLevel) => onUpdateUserData(session.id, { interest: v }),
    [onUpdateUserData, session.id]
  )

  return (
    <div
      className={`card p-3 transition-shadow duration-150 cursor-pointer ${
        isScheduled ? 'ring-1 ring-gdc-accent/50 bg-gdc-accent/5' : ''
      } ${hasConflicts && isScheduled ? 'ring-1 ring-gdc-danger/50' : ''}`}
      onClick={handleClick}
    >
      {/* Top row: time + track + interest */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <span className="session-time text-gdc-textMuted whitespace-nowrap">
            {formatTimeRange(session.startTime, session.endTime)}
          </span>
          <span className="text-gdc-border text-xs">{duration}m</span>
          <span className={`track-badge ${trackColor} hidden sm:inline-flex`}>
            {session.track}
          </span>
        </div>
        <div className="shrink-0">
          <InterestRating
            level={userData.interest}
            onChange={handleInterestChange}
            compact
          />
        </div>
      </div>

      {/* Track badge on mobile (own row) */}
      <div className="sm:hidden mb-1">
        <span className={`track-badge ${trackColor}`}>
          {session.track}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold leading-snug mb-1">{session.title}</h3>

      {/* Speakers + format */}
      <div className="flex items-center gap-2 text-xs text-gdc-textMuted mb-1">
        <span>{session.speakers.join(', ')}</span>
        <span className="text-gdc-border">|</span>
        <span>{session.format}</span>
        <span className="text-gdc-border">|</span>
        <span>{session.room}</span>
      </div>

      {/* Conflict warning */}
      {hasConflicts && isScheduled && (
        <div className="flex items-center gap-1 text-xs text-gdc-danger conflict-pulse mb-1">
          <span>!!</span>
          <span>Conflicts with {conflicts.length} session{conflicts.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {session.tags.slice(0, expanded ? undefined : 3).map(tag => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-gdc-bg text-gdc-textMuted">
            {tag}
          </span>
        ))}
        {!expanded && session.tags.length > 3 && (
          <span className="text-[10px] text-gdc-textMuted">+{session.tags.length - 3}</span>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-gdc-border space-y-2">
          <p className="text-xs text-gdc-textMuted leading-relaxed">{session.description}</p>

          <a
            href={generateGoogleCalendarURL(session)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="btn-ghost inline-flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Google Cal
          </a>

          {/* Notes */}
          <div>
            <textarea
              value={userData.notes}
              onChange={e => {
                e.stopPropagation()
                onUpdateUserData(session.id, { notes: e.target.value })
              }}
              onClick={e => e.stopPropagation()}
              placeholder="Add notes..."
              className="input text-xs h-16 resize-none"
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  )
})

export { DEFAULT_USER_DATA }
