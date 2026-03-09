import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { Session, UserSessionData, Day, DAY_LABELS, TRACK_COLORS, InterestLevel } from '../types'
import { formatTime, formatTimeRange, timeToMinutes, getDurationMinutes } from '../utils/conflicts'
import { InterestRating } from './InterestRating'
import { AttendeesBadge, AttendeeStrip } from './AttendeesBadge'
import { AttendeeInfo } from '../hooks/useAttendance'
import { getWalkWarnings, getZoneLabel, getWalkTimeBetweenRooms, type WalkWarning } from '../utils/location'

// GDC 2026 dates: Mon 3/9 - Fri 3/13
const DAY_DATES: Record<Day, string> = {
  Mon: '2026-03-09', Tue: '2026-03-10', Wed: '2026-03-11',
  Thu: '2026-03-12', Fri: '2026-03-13', TBD: '',
}

type SlotTiming = 'past' | 'now' | 'upcoming' | 'future'

function getSlotTiming(
  slot: { day: Day; startTime: string; endTime: string },
  now: Date,
  upcomingCount: { n: number },
  maxUpcoming: number,
): SlotTiming {
  const dateStr = DAY_DATES[slot.day]
  if (!dateStr) return 'future'

  const slotStart = new Date(`${dateStr}T${slot.startTime}:00`)
  const slotEnd = new Date(`${dateStr}T${slot.endTime}:00`)

  if (now >= slotStart && now < slotEnd) return 'now'
  if (now >= slotEnd) return 'past'
  if (upcomingCount.n < maxUpcoming) { upcomingCount.n++; return 'upcoming' }
  return 'future'
}

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function getCurrentDayLabel(now: Date): string {
  const iso = now.toISOString().slice(0, 10)
  for (const [day, date] of Object.entries(DAY_DATES)) {
    if (date === iso) return DAY_LABELS[day as Day]
  }
  return ''
}

interface Props {
  sessions: Session[]
  userData: Record<string, UserSessionData>
  onUpdateUserData: (id: string, data: Partial<UserSessionData>) => void
  onSelectSession?: (id: string) => void
  getAttendees?: (sessionId: string) => AttendeeInfo[]
  getAllAttendees?: (sessionId: string) => AttendeeInfo[]
}

interface TimeSlot {
  startTime: string
  endTime: string
  day: Day
  sessions: Session[]
}

/**
 * Group sessions by start time (within 10 min window), NOT by overlap chaining.
 * This prevents a 3-hour workshop from merging every talk into one mega-slot.
 */
function groupByStartTime(sorted: Session[]): TimeSlot[] {
  const slots: TimeSlot[] = []
  for (const s of sorted) {
    const last = slots[slots.length - 1]
    if (
      last &&
      last.day === s.day &&
      Math.abs(timeToMinutes(s.startTime) - timeToMinutes(last.startTime)) < 10
    ) {
      last.sessions.push(s)
      if (s.endTime > last.endTime) last.endTime = s.endTime
    } else {
      slots.push({ startTime: s.startTime, endTime: s.endTime, day: s.day, sessions: [s] })
    }
  }
  return slots
}

