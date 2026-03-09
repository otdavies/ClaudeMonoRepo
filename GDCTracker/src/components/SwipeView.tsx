import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Session, UserSessionData, Day, DAY_LABELS, TRACK_COLORS, InterestLevel } from '../types'
import { formatTime, formatTimeRange, timeToMinutes } from '../utils/conflicts'

interface Props {
  sessions: Session[]
  userData: Record<string, UserSessionData>
  onUpdateUserData: (id: string, data: Partial<UserSessionData>) => void
}

// GDC convention hours: 9 AM – 6 PM, Mon–Fri
const CONVENTION_START = 9 * 60  // 09:00
const CONVENTION_END = 18 * 60   // 18:00
const DAY_ORDER: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, TBD: 5 }
const DAYS_LIST: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function getCurrentConventionWindow(): { day: Day; windowStart: number; windowEnd: number } | null {
  const now = new Date()
  // GDC 2026: Mon Mar 9 – Fri Mar 13
  const month = now.getMonth() // 0-indexed, March = 2
  const date = now.getDate()

  let dayIndex = -1
  if (month === 2 && date >= 9 && date <= 13) {
    dayIndex = date - 9 // 0=Mon, 1=Tue, etc.
  }

  if (dayIndex >= 0 && dayIndex < 5) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    if (nowMinutes < CONVENTION_END) {
      const windowStart = Math.max(nowMinutes, CONVENTION_START)
      return { day: DAYS_LIST[dayIndex], windowStart, windowEnd: windowStart + 60 }
    }
  }

  // Outside convention — find next available slot
  // If before convention or after hours, show first slot of next day
  return null
}

function getNextConventionWindow(sessions: Session[]): { day: Day; windowStart: number; windowEnd: number } {
  const live = getCurrentConventionWindow()
  if (live) return live

  // Fallback: find the earliest day with sessions, show first hour
  const sorted = [...sessions].sort((a, b) => {
    const dd = (DAY_ORDER[a.day] ?? 5) - (DAY_ORDER[b.day] ?? 5)
    return dd !== 0 ? dd : a.startTime.localeCompare(b.startTime)
  })

  if (sorted.length > 0) {
    const first = sorted[0]
    const start = timeToMinutes(first.startTime)
    return { day: first.day, windowStart: start, windowEnd: start + 60 }
  }

  return { day: 'Mon', windowStart: CONVENTION_START, windowEnd: CONVENTION_START + 60 }
}

