import { useMemo } from 'react'
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

export function DaySchedule({ day, sessions, userData, onSelectSession, getAttendees, getAllAttendees }: Props) {
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

              {/* Gap indicator */}
              {!warning && i > 0 && gap > 15 && (
                <div className="flex items-center gap-2 px-2 py-1 mb-1 text-[10px] text-gdc-border">
                  <div className="flex-1 border-t border-dashed border-current opacity-30" />
                  <span>{gap}min free</span>
                  <div className="flex-1 border-t border-dashed border-current opacity-30" />
                </div>
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
