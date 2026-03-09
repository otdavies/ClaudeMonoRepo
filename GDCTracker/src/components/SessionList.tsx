import { useState, useCallback, useEffect, useRef, startTransition, useMemo } from 'react'
import { Session, UserSessionData, Day, DAY_LABELS, Track, TRACK_COLORS, InterestLevel } from '../types'
import { SessionCard, DEFAULT_USER_DATA } from './SessionCard'
import { formatTime } from '../utils/conflicts'
import { InterestRating } from './InterestRating'

export type BrowseMode = 'timeline' | 'tracks' | 'compact'

const EMPTY_CONFLICTS: string[] = []

interface Props {
  sessions: Session[]
  userData: Record<string, UserSessionData>
  onUpdateUserData: (id: string, data: Partial<UserSessionData>) => void
  conflictMap: Map<string, string[]>
  browseMode: BrowseMode
}

// ─── Collapsible section ────────────────────────────────────────────

function CollapsibleGroup({ label, count, badge, children, defaultOpen = false }: {
  label: string
  count: number
  badge?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="sticky top-0 z-10 w-full flex items-center justify-between bg-gdc-bg/95 backdrop-blur-sm py-1.5 mb-1 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-3 h-3 text-gdc-textMuted transition-transform ${open ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-gdc-accent">{label}</span>
          {badge}
        </div>
        <span className="text-[10px] text-gdc-textMuted">{count}</span>
      </button>
      {open && children}
    </div>
  )
}

// ─── Timeline view (Day > Time Slot foldouts) ──────────────────────

function TimelineView({ sessions, userData, onUpdateUserData, conflictMap }: Omit<Props, 'browseMode'>) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const toggleExpand = useCallback((id: string) => {
    startTransition(() => setExpandedId(prev => prev === id ? null : id))
  }, [])

  const dayOrder: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, TBD: 5 }

  const structure = useMemo(() => {
    const days = new Map<Day, Map<string, Session[]>>()
    for (const s of sessions) {
      if (!days.has(s.day)) days.set(s.day, new Map())
      const slots = days.get(s.day)!
      const key = s.startTime
      if (!slots.has(key)) slots.set(key, [])
      slots.get(key)!.push(s)
    }
    return Array.from(days.entries())
      .sort(([a], [b]) => (dayOrder[a] ?? 5) - (dayOrder[b] ?? 5))
      .map(([day, slots]) => ({
        day,
        slots: Array.from(slots.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([time, slotSessions]) => ({ time, sessions: slotSessions }))
      }))
  }, [sessions])

  return (
    <div className="space-y-3">
      {structure.map(({ day, slots }) => (
        <CollapsibleGroup
          key={day}
          label={DAY_LABELS[day]}
          count={slots.reduce((n, s) => n + s.sessions.length, 0)}
          defaultOpen
        >
          <div className="space-y-1 ml-2 border-l border-gdc-border/30 pl-3">
            {slots.map(({ time, sessions: slotSessions }) => {
              const hasOverlap = slotSessions.length > 1
              return (
                <CollapsibleGroup
                  key={`${day}-${time}`}
                  label={formatTime(time)}
                  count={slotSessions.length}
                  badge={hasOverlap ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                      {slotSessions.length} options
                    </span>
                  ) : undefined}
                  defaultOpen={slotSessions.length <= 4}
                >
                  <div className="space-y-2 ml-1">
                    {slotSessions.map(s => (
                      <SessionCard
                        key={s.id}
                        session={s}
                        userData={userData[s.id] ?? DEFAULT_USER_DATA}
                        onUpdateUserData={onUpdateUserData}
                        conflicts={conflictMap.get(s.id) ?? EMPTY_CONFLICTS}
                        expanded={expandedId === s.id}
                        onToggleExpand={toggleExpand}
                      />
                    ))}
                  </div>
                </CollapsibleGroup>
              )
            })}
          </div>
        </CollapsibleGroup>
      ))}
    </div>
  )
}

// ─── Tracks view (Track foldouts) ──────────────────────────────────

