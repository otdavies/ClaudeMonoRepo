import { useMemo, useState } from 'react'
import { Session, UserSessionData, Day, DAY_LABELS, TRACK_COLORS } from '../types'
import { formatTimeRange, timeToMinutes, getDurationMinutes } from '../utils/conflicts'
import { AttendeesBadge, AttendeeStrip } from './AttendeesBadge'
import { AttendeeInfo } from '../hooks/useAttendance'
import { getWalkWarnings, getZoneLabel } from '../utils/location'

interface Props {
  day: Day
  sessions: Session[]
  userData: Record<string, UserSessionData>
  onUpdateUserData: (id: string, data: Partial<UserSessionData>) => void
  conflictMap: Map<string, string[]>
  onSelectSession?: (id: string) => void
  getAttendees?: (sessionId: string) => AttendeeInfo[]
  getAllAttendees?: (sessionId: string) => AttendeeInfo[]
}

/**
 * Find starred-but-unpicked sessions that fit within a gap between two picked sessions.
 */
function getGapSessions(
  allSessions: Session[],
  userData: Record<string, UserSessionData>,
  day: Day,
  gapStart: string,
  gapEnd: string,
): Session[] {
  const gapStartMin = timeToMinutes(gapStart)
  const gapEndMin = timeToMinutes(gapEnd)
  return allSessions.filter(s => {
    if (s.day !== day) return false
    const interest = userData[s.id]?.interest ?? 0
    const picked = userData[s.id]?.picked ?? false
    if (interest === 0 || picked) return false
    const sStart = timeToMinutes(s.startTime)
    const sEnd = timeToMinutes(s.endTime)
    // Session fits within or overlaps the gap
    return sStart >= gapStartMin && sEnd <= gapEndMin
  })
}