function WalkWarningDivider({ warning }: { warning: WalkWarning }) {
  const fromZone = getZoneLabel(warning.fromSession.room)
  const toZone = getZoneLabel(warning.toSession.room)

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] ${
      warning.tight
        ? 'bg-red-500/10 border border-red-500/30 text-red-400'
        : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
    }`}>
      <span className="font-medium shrink-0">
        {warning.tight ? '!!' : '!'} {fromZone} {'\u2192'} {toZone}
      </span>
      <span className="text-gdc-textMuted">
        ~{warning.walkMinutes}min walk
        {warning.gapMinutes > 0 ? `, ${warning.gapMinutes}min gap` : ''}
      </span>
    </div>
  )
}

export function UpNextView({ sessions, userData, onUpdateUserData, onSelectSession, getAttendees, getAllAttendees }: Props) {
  const starredSessions = useMemo(
    () => sessions.filter(s => (userData[s.id]?.interest ?? 0) > 0),
    [sessions, userData]
  )

  const walkWarnings = useMemo(
    () => getWalkWarnings(starredSessions, userData),
    [starredSessions, userData]
  )

  const warningsByTo = useMemo(() => {
    const map = new Map<string, WalkWarning>()
    for (const w of walkWarnings) map.set(w.toSession.id, w)
    return map
  }, [walkWarnings])

  const timeSlots = useMemo(() => {
    const dayOrder: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, TBD: 5 }
    const sorted = [...starredSessions].sort((a, b) => {
      const dayDiff = (dayOrder[a.day] ?? 5) - (dayOrder[b.day] ?? 5)
      if (dayDiff !== 0) return dayDiff
      return a.startTime.localeCompare(b.startTime)
    })
    return groupByStartTime(sorted)
  }, [starredSessions])

  // Set of session IDs blocked by a picked session in a *different* time slot
  const blockedByPick = useMemo(() => {
    const picked = starredSessions.filter(s => userData[s.id]?.picked)
    const blocked = new Set<string>()
    for (const s of starredSessions) {
      if (userData[s.id]?.picked) continue
      const sStart = timeToMinutes(s.startTime)
      const sEnd = timeToMinutes(s.endTime)
      for (const p of picked) {
        if (p.day !== s.day) continue
        const pStart = timeToMinutes(p.startTime)
        const pEnd = timeToMinutes(p.endTime)
        if (sStart < pEnd && sEnd > pStart) {
          blocked.add(s.id)
          break
        }
      }
    }
    return blocked
  }, [starredSessions, userData])

  // Pick a session: auto-unpick any overlapping picked sessions on the same day
  const pickSession = useCallback((targetId: string) => {
    const target = sessions.find(s => s.id === targetId)
    if (!target) return

    const isPicked = userData[targetId]?.picked ?? false

    if (isPicked) {
      onUpdateUserData(targetId, { picked: false })
    } else {
      onUpdateUserData(targetId, { picked: true })

      // Unpick any overlapping picked sessions
      const tStart = timeToMinutes(target.startTime)
      const tEnd = timeToMinutes(target.endTime)
      for (const s of starredSessions) {
        if (s.id === targetId || s.day !== target.day) continue
        if (!(userData[s.id]?.picked)) continue
        const sStart = timeToMinutes(s.startTime)
        const sEnd = timeToMinutes(s.endTime)
        if (sStart < tEnd && sEnd > tStart) {
          onUpdateUserData(s.id, { picked: false })
        }
      }
    }
  }, [sessions, userData, starredSessions, onUpdateUserData])

  if (starredSessions.length === 0) {
    return (
      <div className="text-center py-12 text-gdc-textMuted">
        <p className="text-lg mb-1">No sessions starred yet</p>
        <p className="text-sm">Star sessions in Browse or Swipe to see them here</p>
      </div>
    )
  }

  const pickedCount = starredSessions.filter(s => userData[s.id]?.picked).length

  const now = useNow()
  const nowRef = useRef<HTMLDivElement>(null)
  const hasScrolled = useRef(false)

  // Auto-scroll to the "now" marker once
  useEffect(() => {
    if (nowRef.current && !hasScrolled.current) {
      hasScrolled.current = true
      setTimeout(() => nowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
    }
  }, [timeSlots.length])

  // Precompute timing for each slot
  const upcomingCounter = { n: 0 }
  const slotTimings: SlotTiming[] = timeSlots.map(slot =>
    getSlotTiming(slot, now, upcomingCounter, 3)
  )

  const todayLabel = getCurrentDayLabel(now)
  const nowTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })

  let currentDay: Day | null = null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gdc-textMuted">
          {pickedCount > 0
            ? `${pickedCount} session${pickedCount !== 1 ? 's' : ''} picked to attend. Tap "Attend" to commit.`
            : 'Tap "Attend" on sessions you plan to go to.'
          }
        </p>
        {todayLabel && (
          <span className="text-[10px] font-mono text-gdc-accent/80 bg-gdc-accent/10 px-2 py-0.5 rounded-full">
            {nowTimeStr}
          </span>
        )}
      </div>

      {timeSlots.map((slot, i) => {
        const showDayHeader = slot.day !== currentDay
        const timing = slotTimings[i]
        // Check if this is the first slot of today's "now"/"upcoming" — show the NOW divider before the day header
        const isNow = timing === 'now'
        currentDay = slot.day
        const isChoice = slot.sessions.length > 1
        const duration = getDurationMinutes(slot.startTime, slot.endTime)
        const hasPick = slot.sessions.some(s => userData[s.id]?.picked)

        // Walk warning into this slot
        const slotWarning = slot.sessions
          .map(s => warningsByTo.get(s.id))
          .find(w => w !== undefined)

        // Previous slot's picked/best session for distance context
        const prevSlot = i > 0 && timeSlots[i - 1].day === slot.day ? timeSlots[i - 1] : null
        const prevBestRoom = prevSlot
          ? (prevSlot.sessions.find(s => userData[s.id]?.picked)
             ?? [...prevSlot.sessions].sort((a, b) => (userData[b.id]?.interest ?? 0) - (userData[a.id]?.interest ?? 0))[0]
            )?.room ?? null
          : null

        // Sort: stars desc, then distance (don't reorder by picked)
        const sortedSessions = [...slot.sessions].sort((a, b) => {
          const starDiff = (userData[b.id]?.interest ?? 0) - (userData[a.id]?.interest ?? 0)
          if (starDiff !== 0) return starDiff
          if (!prevBestRoom) return 0
          return getWalkTimeBetweenRooms(prevBestRoom, a.room) - getWalkTimeBetweenRooms(prevBestRoom, b.room)
        })

        const isToday = DAY_DATES[slot.day] === now.toISOString().slice(0, 10)
        const isPast = timing === 'past'
        const isUpcoming = timing === 'upcoming'

        return (
          <div key={`${slot.day}-${slot.startTime}-${i}`}>
            {showDayHeader && (
              <div className={`flex items-center gap-2 mt-5 mb-2 first:mt-0 ${isPast && !isToday ? 'opacity-40' : ''}`}>
                <h2 className={`text-sm font-bold tracking-tight ${
                  isToday ? 'text-gdc-accent' : 'text-gdc-text'
                }`}>
                  {DAY_LABELS[slot.day]}
                </h2>
                {isToday && (
                  <span className="text-[10px] font-semibold bg-gdc-accent text-white px-1.5 py-0.5 rounded">
                    TODAY
                  </span>
                )}
                <div className="flex-1 h-px bg-gdc-border/40" />
              </div>
            )}

            {/* NOW divider — shown before the current slot */}
            {isNow && (
              <div ref={nowRef} className="flex items-center gap-2 my-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Now</span>
                <div className="flex-1 h-px bg-green-400/30" />
              </div>
            )}

            {slotWarning && <WalkWarningDivider warning={slotWarning} />}

            <div className={`card p-0 overflow-hidden transition-opacity ${
              isPast ? 'opacity-40' : ''
            } ${
              isNow ? 'ring-1 ring-green-400/40' :
              isUpcoming ? 'ring-1 ring-gdc-accent/20' :
              isChoice && !hasPick ? 'ring-1 ring-amber-500/30' :
              isChoice && hasPick ? 'ring-1 ring-gdc-accent/30' : ''
            }`}>
              {/* Slot header */}
              <div className={`flex items-center justify-between px-3 py-1.5 border-b border-gdc-border/30 ${
                isNow ? 'bg-green-500/10' : isUpcoming ? 'bg-gdc-accent/5' : 'bg-gdc-bg/50'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-medium ${isNow ? 'text-green-400' : ''}`}>
                    {formatTime(slot.startTime)}
                  </span>
                  <span className="text-[10px] text-gdc-textMuted">
                    {duration}min {'\u2192'} {formatTime(slot.endTime)}
                  </span>
                  {isNow && (
                    <span className="text-[9px] font-bold text-green-400 bg-green-400/15 px-1.5 py-0.5 rounded-full uppercase">
                      Live
                    </span>
                  )}
                  {isUpcoming && (
                    <span className="text-[9px] font-medium text-gdc-accent/70 bg-gdc-accent/10 px-1.5 py-0.5 rounded-full">
                      Up next
                    </span>
                  )}
                </div>
                {isChoice && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    hasPick
                      ? 'bg-gdc-accent/20 text-gdc-accent'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {hasPick ? 'Chosen' : `${slot.sessions.length} options`}
                  </span>
                )}
              </div>

              {/* Sessions */}
              <div className={isChoice ? 'divide-y divide-gdc-border/30' : ''}>
                {sortedSessions.map(session => {
                  const interest = userData[session.id]?.interest ?? 0
                  const picked = userData[session.id]?.picked ?? false
                  const trackColor = TRACK_COLORS[session.track]
                  const zone = getZoneLabel(session.room)
                  const walkFromPrev = prevBestRoom ? getWalkTimeBetweenRooms(prevBestRoom, session.room) : 0
                  const sessionDuration = getDurationMinutes(session.startTime, session.endTime)
                  const friends = getAttendees?.(session.id) ?? []
                  const allPeople = getAllAttendees?.(session.id) ?? []

                  // Collapsed: unpicked session in a slot that has a pick, OR blocked by a pick in another slot
                  const collapsed = (!picked && hasPick && isChoice) || (!picked && blockedByPick.has(session.id))

                  if (collapsed) {
                    return (
                      <div
                        key={session.id}
                        className="relative flex items-center gap-2 px-3 py-1 opacity-40 cursor-pointer hover:opacity-60 transition-opacity"
                        onClick={() => onSelectSession?.(session.id)}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); pickSession(session.id) }}
                          className="shrink-0 w-4 h-4 rounded-full border-2 border-gdc-border hover:border-gdc-textMuted transition-colors"
                          title="Tap to attend this session instead"
                        />
                        <span className="text-xs truncate flex-1">{session.title}</span>
                        <span className={`track-badge ${trackColor} text-[9px] shrink-0`}>
                          {session.track}
                        </span>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={session.id}
                      className={`relative px-3 py-2 transition-colors ${
                        picked ? 'bg-gdc-accent/5' : ''
                      }`}
                    >
                      <AttendeeStrip attendees={allPeople} />
                      <div className="flex items-start gap-2">
                        {/* Pick button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); pickSession(session.id) }}
                          className={`shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            picked
                              ? 'bg-gdc-accent border-gdc-accent text-white'
                              : 'border-gdc-border hover:border-gdc-textMuted'
                          }`}
                          title={picked ? 'Attending — tap to unpick' : 'Tap to attend this session'}
                        >
                          {picked && (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        {/* Session info */}
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => onSelectSession?.(session.id)}
                        >
                          <h3 className="text-sm font-semibold leading-snug">{session.title}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className={`track-badge ${trackColor} text-[10px]`}>
                              {session.track}
                            </span>
                            <span className="text-[10px] text-gdc-textMuted font-mono">
                              {formatTimeRange(session.startTime, session.endTime)}
                            </span>
                            <span className="text-[10px] text-gdc-textMuted">
                              {sessionDuration}min
                            </span>
                            {isChoice && prevBestRoom && walkFromPrev > 1 && (
                              <span className={`text-[10px] px-1 py-0.5 rounded ${
                                walkFromPrev >= 8
                                  ? 'bg-red-500/15 text-red-400'
                                  : walkFromPrev >= 4
                                  ? 'bg-amber-500/15 text-amber-400'
                                  : 'bg-green-500/15 text-green-400'
                              }`}>
                                ~{walkFromPrev}min walk
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gdc-textMuted mt-0.5 truncate">
                            {session.speakers.join(', ')} | {session.room}
                            <span className="ml-1 text-[10px] opacity-60">({zone})</span>
                          </p>
                        </div>

                        {/* Attendees + Star rating */}
                        <div className="shrink-0 flex flex-col items-end gap-1" onClick={e => e.stopPropagation()}>
                          <InterestRating
                            level={interest}
                            onChange={v => onUpdateUserData(session.id, { interest: v as InterestLevel })}
                            compact
                          />
                          {friends.length > 0 && <AttendeesBadge attendees={friends} />}
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