function TracksView({ sessions, userData, onUpdateUserData, conflictMap }: Omit<Props, 'browseMode'>) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const toggleExpand = useCallback((id: string) => {
    startTransition(() => setExpandedId(prev => prev === id ? null : id))
  }, [])

  const dayOrder: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, TBD: 5 }

  const trackGroups = useMemo(() => {
    const map = new Map<Track, Session[]>()
    for (const s of sessions) {
      if (!map.has(s.track)) map.set(s.track, [])
      map.get(s.track)!.push(s)
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => b.length - a.length)
  }, [sessions])

  return (
    <div className="space-y-2">
      {trackGroups.map(([track, trackSessions]) => {
        const starredCount = trackSessions.filter(s => (userData[s.id]?.interest ?? 0) > 0).length
        return (
          <CollapsibleGroup
            key={track}
            label={track}
            count={trackSessions.length}
            badge={
              <div className="flex items-center gap-1">
                {starredCount > 0 && (
                  <span className="text-[10px] text-gdc-gold">{starredCount} starred</span>
                )}
              </div>
            }
          >
            <div className="space-y-2 ml-2">
              {trackSessions
                .sort((a, b) => {
                  const dd = (dayOrder[a.day] ?? 5) - (dayOrder[b.day] ?? 5)
                  return dd !== 0 ? dd : a.startTime.localeCompare(b.startTime)
                })
                .map(s => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    userData={userData[s.id] ?? DEFAULT_USER_DATA}
                    onUpdateUserData={onUpdateUserData}
                    conflicts={conflictMap.get(s.id) ?? EMPTY_CONFLICTS}
                    expanded={expandedId === s.id}
                    onToggleExpand={toggleExpand}
                  />
                ))}
            </div>
          </CollapsibleGroup>
        )
      })}
    </div>
  )
}

// ─── Compact view (dense scannable rows) ───────────────────────────

function CompactView({ sessions, userData, onUpdateUserData, conflictMap }: Omit<Props, 'browseMode'>) {
  const [visibleCount, setVisibleCount] = useState(60)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setVisibleCount(60) }, [sessions])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setVisibleCount(prev => Math.min(prev + 60, sessions.length)) },
      { rootMargin: '300px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [visibleCount, sessions.length])

  const visible = sessions.slice(0, visibleCount)

  return (
    <div>
      {/* Desktop header */}
      <div className="hidden sm:grid grid-cols-[4.5rem_1fr_7rem_4.5rem] gap-2 text-[10px] text-gdc-textMuted font-medium px-2 py-1 border-b border-gdc-border mb-1">
        <span>Time</span>
        <span>Session</span>
        <span>Track</span>
        <span className="text-right">Interest</span>
      </div>

      <div className="divide-y divide-gdc-border/30">
        {visible.map(s => {
          const interest = userData[s.id]?.interest ?? 0
          const isStarred = interest > 0
          const hasConflict = (conflictMap.get(s.id) ?? []).length > 0
          const trackColor = TRACK_COLORS[s.track]

          return (
            <div
              key={s.id}
              className={`grid grid-cols-[4.5rem_1fr] sm:grid-cols-[4.5rem_1fr_7rem_4.5rem] gap-2 items-center px-2 py-1.5 text-xs hover:bg-gdc-surfaceHover ${
                isStarred ? 'bg-gdc-accent/5' : ''
              } ${hasConflict && isStarred ? 'bg-red-500/5' : ''}`}
            >
              <span className="font-mono text-gdc-textMuted text-[11px] whitespace-nowrap">
                {s.day} {formatTime(s.startTime).replace(' ', '')}
              </span>

              <div className="min-w-0">
                <p className={`truncate font-medium ${isStarred ? 'text-gdc-text' : 'text-gdc-textMuted'}`}>
                  {s.title}
                </p>
                <p className="truncate text-[10px] text-gdc-textMuted">
                  {s.speakers.join(', ')} | {s.format} | {s.room}
                </p>
              </div>

              <span className={`track-badge ${trackColor} text-[10px] hidden sm:inline-flex w-fit`}>
                {s.track.length > 14 ? s.track.split(/[\s&]+/).map(w => w[0]).join('') : s.track}
              </span>

              <div className="hidden sm:flex justify-end">
                <InterestRating
                  level={interest}
                  onChange={v => onUpdateUserData(s.id, { interest: v as InterestLevel })}
                  compact
                />
              </div>
            </div>
          )
        })}
      </div>

      {visibleCount < sessions.length && (
        <div ref={sentinelRef} className="text-center py-4 text-xs text-gdc-textMuted">
          Loading more... ({visibleCount} of {sessions.length})
        </div>
      )}
    </div>
  )
}

// ─── Main SessionList ──────────────────────────────────────────────

export function SessionList({ sessions, userData, onUpdateUserData, conflictMap, browseMode }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-gdc-textMuted">
        <p className="text-lg mb-1">No sessions found</p>
        <p className="text-sm">Try adjusting your filters</p>
      </div>
    )
  }

  const shared = { sessions, userData, onUpdateUserData, conflictMap }

  switch (browseMode) {
    case 'timeline':
      return <TimelineView {...shared} />
    case 'tracks':
      return <TracksView {...shared} />
    case 'compact':
      return <CompactView {...shared} />
  }
}
