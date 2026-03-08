import { useState } from 'react'
import { Session, UserSessionData, Day, DAY_LABELS } from '../types'
import { SessionCard } from './SessionCard'

interface Props {
  sessions: Session[]
  userData: Record<string, UserSessionData>
  onUpdateUserData: (id: string, data: Partial<UserSessionData>) => void
  conflictMap: Map<string, string[]>
  groupByDay?: boolean
}

export function SessionList({ sessions, userData, onUpdateUserData, conflictMap, groupByDay = true }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-gdc-textMuted">
        <p className="text-lg mb-1">No sessions found</p>
        <p className="text-sm">Try adjusting your filters</p>
      </div>
    )
  }

  if (!groupByDay) {
    return (
      <div className="space-y-2">
        {sessions.map(s => (
          <SessionCard
            key={s.id}
            session={s}
            userData={userData[s.id] ?? { interest: 0, scheduled: false, notes: '' }}
            onUpdateUserData={onUpdateUserData}
            conflicts={conflictMap.get(s.id) ?? []}
            expanded={expandedId === s.id}
            onToggleExpand={toggleExpand}
          />
        ))}
      </div>
    )
  }

  // Group by day, maintaining day order
  const dayOrder: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, TBD: 5 }
  const groups = new Map<Day, Session[]>()
  for (const s of sessions) {
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
                userData={userData[s.id] ?? { interest: 0, scheduled: false, notes: '' }}
                onUpdateUserData={onUpdateUserData}
                conflicts={conflictMap.get(s.id) ?? []}
                expanded={expandedId === s.id}
                onToggleExpand={toggleExpand}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
