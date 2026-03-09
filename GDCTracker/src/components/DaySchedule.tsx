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

const HOUR_HEIGHT = 80 // px per hour
const START_HOUR = 9
const END_HOUR = 18

export function DaySchedule({ day, sessions, userData, onUpdateUserData, conflictMap, onSelectSession }: Props) {
  const daySessions = sessions
    .filter(s => s.day === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  // Detect overlapping groups for column layout
  const columns = assignColumns(daySessions)

  // Walk warnings for consecutive sessions on this day
  const dayWalkWarnings = useMemo(
    () => getWalkWarnings(daySessions, userData),
    [daySessions, userData]
  )

  return (
    <div>
      <h2 className="text-sm font-semibold text-gdc-accent mb-3">{DAY_LABELS[day]}</h2>

      {/* Walk warnings for this day */}
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
                {w.tight ? '!!' : '!'} {formatTime(w.fromSession.endTime)}→{formatTime(w.toSession.startTime)}
              </span>
              <span className="text-gdc-textMuted truncate">
                {getZoneLabel(w.fromSession.room)} → {getZoneLabel(w.toSession.room)} ~{w.walkMinutes}min walk, {w.gapMinutes}min gap
              </span>
            </div>
          ))}
        </div>
      )}

      {daySessions.length === 0 ? (
        <p className="text-sm text-gdc-textMuted py-4">No sessions starred for this day</p>
      ) : (
        <div className="relative" style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>
          {/* Hour lines */}
          {hours.map(h => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-gdc-border/30 flex items-start"
              style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
            >
              <span className="text-[10px] text-gdc-textMuted font-mono w-12 -mt-2 shrink-0">
                {formatTime(`${h.toString().padStart(2, '0')}:00`)}
              </span>
            </div>
          ))}

          {/* Sessions */}
          {daySessions.map(session => {
            const startMin = timeToMinutes(session.startTime) - START_HOUR * 60
            const duration = getDurationMinutes(session.startTime, session.endTime)
            const top = (startMin / 60) * HOUR_HEIGHT
            const height = Math.max((duration / 60) * HOUR_HEIGHT - 2, 24)
            const col = columns.get(session.id) ?? { col: 0, total: 1 }
            const hasConflict = (conflictMap.get(session.id) ?? []).length > 0
            const trackColor = TRACK_COLORS[session.track]
            const borderColorClass = trackColor.split(' ').find(c => c.startsWith('border-')) ?? 'border-gdc-accent'

            return (
              <div
                key={session.id}
                className={`absolute rounded-md p-1.5 text-xs overflow-hidden cursor-pointer
                  hover:brightness-110 border-l-3
                  ${hasConflict ? 'bg-red-500/10 border-red-500' : `bg-gdc-surface ${borderColorClass}`}`}
                style={{
                  top,
                  height,
                  left: `calc(3rem + ${(col.col / col.total) * 100}% * (1 - 3rem / 100%))`,
                  width: `calc(${100 / col.total}% - 3rem / ${col.total} - 4px)`,
                  borderLeftWidth: '3px',
                }}
                onClick={() => onSelectSession?.(session.id)}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight truncate">{session.title}</p>
                    <p className="text-gdc-textMuted truncate">
                      {formatTime(session.startTime)}-{formatTime(session.endTime)} | {session.room}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <InterestRating
                      level={userData[session.id]?.interest ?? 0}
                      onChange={v => onUpdateUserData(session.id, { interest: v as InterestLevel })}
                      compact
                    />
                  </div>
                </div>
                {height > 50 && (
                  <p className="text-gdc-textMuted mt-0.5 truncate">{session.speakers.join(', ')}</p>
                )}
                {hasConflict && (
                  <p className="text-red-400 text-[10px] mt-0.5 conflict-pulse">CONFLICT</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function assignColumns(sessions: Session[]): Map<string, { col: number; total: number }> {
  const result = new Map<string, { col: number; total: number }>()
  const sorted = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime))

  // Find overlapping groups
  const groups: Session[][] = []
  let currentGroup: Session[] = []

  for (const s of sorted) {
    if (currentGroup.length === 0) {
      currentGroup.push(s)
    } else {
      const overlaps = currentGroup.some(existing =>
        timeToMinutes(s.startTime) < timeToMinutes(existing.endTime)
      )
      if (overlaps) {
        currentGroup.push(s)
      } else {
        groups.push(currentGroup)
        currentGroup = [s]
      }
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup)

  for (const group of groups) {
    const total = group.length
    group.forEach((s, i) => {
      result.set(s.id, { col: i, total })
    })
  }

  return result
}
