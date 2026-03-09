import { useState, useEffect, useCallback } from 'react'
import { Session, UserSessionData, TRACK_COLORS, InterestLevel, DAY_LABELS } from '../types'
import { formatTimeRange, getDurationMinutes } from '../utils/conflicts'
import { InterestRating } from './InterestRating'
import { generateGoogleCalendarURL } from '../utils/calendar'
import { getZoneLabel } from '../utils/location'
import { VenueMap } from './VenueMap'
import { AttendeeInfo } from '../hooks/useAttendance'

interface Props {
  session: Session
  userData: UserSessionData
  onUpdateUserData: (id: string, data: Partial<UserSessionData>) => void
  onClose: () => void
  getAttendees?: (sessionId: string) => AttendeeInfo[]
}

const DEFAULT_USER_DATA: UserSessionData = { interest: 0, scheduled: false, picked: false, notes: '' }

export function SessionDetailModal({ session, userData, onUpdateUserData, onClose, getAttendees }: Props) {
  const data = userData ?? DEFAULT_USER_DATA
  const trackColor = TRACK_COLORS[session.track]
  const duration = getDurationMinutes(session.startTime, session.endTime)
  const zone = getZoneLabel(session.room)
  const attendees = getAttendees?.(session.id) ?? []
  const [showMap, setShowMap] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-gdc-surface border border-gdc-border rounded-t-xl sm:rounded-xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gdc-bg/80 text-gdc-textMuted hover:text-gdc-text z-10"
        >
          &#x2715;
        </button>

        <div className="p-4 space-y-3">
          {/* Track + time */}
          <div className="flex items-center gap-2 flex-wrap pr-8">
            <span className={`track-badge ${trackColor}`}>{session.track}</span>
            <span className="text-xs font-mono text-gdc-textMuted">
              {DAY_LABELS[session.day]?.split(' ')[0]} {formatTimeRange(session.startTime, session.endTime)}
            </span>
            <span className="text-xs text-gdc-textMuted/60">{duration}m</span>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold leading-snug">{session.title}</h2>

          {/* Speakers */}
          {session.speakers.length > 0 && (
            <p className="text-sm text-gdc-textMuted">{session.speakers.join(', ')}</p>
          )}

          {/* Format + Room + Map */}
          <div className="flex items-center gap-2 text-xs text-gdc-textMuted">
            <span>{session.format}</span>
            <span className="text-gdc-textMuted/40">|</span>
            <span>{session.room}</span>
            <span className="text-[10px] opacity-60">({zone})</span>
            <button
              onClick={() => setShowMap(true)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gdc-accent/10 text-gdc-accent text-[10px] font-medium hover:bg-gdc-accent/20 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Map
            </button>
          </div>

          {/* Interest rating */}
          <div className="flex items-center gap-3 py-2 border-y border-gdc-border">
            <span className="text-xs text-gdc-textMuted">Interest:</span>
            <InterestRating
              level={data.interest}
              onChange={v => onUpdateUserData(session.id, { interest: v as InterestLevel })}
            />
          </div>

          {/* Attendees */}
          {attendees.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gdc-textMuted">Attending:</span>
              {attendees.map(a => (
                <div key={a.userId} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gdc-bg text-xs">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                  <span>{a.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-gdc-textMuted leading-relaxed whitespace-pre-line">
            {session.description.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
              /^https?:\/\//.test(part)
                ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-gdc-accent hover:underline break-all">{part}</a>
                : part
            )}
          </p>

          {/* Tags */}
          {session.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {session.tags.map(tag => (
                <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded ${
                  tag === 'side-event' ? 'bg-amber-500/20 text-amber-400 font-medium' :
                  tag === 'free' ? 'bg-green-500/15 text-green-400' :
                  'bg-gdc-bg text-gdc-textMuted'
                }`}>
                  {tag === 'side-event' ? 'Community Event' : tag}
                </span>
              ))}
            </div>
          )}

          {/* Calendar link */}
          <a
            href={generateGoogleCalendarURL(session)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost inline-flex items-center gap-1 text-xs"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Add to Google Calendar
          </a>

          {/* Notes */}
          <textarea
            value={data.notes}
            onChange={e => onUpdateUserData(session.id, { notes: e.target.value })}
            placeholder="Add notes..."
            className="input text-xs h-20 resize-none w-full"
            rows={3}
          />
        </div>
      </div>

      {showMap && (
        <VenueMap room={session.room} onClose={() => setShowMap(false)} />
      )}
    </div>
  )
}
