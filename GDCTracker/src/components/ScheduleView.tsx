import { useState } from 'react'
import { Session, UserSessionData, Day, ALL_DAYS } from '../types'
import { DaySchedule } from './DaySchedule'
import { WeekCalendar } from './WeekCalendar'

interface Props {
  sessions: Session[]
  userData: Record<string, UserSessionData>
  onUpdateUserData: (id: string, data: Partial<UserSessionData>) => void
  conflictMap: Map<string, string[]>
  onSelectSession?: (id: string) => void
}

export function ScheduleView({ sessions, userData, onUpdateUserData, conflictMap, onSelectSession }: Props) {
  const [mode, setMode] = useState<'day' | 'week'>('day')
  const [selectedDay, setSelectedDay] = useState<Day>('Wed')

  // interest > 0 = scheduled
  const scheduledSessions = sessions.filter(s => (userData[s.id]?.interest ?? 0) > 0)

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => setMode('day')}
            className={mode === 'day' ? 'tab-active' : 'tab-inactive'}
          >
            Day
          </button>
          <button
            onClick={() => setMode('week')}
            className={mode === 'week' ? 'tab-active' : 'tab-inactive'}
          >
            Week
          </button>
        </div>

        {mode === 'day' && (
          <div className="flex gap-1">
            {ALL_DAYS.map(d => {
              const count = scheduledSessions.filter(s => s.day === d).length
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`text-xs px-2 py-1 rounded-md transition-colors relative ${
                    selectedDay === d
                      ? 'bg-gdc-accent text-white'
                      : count > 0
                      ? 'text-gdc-textMuted hover:text-gdc-text hover:bg-gdc-surfaceHover'
                      : 'text-gdc-border'
                  }`}
                >
                  {d}
                  {count > 0 && selectedDay !== d && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gdc-accent/60 text-white text-[8px] rounded-full flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {scheduledSessions.length === 0 ? (
        <div className="text-center py-12 text-gdc-textMuted">
          <p className="text-lg mb-1">No sessions starred yet</p>
          <p className="text-sm">Star sessions in Browse or Swipe to build your schedule</p>
        </div>
      ) : mode === 'day' ? (
        <DaySchedule
          day={selectedDay}
          sessions={scheduledSessions}
          userData={userData}
          onUpdateUserData={onUpdateUserData}
          conflictMap={conflictMap}
          onSelectSession={onSelectSession}
        />
      ) : (
        <WeekCalendar
          sessions={scheduledSessions}
          userData={userData}
          conflictMap={conflictMap}
          onSelectSession={onSelectSession}
        />
      )}
    </div>
  )
}
