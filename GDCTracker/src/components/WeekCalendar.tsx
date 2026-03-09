import { Session, UserSessionData, Day, DAY_LABELS, TRACK_COLORS } from '../types'

// Calendar grid only shows confirmed days, not TBD
const CALENDAR_DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
import { formatTime, timeToMinutes, getDurationMinutes } from '../utils/conflicts'

interface Props {
  sessions: Session[]
  userData: Record<string, UserSessionData>
  conflictMap: Map<string, string[]>
  onSelectSession?: (id: string) => void
}

const HOUR_HEIGHT = 60
const START_HOUR = 9
const END_HOUR = 18

export function WeekCalendar({ sessions, conflictMap, onSelectSession }: Props) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  const scheduledByDay = new Map<Day, Session[]>()
  for (const day of CALENDAR_DAYS) {
    scheduledByDay.set(day, sessions.filter(s => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime)))
  }

  const totalScheduled = sessions.length
  const totalConflicts = new Set(Array.from(conflictMap.keys())).size

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gdc-textMuted">
          <span>{totalScheduled} sessions scheduled</span>
          {totalConflicts > 0 && (
            <span className="text-gdc-danger">{totalConflicts} conflicts</span>
          )}
          {CALENDAR_DAYS.map(day => {
            const count = scheduledByDay.get(day)?.length ?? 0
            return count > 0 ? (
              <span key={day} className="hidden sm:inline">{day}: {count}</span>
            ) : null
          })}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto -mx-3 px-3">
        <div className="min-w-[640px]">
          {/* Day headers */}
          <div className="grid grid-cols-[3rem_repeat(5,1fr)] gap-px mb-1">
            <div />
            {CALENDAR_DAYS.map(day => {
              const count = scheduledByDay.get(day)?.length ?? 0
              return (
                <div key={day} className="text-center py-1">
                  <div className="text-xs font-semibold">{day}</div>
                  <div className="text-[10px] text-gdc-textMuted">{DAY_LABELS[day].split(' ')[1]}</div>
                  {count > 0 && (
                    <div className="text-[10px] text-gdc-accent">{count} sessions</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div className="relative grid grid-cols-[3rem_repeat(5,1fr)] gap-px"
            style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>
            {/* Hour labels */}
            <div className="relative">
              {hours.map(h => (
                <div
                  key={h}
                  className="absolute left-0 text-[10px] text-gdc-textMuted font-mono -mt-2"
                  style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                >
                  {formatTime(`${h.toString().padStart(2, '0')}:00`)}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {CALENDAR_DAYS.map(day => (
              <div key={day} className="relative bg-gdc-surface/30 rounded">
                {/* Hour lines */}
                {hours.map(h => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-gdc-border/35"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Sessions */}
                {(scheduledByDay.get(day) ?? []).map(session => {
                  const startMin = timeToMinutes(session.startTime) - START_HOUR * 60
                  const duration = getDurationMinutes(session.startTime, session.endTime)
                  const top = (startMin / 60) * HOUR_HEIGHT
                  const height = Math.max((duration / 60) * HOUR_HEIGHT - 2, 20)
                  const hasConflict = (conflictMap.get(session.id) ?? []).length > 0
                  const trackColor = TRACK_COLORS[session.track]
                  const bgClass = trackColor.split(' ')[0]

                  return (
                    <div
                      key={session.id}
                      className={`absolute left-0.5 right-0.5 rounded p-1 text-[10px] leading-tight
                        cursor-pointer overflow-hidden hover:brightness-125
                        ${hasConflict ? 'bg-red-500/20 ring-1 ring-red-500/50' : bgClass}`}
                      style={{ top, height }}
                      onClick={() => onSelectSession?.(session.id)}
                      title={`${session.title}\n${formatTime(session.startTime)}-${formatTime(session.endTime)}\n${session.room}`}
                    >
                      <p className="font-medium truncate">{session.title}</p>
                      {height > 30 && (
                        <p className="text-white/60 truncate">{formatTime(session.startTime)}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
