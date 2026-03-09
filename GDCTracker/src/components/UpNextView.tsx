import { useMemo } from 'react'
import { Session, UserSessionData, Day, DAY_LABELS, TRACK_COLORS, InterestLevel } from '../types'
import { formatTime, formatTimeRange, timeToMinutes } from '../utils/conflicts'
import { InterestRating } from './InterestRating'

interface Props {
  sessions: Session[]
  userData: Record<string, UserSessionData>
  onUpdateUserData: (id: string, data: Partial<UserSessionData>) => void
}

interface TimeSlot {
  startTime: string
  endTime: string
  day: Day
  sessions: Session[]
}

export function UpNextView({ sessions, userData, onUpdateUserData }: Props) {
  // Get starred sessions grouped into overlapping time slots
  const starredSessions = useMemo(
    () => sessions.filter(s => (userData[s.id]?.interest ?? 0) > 0),
    [sessions, userData]
  )

  const timeSlots = useMemo(() => {
    const dayOrder: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, TBD: 5 }

    // Sort all starred sessions by day then time
    const sorted = [...starredSessions].sort((a, b) => {
      const dayDiff = (dayOrder[a.day] ?? 5) - (dayOrder[b.day] ?? 5)
      if (dayDiff !== 0) return dayDiff
      return a.startTime.localeCompare(b.startTime)
    })

    // Group into overlapping time slots
    const slots: TimeSlot[] = []
    for (const session of sorted) {
      const lastSlot = slots[slots.length - 1]
      if (
        lastSlot &&
        lastSlot.day === session.day &&
        timeToMinutes(session.startTime) < timeToMinutes(lastSlot.endTime)
      ) {
        // Overlaps with current slot
        lastSlot.sessions.push(session)
        // Extend the slot end if needed
        if (session.endTime > lastSlot.endTime) {
          lastSlot.endTime = session.endTime
        }
      } else {
        slots.push({
          startTime: session.startTime,
          endTime: session.endTime,
          day: session.day,
          sessions: [session],
        })
      }
    }

    return slots
  }, [starredSessions])

  if (starredSessions.length === 0) {
    return (
      <div className="text-center py-12 text-gdc-textMuted">
        <p className="text-lg mb-1">No sessions starred yet</p>
        <p className="text-sm">Star sessions in Browse to see them here</p>
      </div>
    )
  }

  // Find which slot is "next" — first slot that hasn't ended yet
  // For now, show all slots since we're in planning mode
  let currentDay: Day | null = null

  return (
    <div className="space-y-3">
      <p className="text-xs text-gdc-textMuted">
        Your starred sessions grouped by time slot. Overlapping sessions are shown together so you can decide which to attend.
      </p>

      {timeSlots.map((slot, i) => {
        const showDayHeader = slot.day !== currentDay
        currentDay = slot.day
        const isConflict = slot.sessions.length > 1

        return (
          <div key={`${slot.day}-${slot.startTime}-${i}`}>
            {showDayHeader && (
              <h2 className="text-sm font-semibold text-gdc-accent mt-4 mb-2 first:mt-0">
                {DAY_LABELS[slot.day]}
              </h2>
            )}
            <div className={`card p-3 ${isConflict ? 'ring-1 ring-amber-500/40' : ''}`}>
              {/* Time slot header */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-gdc-textMuted">
                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                </span>
                {isConflict && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                    {slot.sessions.length} overlapping — pick one
                  </span>
                )}
              </div>

              {/* Sessions in this slot */}
              <div className={`space-y-2 ${isConflict ? 'divide-y divide-gdc-border' : ''}`}>
                {slot.sessions
                  .sort((a, b) => (userData[b.id]?.interest ?? 0) - (userData[a.id]?.interest ?? 0))
                  .map((session, j) => {
                    const interest = userData[session.id]?.interest ?? 0
                    const trackColor = TRACK_COLORS[session.track]

                    return (
                      <div key={session.id} className={j > 0 ? 'pt-2' : ''}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`track-badge ${trackColor}`}>
                                {session.track}
                              </span>
                              <span className="text-[10px] text-gdc-textMuted font-mono">
                                {formatTimeRange(session.startTime, session.endTime)}
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold leading-snug">{session.title}</h3>
                            <p className="text-xs text-gdc-textMuted mt-0.5">
                              {session.speakers.join(', ')} | {session.room}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <InterestRating
                              level={interest}
                              onChange={v => onUpdateUserData(session.id, { interest: v as InterestLevel })}
                              compact
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
