import { useState, useMemo, useCallback, useRef } from 'react'
import { Session, UserSessionData, Day, DAY_LABELS, TRACK_COLORS, InterestLevel } from '../types'
import { formatTimeRange, timeToMinutes } from '../utils/conflicts'

interface Props {
  sessions: Session[]
  userData: Record<string, UserSessionData>
  onUpdateUserData: (id: string, data: Partial<UserSessionData>) => void
}

type SwipeMode = 'next' | Day

const DAYS_LIST: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const INTEREST_LABELS = ['', 'Maybe', 'Want', 'Must']

function getLiveDay(): Day | null {
  const now = new Date()
  if (now.getMonth() === 2 && now.getDate() >= 9 && now.getDate() <= 13) {
    return DAYS_LIST[now.getDate() - 9]
  }
  return null
}

function getLiveMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export function SwipeView({ sessions, userData, onUpdateUserData }: Props) {
  const [mode, setMode] = useState<SwipeMode>('next')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [swipeAction, setSwipeAction] = useState<'left' | 'right' | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)

  // Build candidate list based on mode
  const candidates = useMemo(() => {
    let filtered: Session[]

    if (mode === 'next') {
      // "Up next" — sessions starting in the next ~60 min from now
      const liveDay = getLiveDay()
      const nowMin = getLiveMinutes()

      if (liveDay) {
        filtered = sessions.filter(s => {
          if (s.day !== liveDay) return false
          const start = timeToMinutes(s.startTime)
          const end = timeToMinutes(s.endTime)
          // Starts within next 60 min, or currently running
          return (start >= nowMin && start < nowMin + 60) || (start < nowMin && end > nowMin)
        })
      } else {
        // Not during convention — show first day's sessions as preview
        const firstDay = DAYS_LIST.find(d => sessions.some(s => s.day === d)) ?? 'Mon'
        filtered = sessions.filter(s => s.day === firstDay)
      }
    } else {
      // Full day queue
      filtered = sessions.filter(s => s.day === mode)
    }

    // Sort: unrated first, then by time
    return filtered.sort((a, b) => {
      const aRated = (userData[a.id]?.interest ?? 0) > 0 ? 1 : 0
      const bRated = (userData[b.id]?.interest ?? 0) > 0 ? 1 : 0
      if (aRated !== bRated) return aRated - bRated
      return a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title)
    })
  }, [sessions, userData, mode])

  const session = candidates[currentIndex] ?? null
  const interest = session ? (userData[session.id]?.interest ?? 0) : 0

  const resetSwipe = useCallback(() => {
    setDragX(0)
    setSwipeAction(null)
  }, [])

  const goNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, candidates.length))
    resetSwipe()
  }, [candidates.length, resetSwipe])

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0))
    resetSwipe()
  }, [resetSwipe])

  const handleModeChange = useCallback((m: SwipeMode) => {
    setMode(m)
    setCurrentIndex(0)
    resetSwipe()
  }, [resetSwipe])

  // Swipe commit logic
  const commitSwipe = useCallback((dx: number) => {
    if (Math.abs(dx) > 80) {
      if (dx > 80 && session) {
        // Swipe right = star (1 star if unrated)
        if (interest === 0) {
          onUpdateUserData(session.id, { interest: 1 })
        }
      }
      // Both directions advance
      goNext()
    } else {
      resetSwipe()
    }
  }, [goNext, resetSwipe, session, interest, onUpdateUserData])

  // Touch
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

    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy)
      }
      return
    }
    if (!isHorizontal.current) return

    setDragX(dx)
    setSwipeAction(dx < -40 ? 'left' : dx > 40 ? 'right' : null)
  }, [isDragging])

  const onTouchEnd = useCallback(() => {
    setIsDragging(false)
    isHorizontal.current = null
    commitSwipe(dragX)
  }, [dragX, commitSwipe])

  // Mouse (desktop)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    startX.current = e.clientX
    setIsDragging(true)
    setSwipeAction(null)
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - startX.current
    setDragX(dx)
    setSwipeAction(dx < -40 ? 'left' : dx > 40 ? 'right' : null)
  }, [isDragging])

  const onMouseUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    commitSwipe(dragX)
  }, [isDragging, dragX, commitSwipe])

  const onMouseLeave = useCallback(() => {
    if (isDragging) { setIsDragging(false); resetSwipe() }
  }, [isDragging, resetSwipe])

  // Count stats for the mode selector
  const dayCounts = useMemo(() => {
    const counts: Record<string, { total: number; rated: number }> = {}
    for (const d of DAYS_LIST) {
      const daySessions = sessions.filter(s => s.day === d)
      counts[d] = {
        total: daySessions.length,
        rated: daySessions.filter(s => (userData[s.id]?.interest ?? 0) > 0).length,
      }
    }
    return counts
  }, [sessions, userData])

  const unratedInCandidates = candidates.filter(s => (userData[s.id]?.interest ?? 0) === 0).length

  // ─── Done state ───
  if (currentIndex >= candidates.length && candidates.length > 0) {
    const starred = candidates.filter(s => (userData[s.id]?.interest ?? 0) > 0).length
    return (
      <div className="space-y-4">
        <ModeSelector mode={mode} onChangeMode={handleModeChange} dayCounts={dayCounts} />
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
          <div className="text-3xl mb-3">&#10003;</div>
          <p className="text-base font-semibold mb-1">All reviewed!</p>
          <p className="text-sm text-gdc-textMuted mb-4">
            {candidates.length} session{candidates.length !== 1 ? 's' : ''}, {starred} starred
          </p>
          <button onClick={() => setCurrentIndex(0)} className="btn-ghost text-sm">
            Go again
          </button>
        </div>
      </div>
    )
  }

  // ─── Empty state ───
  if (candidates.length === 0) {
    return (
      <div className="space-y-4">
        <ModeSelector mode={mode} onChangeMode={handleModeChange} dayCounts={dayCounts} />
        <div className="text-center py-12 text-gdc-textMuted">
          <p className="text-base mb-1">No sessions{mode === 'next' ? ' coming up' : ` on ${DAY_LABELS[mode as Day]?.split(' ')[0]}`}</p>
          <p className="text-xs">Try picking a day above</p>
        </div>
      </div>
    )
  }

  const trackColor = TRACK_COLORS[session.track]

  return (
    <div className="flex flex-col min-h-[calc(100vh-10rem)]">
      {/* Mode selector */}
      <ModeSelector mode={mode} onChangeMode={handleModeChange} dayCounts={dayCounts} />

      {/* Progress */}
      <div className="flex items-center justify-between mt-3 mb-1">
        <span className="text-[10px] text-gdc-textMuted">
          {unratedInCandidates} unrated remaining
        </span>
        <span className="text-[10px] text-gdc-textMuted font-mono">
          {currentIndex + 1} / {candidates.length}
        </span>
      </div>
      <div className="w-full h-0.5 bg-gdc-border/30 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-gdc-accent rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / candidates.length) * 100}%` }}
        />
      </div>

      {/* Card area */}
      <div className="relative flex-1 flex items-stretch">
        {/* Swipe hints */}
        <div className={`absolute inset-y-0 left-0 w-14 z-10 flex items-center justify-center transition-opacity duration-100 pointer-events-none ${
          swipeAction === 'left' ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="bg-gdc-border/80 text-gdc-textMuted rounded-full w-9 h-9 flex items-center justify-center text-base">
            &#x2715;
          </div>
        </div>
        <div className={`absolute inset-y-0 right-0 w-14 z-10 flex items-center justify-center transition-opacity duration-100 pointer-events-none ${
          swipeAction === 'right' ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="bg-gdc-gold/80 text-white rounded-full w-9 h-9 flex items-center justify-center text-base">
            &#x2605;
          </div>
        </div>

        {/* The card */}
        <div
          className={`card flex-1 p-4 flex flex-col select-none overflow-hidden ${
            isDragging ? '' : 'transition-transform duration-200'
          } ${
            swipeAction === 'right' ? 'ring-2 ring-gdc-gold/50' :
            swipeAction === 'left' ? 'ring-2 ring-gdc-border/50' : ''
          }`}
          style={{ transform: `translateX(${dragX}px) rotate(${dragX * 0.025}deg)` }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`track-badge ${trackColor}`}>{session.track}</span>
            <span className="text-xs font-mono text-gdc-textMuted">
              {formatTimeRange(session.startTime, session.endTime)}
            </span>
            {interest > 0 && (
              <span className={`text-xs font-medium ${
                interest === 3 ? 'text-red-400' : interest === 2 ? 'text-gdc-gold' : 'text-gdc-textMuted'
              }`}>
                {'\u2605'.repeat(interest)} {INTEREST_LABELS[interest]}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold leading-snug mb-1.5">{session.title}</h2>

          {/* Meta */}
          <p className="text-sm text-gdc-textMuted mb-1">
            {session.speakers.length > 0 ? session.speakers.join(', ') : 'No speakers listed'}
          </p>
          <p className="text-[11px] text-gdc-textMuted mb-3">
            {session.format} &middot; {session.room}
          </p>

          {/* Description */}
          <p className="text-xs text-gdc-textMuted leading-relaxed flex-1 line-clamp-6">
            {session.description}
          </p>

          {/* Tags */}
          {session.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {session.tags.slice(0, 4).map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-gdc-bg text-gdc-textMuted">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 pt-3 border-t border-gdc-border">
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className="flex-1 py-2.5 rounded-lg bg-gdc-surface border border-gdc-border text-sm text-gdc-textMuted active:bg-gdc-surfaceHover"
              >
                Skip
              </button>
              {([1, 2, 3] as const).map(n => (
                <button
                  key={n}
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdateUserData(session.id, { interest: (interest === n ? 0 : n) as InterestLevel })
                    goNext()
                  }}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium active:scale-95 transition-transform ${
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
            <p className="text-center text-[10px] text-gdc-textMuted mt-1.5">
              Swipe right = star &middot; left = skip
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between mt-2">
        <button onClick={goPrev} disabled={currentIndex === 0} className="btn-ghost text-xs disabled:opacity-30">
          &larr; Back
        </button>
        <button onClick={goNext} className="btn-ghost text-xs">
          Next &rarr;
        </button>
      </div>
    </div>
  )
}

// ─── Mode selector (day pills + "Up Next") ─────────────────────────

function ModeSelector({ mode, onChangeMode, dayCounts }: {
  mode: SwipeMode
  onChangeMode: (m: SwipeMode) => void
  dayCounts: Record<string, { total: number; rated: number }>
}) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
      <button
        onClick={() => onChangeMode('next')}
        className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          mode === 'next'
            ? 'bg-gdc-accent text-white'
            : 'bg-gdc-surface text-gdc-textMuted border border-gdc-border'
        }`}
      >
        Up Next
      </button>
      {DAYS_LIST.map(d => {
        const { total, rated } = dayCounts[d] ?? { total: 0, rated: 0 }
        const allRated = total > 0 && rated === total
        return (
          <button
            key={d}
            onClick={() => onChangeMode(d)}
            className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors relative ${
              mode === d
                ? 'bg-gdc-accent text-white'
                : allRated
                ? 'bg-gdc-surface/50 text-gdc-textMuted/50 border border-gdc-border/50'
                : 'bg-gdc-surface text-gdc-textMuted border border-gdc-border'
            }`}
          >
            {d}
            {total > 0 && (
              <span className="ml-1 text-[10px] opacity-60">
                {rated}/{total}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
