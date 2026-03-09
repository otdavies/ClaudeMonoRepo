import { useMemo } from 'react'
import { Session, UserSessionData, Day, DAY_LABELS, TRACK_COLORS } from '../types'
import { formatTime, timeToMinutes, getDurationMinutes } from '../utils/conflicts'
import { InterestRating } from './InterestRating'
import { InterestLevel } from '../types'
import { getWalkWarnings, getZoneLabel } from '../utils/location'

interface Props {
  day: Day
  sessions: Session[]
  userData: Record<string, UserSessionData>
  onUpdateUserData: (id: string, data: Partial<UserSessionData>) => void
  conflictMap: Map<string, string[]>
  onSelectSession?: (id: string) => void
}

interface TimeSlot {
  startTime: string
  endTime: string
  sessions: Session[]
}

function groupIntoSlots(sessions: Session[]): TimeSlot[] {
  const sorted = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime))
  const slots: TimeSlot[] = []
  for (const s of sorted) {
    const last = slots[slots.length - 1]
    if (last && timeToMinutes(s.startTime) < timeToMinutes(last.endTime)) {
      last.sessions.push(s)
      if (s.endTime > last.endTime) last.endTime = s.endTime
    } else {
      slots.push({ startTime: s.startTime, endTime: s.endTime, sessions: [s] })
    }
  }
  return slots
}

export function DaySchedule({ day, sessions, userData, onUpdateUserData, conflictMap, onSelectSession }: Props) {
  const daySessions = sessions
    .filter(s => s.day === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const slots = useMemo(() => groupIntoSlots(daySessions), [daySessions])

  const dayWalkWarnings = useMemo(
    () => getWalkWarnings(daySessions, userData),
    [daySessions, userData]
  )

  const warningsByTo = useMemo(() => {
    const map = new Map<string, typeof dayWalkWarnings[0]>()
    for (const w of dayWalkWarnings) map.set(w.toSession.id, w)
    return map
  }, [dayWalkWarnings])

  if (daySessions.length === 0) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-gdc-accent mb-3">{DAY_LABELS[day]}</h2>
        <p className="text-sm text-gdc-textMuted py-4">No sessions starred for this day</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gdc-accent mb-3">{DAY_LABELS[day]}</h2>

      {/* Walk warnings summary */}
      {dayWalkWarnings.length > 0 && (
        <div className="space-y-1 mb-3">
          {dayWalkWarnings.map((w, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] ${
                w.tight
                  ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              }`}
            >
              <span className="font-medium shrink-0">
                {w.tight ? '!!' : '!'} {formatTime(w.fromSession.endTime)}{'\u2192'}{formatTime(w.toSession.startTime)}
              </span>
              <span className="text-gdc-textMuted truncate">
                {getZoneLabel(w.fromSession.room)} {'\u2192'} {getZoneLabel(w.toSession.room)} ~{w.walkMinutes}min walk, {w.gapMinutes}min gap
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-1">
        {slots.map((slot, i) => {
          const isConflict = slot.sessions.length > 1
          const duration = getDurationMinutes(slot.startTime, slot.endTime)

          // Check for walk warning into this slot
          const slotWarning = slot.sessions
            .map(s => warningsByTo.get(s.id))
            .find(w => w !== undefined)

          return (
            <div key={`${slot.startTime}-${i}`}>
              {/* Walk warning divider */}
              {slotWarning && i > 0 && (
                <div className={`flex items-center gap-2 px-2 py-1 my-1 text-[10px] ${
                  slotWarning.tight ? 'text-red-400' : 'text-amber-400'
                }`}>
                  <div className="flex-1 border-t border-dashed border-current opacity-40" />
                  <span>~{slotWarning.walkMinutes}min walk</span>
                  <div className="flex-1 border-t border-dashed border-current opacity-40" />
                </div>
              )}

              {/* Gap indicator between non-adjacent slots */}
              {!slotWarning && i > 0 && (() => {
                const prevSlot = slots[i - 1]
                const gap = timeToMinutes(slot.startTime) - timeToMinutes(prevSlot.endTime)
                if (gap > 15) {
                  return (
                    <div className="flex items-center gap-2 px-2 py-1 my-1 text-[10px] text-gdc-border">
                      <div className="flex-1 border-t border-dashed border-current opacity-30" />
                      <span>{gap}min free</span>
                      <div className="flex-1 border-t border-dashed border-current opacity-30" />
                    </div>
                  )
                }
                return null
              })()}

              <div className={`card p-0 overflow-hidden ${isConflict ? 'ring-1 ring-amber-500/30' : ''}`}>
                {/* Time header */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-gdc-bg/50 border-b border-gdc-border/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium">
                      {formatTime(slot.startTime)}
                    </span>
                    <span className="text-[10px] text-gdc-textMuted">
                      {duration}min {'\u2192'} {formatTime(slot.endTime)}
                    </span>
                  </div>
                  {isConflict && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                      {slot.sessions.length} options
                    </span>
                  )}
                </div>

                {/* Session cards */}
                <div className={isConflict ? 'divide-y divide-gdc-border/30' : ''}>
                  {slot.sessions.map(session => {
                    const interest = userData[session.id]?.interest ?? 0
                    const trackColor = TRACK_COLORS[session.track]
                    const hasConflict = (conflictMap.get(session.id) ?? []).length > 0
                    const zone = getZoneLabel(session.room)

                    return (
                      <div
                        key={session.id}
                        className="px-3 py-2 cursor-pointer hover:bg-gdc-surfaceHover/50 active:bg-gdc-surfaceHover transition-colors"
                        onClick={() => onSelectSession?.(session.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
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
                            {hasConflict && (
                              <p className="text-red-400 text-[10px] mt-0.5 font-medium conflict-pulse">CONFLICT</p>
                            )}
                          </div>
                          <div className="shrink-0" onClick={e => e.stopPropagation()}>
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
    </div>
  )
}