function GapIndicator({
  gap,
  gapSessions,
  onPick,
  onSelectSession,
}: {
  gap: number
  gapSessions: Session[]
  onPick: (id: string) => void
  onSelectSession?: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasOptions = gapSessions.length > 0

  return (
    <div className="my-1">
      <div
        className={`flex items-center gap-2 px-2 py-1 text-[10px] text-gdc-border ${hasOptions ? 'cursor-pointer hover:text-gdc-textMuted' : ''}`}
        onClick={() => hasOptions && setExpanded(!expanded)}
      >
        <div className="flex-1 border-t border-dashed border-current opacity-30" />
        <span className="flex items-center gap-1">
          {gap}min free
          {hasOptions && (
            <span className="text-gdc-textMuted">
              ({gapSessions.length} option{gapSessions.length !== 1 ? 's' : ''})
              <svg
                className={`w-2.5 h-2.5 inline ml-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          )}
        </span>
        <div className="flex-1 border-t border-dashed border-current opacity-30" />
      </div>

      {expanded && (
        <div className="mx-2 mb-1 rounded-lg border border-gdc-border/20 bg-gdc-surface/30 overflow-hidden divide-y divide-gdc-border/10">
          {gapSessions.map(s => {
            const trackColor = TRACK_COLORS[s.track]
            return (
              <div
                key={s.id}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gdc-surfaceHover/30 transition-colors"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onPick(s.id) }}
                  className="shrink-0 w-4 h-4 rounded-full border border-dashed border-gdc-textMuted/40 hover:border-gdc-accent hover:bg-gdc-accent/10 transition-colors flex items-center justify-center"
                  title="Add to schedule"
                >
                  <svg className="w-2 h-2 text-gdc-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => onSelectSession?.(s.id)}
                >
                  <p className="text-[11px] truncate">{s.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`track-badge ${trackColor} text-[9px]`}>{s.track}</span>
                    <span className="text-[9px] text-gdc-textMuted font-mono">
                      {formatTimeRange(s.startTime, s.endTime)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function DaySchedule({ day, sessions, userData, onUpdateUserData, onSelectSession, getAttendees, getAllAttendees }: Props) {
  // Only show picked sessions in the schedule
  const pickedSessions = useMemo(
    () => sessions
      .filter(s => s.day === day && userData[s.id]?.picked)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [sessions, day, userData]
  )

  const walkWarnings = useMemo(
    () => getWalkWarnings(pickedSessions, userData),
    [pickedSessions, userData]
  )

  const warningsByTo = useMemo(() => {
    const map = new Map<string, typeof walkWarnings[0]>()
    for (const w of walkWarnings) map.set(w.toSession.id, w)
    return map
  }, [walkWarnings])

  const handlePick = (id: string) => {
    onUpdateUserData(id, { picked: true })
  }

  if (pickedSessions.length === 0) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-gdc-accent mb-3">{DAY_LABELS[day]}</h2>
        <p className="text-sm text-gdc-textMuted py-4">No sessions picked for this day</p>
        <p className="text-xs text-gdc-textMuted">Pick sessions to attend in the Decide tab</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gdc-accent mb-3">
        {DAY_LABELS[day]}
        <span className="ml-2 text-xs text-gdc-textMuted font-normal">
          {pickedSessions.length} session{pickedSessions.length !== 1 ? 's' : ''}
        </span>
      </h2>

      <div className="space-y-2">
        {pickedSessions.map((session, i) => {
          const trackColor = TRACK_COLORS[session.track]
          const zone = getZoneLabel(session.room)
          const duration = getDurationMinutes(session.startTime, session.endTime)
          const friends = getAttendees?.(session.id) ?? []
          const allPeople = getAllAttendees?.(session.id) ?? []

          const warning = warningsByTo.get(session.id)

          // Gap from previous session
          const prev = i > 0 ? pickedSessions[i - 1] : null
          const gap = prev ? timeToMinutes(session.startTime) - timeToMinutes(prev.endTime) : 0

          // Sessions available during the gap
          const gapSessions = prev && gap > 15
            ? getGapSessions(sessions, userData, day, prev.endTime, session.startTime)
            : []

          return (
            <div key={session.id}>
              {/* Walk warning between sessions */}
              {warning && i > 0 && (
                <div className={`flex items-center gap-2 px-2 py-1 mb-1 text-[10px] ${
                  warning.tight ? 'text-red-400' : 'text-amber-400'
                }`}>
                  <div className="flex-1 border-t border-dashed border-current opacity-40" />
                  <span>
                    {getZoneLabel(warning.fromSession.room)} {'\u2192'} {getZoneLabel(warning.toSession.room)} ~{warning.walkMinutes}min walk
                  </span>
                  <div className="flex-1 border-t border-dashed border-current opacity-40" />
                </div>
              )}

              {/* Gap indicator with expandable options */}
              {!warning && i > 0 && gap > 15 && (
                <GapIndicator
                  gap={gap}
                  gapSessions={gapSessions}
                  onPick={handlePick}
                  onSelectSession={onSelectSession}
                />
              )}

              {/* Session card */}
              <div
                className="relative card p-0 overflow-hidden cursor-pointer hover:bg-gdc-surfaceHover/50 active:bg-gdc-surfaceHover transition-colors"
                onClick={() => onSelectSession?.(session.id)}
              >
                <AttendeeStrip attendees={allPeople} />
                <div className="px-3 py-2.5 pl-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-medium text-gdc-accent">
                          {formatTimeRange(session.startTime, session.endTime)}
                        </span>
                        <span className="text-[10px] text-gdc-textMuted">
                          {duration}min
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold leading-snug">{session.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`track-badge ${trackColor} text-[10px]`}>
                          {session.track}
                        </span>
                        <span className="text-[10px] text-gdc-textMuted">
                          {session.room}
                          <span className="opacity-60 ml-0.5">({zone})</span>
                        </span>
                      </div>
                      {session.speakers.length > 0 && (
                        <p className="text-[11px] text-gdc-textMuted mt-0.5 truncate">
                          {session.speakers.join(', ')}
                        </p>
                      )}
                    </div>
                    {/* Attendees */}
                    {friends.length > 0 && (
                      <div className="shrink-0" onClick={e => e.stopPropagation()}>
                        <AttendeesBadge attendees={friends} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