export function SwipeView({ sessions, userData, onUpdateUserData }: Props) {
  const window = useMemo(() => getNextConventionWindow(sessions), [sessions])

  // Sessions that overlap the target hour window
  const candidates = useMemo(() => {
    return sessions
      .filter(s => {
        if (s.day !== window.day) return false
        const start = timeToMinutes(s.startTime)
        const end = timeToMinutes(s.endTime)
        // Overlaps the window
        return start < window.windowEnd && end > window.windowStart
      })
      .sort((a, b) => {
        // Unrated first, then by start time
        const aInterest = userData[a.id]?.interest ?? 0
        const bInterest = userData[b.id]?.interest ?? 0
        if (aInterest === 0 && bInterest > 0) return -1
        if (bInterest === 0 && aInterest > 0) return 1
        return a.startTime.localeCompare(b.startTime)
      })
  }, [sessions, userData, window])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [swipeAction, setSwipeAction] = useState<'left' | 'right' | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Reset index when candidates change
  useEffect(() => { setCurrentIndex(0) }, [candidates.length])

  const session = candidates[currentIndex]
  const interest = session ? (userData[session.id]?.interest ?? 0) : 0

  const handleStar = useCallback((level: InterestLevel) => {
    if (!session) return
    onUpdateUserData(session.id, { interest: interest === level ? 0 : level })
  }, [session, interest, onUpdateUserData])

  const goNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, candidates.length))
    setDragX(0)
    setSwipeAction(null)
  }, [candidates.length])

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0))
    setDragX(0)
    setSwipeAction(null)
  }, [])

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontal.current = null
    setIsDragging(true)
    setSwipeAction(null)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Determine direction lock on first significant move
    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy)
      }
      return
    }

    if (!isHorizontal.current) return // vertical scroll, ignore

    setDragX(dx)
    if (dx < -50) setSwipeAction('left')
    else if (dx > 50) setSwipeAction('right')
    else setSwipeAction(null)
  }, [isDragging])

  const onTouchEnd = useCallback(() => {
    setIsDragging(false)
    isHorizontal.current = null

    if (Math.abs(dragX) > 100) {
      if (dragX < -100) {
        // Swipe left = skip (no star)
        goNext()
      } else if (dragX > 100) {
        // Swipe right = interested (1 star if not already starred)
        if (session && interest === 0) {
          onUpdateUserData(session.id, { interest: 1 })
        }
        goNext()
      }
    } else {
      setDragX(0)
      setSwipeAction(null)
    }
  }, [dragX, goNext, session, interest, onUpdateUserData])

  // Mouse handlers for desktop testing
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    startX.current = e.clientX
    setIsDragging(true)
    setSwipeAction(null)
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - startX.current
    setDragX(dx)
    if (dx < -50) setSwipeAction('left')
    else if (dx > 50) setSwipeAction('right')
    else setSwipeAction(null)
  }, [isDragging])

  const onMouseUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    if (Math.abs(dragX) > 100) {
      if (dragX < -100) {
        goNext()
      } else if (dragX > 100) {
        if (session && interest === 0) {
          onUpdateUserData(session.id, { interest: 1 })
        }
        goNext()
      }
    } else {
      setDragX(0)
      setSwipeAction(null)
    }
  }, [isDragging, dragX, goNext, session, interest, onUpdateUserData])

  const windowLabel = `${DAY_LABELS[window.day]} ${formatTime(`${Math.floor(window.windowStart / 60)}:${(window.windowStart % 60).toString().padStart(2, '0')}`)} - ${formatTime(`${Math.floor(window.windowEnd / 60)}:${(window.windowEnd % 60).toString().padStart(2, '0')}`)}`

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12 text-gdc-textMuted">
        <p className="text-lg mb-1">No sessions in this window</p>
        <p className="text-sm">{windowLabel}</p>
      </div>
    )
  }

  // All done
  if (currentIndex >= candidates.length) {
    const starred = candidates.filter(s => (userData[s.id]?.interest ?? 0) > 0).length
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-4xl mb-4">&#10003;</div>
        <p className="text-lg font-semibold mb-2">All done!</p>
        <p className="text-sm text-gdc-textMuted mb-4">
          You reviewed {candidates.length} session{candidates.length !== 1 ? 's' : ''} and
          starred {starred}.
        </p>
        <button
          onClick={() => setCurrentIndex(0)}
          className="btn-ghost text-sm"
        >
          Review again
        </button>
      </div>
    )
  }

  const trackColor = TRACK_COLORS[session.track]

  return (
    <div className="flex flex-col min-h-[calc(100vh-10rem)]">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gdc-textMuted">{windowLabel}</p>
        <span className="text-xs text-gdc-textMuted font-mono">
          {currentIndex + 1} / {candidates.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-gdc-border/30 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-gdc-accent rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / candidates.length) * 100}%` }}
        />
      </div>

      {/* Swipe hint overlays */}
      <div className="relative flex-1 flex items-stretch">
        {/* Left hint */}
        <div
          className={`absolute inset-y-0 left-0 w-16 z-10 flex items-center justify-center transition-opacity duration-150 pointer-events-none ${
            swipeAction === 'left' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="bg-gdc-border/80 text-gdc-textMuted rounded-full w-10 h-10 flex items-center justify-center text-lg">
            &#x2715;
          </div>
        </div>

        {/* Right hint */}
        <div
          className={`absolute inset-y-0 right-0 w-16 z-10 flex items-center justify-center transition-opacity duration-150 pointer-events-none ${
            swipeAction === 'right' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="bg-gdc-gold/80 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg">
            &#x2605;
          </div>
        </div>

        {/* Card */}
        <div
          ref={cardRef}
          className={`card flex-1 p-4 flex flex-col justify-between select-none ${
            isDragging ? '' : 'transition-transform duration-200'
          } ${
            swipeAction === 'right' ? 'ring-2 ring-gdc-gold/60' :
            swipeAction === 'left' ? 'ring-2 ring-gdc-border/60' : ''
          }`}
          style={{
            transform: `translateX(${dragX}px) rotate(${dragX * 0.03}deg)`,
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { if (isDragging) { setIsDragging(false); setDragX(0); setSwipeAction(null) } }}
        >
          {/* Top: track + time */}
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`track-badge ${trackColor}`}>{session.track}</span>
              <span className="text-xs font-mono text-gdc-textMuted">
                {formatTimeRange(session.startTime, session.endTime)}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-lg font-bold leading-snug mb-2">{session.title}</h2>

            {/* Speakers + room */}
            <p className="text-sm text-gdc-textMuted mb-3">
              {session.speakers.length > 0 ? session.speakers.join(', ') : 'No speakers listed'}
            </p>
            <p className="text-xs text-gdc-textMuted mb-4">
              {session.format} &middot; {session.room}
            </p>

            {/* Description */}
            <p className="text-xs text-gdc-textMuted leading-relaxed line-clamp-6">
              {session.description}
            </p>

            {/* Tags */}
            {session.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {session.tags.slice(0, 5).map(tag => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-gdc-bg text-gdc-textMuted">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bottom: star buttons */}
          <div className="mt-6 pt-4 border-t border-gdc-border">
            {/* Current interest display */}
            {interest > 0 && (
              <p className="text-center text-xs text-gdc-textMuted mb-2">
                Currently: {['', 'Maybe', 'Want', 'Must'][interest]}
              </p>
            )}

            <div className="flex items-center justify-center gap-2">
              {/* Skip button */}
              <button
                onClick={goNext}
                className="flex-1 py-3 rounded-lg bg-gdc-surface border border-gdc-border text-sm text-gdc-textMuted active:bg-gdc-surfaceHover"
              >
                Skip
              </button>

              {/* Star buttons */}
              {([1, 2, 3] as const).map(n => (
                <button
                  key={n}
                  onClick={() => { handleStar(n); goNext() }}
                  className={`flex-1 py-3 rounded-lg border text-sm font-medium active:scale-95 transition-transform ${
                    n === 1
                      ? 'bg-gdc-surface border-gdc-border text-gdc-text'
                      : n === 2
                      ? 'bg-gdc-gold/10 border-gdc-gold/40 text-gdc-gold'
                      : 'bg-red-500/10 border-red-500/40 text-red-400'
                  }`}
                >
                  {'\u2605'.repeat(n)}
                </button>
              ))}
            </div>

            <p className="text-center text-[10px] text-gdc-textMuted mt-2">
              Swipe right to star &middot; Swipe left to skip
            </p>
          </div>
        </div>
      </div>

      {/* Nav arrows */}
      <div className="flex items-center justify-between mt-3">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="btn-ghost text-xs disabled:opacity-30"
        >
          &larr; Back
        </button>
        <button
          onClick={goNext}
          className="btn-ghost text-xs"
        >
          Next &rarr;
        </button>
      </div>
    </div>
  )
}
