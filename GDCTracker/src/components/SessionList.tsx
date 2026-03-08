import { useState, useCallback, useEffect, useRef } from 'react'
import { Session, UserSessionData, Day, DAY_LABELS } from '../types'
import { SessionCard, DEFAULT_USER_DATA } from './SessionCard'

const PAGE_SIZE = 30
const EMPTY_CONFLICTS: string[] = []

interface Props {
  sessions: Session[]
  userData: Record<string, UserSessionData>
  onUpdateUserData: (id: string, data: Partial<UserSessionData>) => void
  conflictMap: Map<string, string[]>
  groupByDay?: boolean
}

export function SessionList({ sessions, userData, onUpdateUserData, conflictMap, groupByDay = true }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  // Reset visible count when sessions change (new filter applied)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [sessions])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, sessions.length))
        }
      },
      { rootMargin: '300px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [visibleCount, sessions.length])

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-gdc-textMuted">
        <p className="text-lg mb-1">No sessions found</p>
        <p className="text-sm">Try adjusting your filters</p>
      </div>
    )
  }

  const visibleSessions = sessions.slice(0, visibleCount)
  const hasMore = visibleCount < sessions.length

  if (!groupByDay) {
    return (
      <div className="space-y-2">
        {visibleSessions.map(s => (
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
        {hasMore && (
          <div ref={sentinelRef} className="text-center py-4 text-xs text-gdc-textMuted">
            Loading more... ({visibleCount} of {sessions.length})
          </div>
        )}
      </div>
    )
  }

  // Group by day, maintaining day order
  const dayOrder: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, TBD: 5 }
  const groups = new Map<Day, Session[]>()
  for (const s of visibleSessions) {
    const list = groups.get(s.day) ?? []
    list.push(s)
    groups.set(s.day, list)
  }
  const sortedEntries = Array.from(groups.entries()).sort(
    ([a], [b]) => (dayOrder[a] ?? 5) - (dayOrder[b] ?? 5)
  )

  return (
    <div className="space-y-4">
      {sortedEntries.map(([day, daySessions]) => (
        <div key={day}>
          <div className="sticky top-0 z-10 bg-gdc-bg/95 backdrop-blur-sm py-1 mb-2">
            <h2 className="text-sm font-semibold text-gdc-accent">{DAY_LABELS[day]}</h2>
          </div>
          <div className="space-y-2">
            {daySessions.map(s => (
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
        </div>
      ))}
      {hasMore && (
        <div ref={sentinelRef} className="text-center py-4 text-xs text-gdc-textMuted">
          Loading more... ({visibleCount} of {sessions.length})
        </div>
      )}
    </div>
  )
}
