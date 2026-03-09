import { useMemo } from 'react'
import { Session, UserSessionData, Day, DAY_LABELS, TRACK_COLORS, InterestLevel } from '../types'
import { formatTime, formatTimeRange, timeToMinutes } from '../utils/conflicts'
import { InterestRating } from './InterestRating'
import { getWalkWarnings, getZoneLabel, type WalkWarning } from '../utils/location'

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

function WalkWarningBanner({ warning }: { warning: WalkWarning }) {
  const fromZone = getZoneLabel(warning.fromSession.room)
  const toZone = getZoneLabel(warning.toSession.room)

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
      warning.tight
        ? 'bg-red-500/10 border border-red-500/30 text-red-400'
        : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
    }`}>
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>
      <div>
        <span className="font-medium">
          {warning.tight ? 'Not enough time to walk!' : 'Tight transition'}
        </span>
        <span className="text-gdc-textMuted ml-1">
          {fromZone} → {toZone} is ~{warning.walkMinutes} min walk
          {warning.gapMinutes > 0
            ? `, only ${warning.gapMinutes} min gap`
            : ', sessions overlap'
          }
        </span>
      </div>
    </div>
  )
}

export function UpNextView({ sessions, userData, onUpdateUserData }: Props) {
  const starredSessions = useMemo(
    () => sessions.filter(s => (userData[s.id]?.interest ?? 0) > 0),
    [sessions, userData]
  )

  const walkWarnings = useMemo(
    () => getWalkWarnings(starredSessions),
    [starredSessions]
  )

  // Index warnings by the "to" session for easy lookup between slots
  const warningsByTo = useMemo(() => {
    const map = new Map<string, WalkWarning>()
    for (const w of walkWarnings) {
      map.set(w.toSession.id, w)
    }
    return map
  }, [walkWarnings])

  const timeSlots = useMemo(() => {
    const dayOrder: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, TBD: 5 }

    const sorted = [...starredSessions].sort((a, b) => {
      const dayDiff = (dayOrder[a.day] ?? 5) - (dayOrder[b.day] ?? 5)
      if (dayDiff !== 0) return dayDiff
      return a.startTime.localeCompare(b.startTime)
    })

    const slots: TimeSlot[] = []
    for (const session of sorted) {
      const lastSlot = slots[slots.length - 1]
      if (
        lastSlot &&
        lastSlot.day === session.day &&
        timeToMinutes(session.startTime) < timeToMinutes(lastSlot.endTime)
      ) {
        lastSlot.sessions.push(session)
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

  let currentDay: Day | null = null

  return (
    <div className="space-y-3">
      <p className="text-xs text-gdc-textMuted">
        Your starred sessions grouped by time slot. Overlapping sessions are shown together so you can decide which to attend.
      </p>

      {/* Walk warnings summary */}
      {walkWarnings.length > 0 && (
        <div className="card p-3 space-y-2">
          <h3 className="text-xs font-semibold text-amber-400 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.7-3l-7-12a2 2 0 00-3.4 0l-7 12A2 2 0 005 19z" />
            </svg>
            {walkWarnings.length} walking concern{walkWarnings.length > 1 ? 's' : ''}
          </h3>
          <p className="text-[10px] text-gdc-textMuted">
            Some back-to-back sessions are in different buildings. Moscone halls are a few blocks apart.
          </p>
        </div>
      )}

      {timeSlots.map((slot, i) => {
        const showDayHeader = slot.day !== currentDay
        currentDay = slot.day
        const isConflict = slot.sessions.length > 1

        // Check if any session in this slot has a walk warning from the previous slot
        const slotWarning = slot.sessions
          .map(s => warningsByTo.get(s.id))
          .find(w => w !== undefined)

        return (
          <div key={`${slot.day}-${slot.startTime}-${i}`}>
            {showDayHeader && (
              <h2 className="text-sm font-semibold text-gdc-accent mt-4 mb-2 first:mt-0">
                {DAY_LABELS[slot.day]}
              </h2>
            )}

            {/* Walk warning between this slot and the previous one */}
            {slotWarning && <WalkWarningBanner warning={slotWarning} />}

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
                    const zone = getZoneLabel(session.room)

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
                              <span className="ml-1 text-[10px] opacity-60">({zone})</span>
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
