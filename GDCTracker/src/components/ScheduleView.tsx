import { useState } from 'react'
import { Session, UserSessionData, Day, ALL_DAYS } from '../types'
import { DaySchedule } from './DaySchedule'
import { WeekCalendar } from './WeekCalendar'
import { downloadICS } from '../utils/calendar'

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
            {ALL_DAYS.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  selectedDay === d
                    ? 'bg-gdc-accent text-white'
                    : 'text-gdc-textMuted hover:text-gdc-text hover:bg-gdc-surfaceHover'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      {scheduledSessions.length === 0 ? (
        <div className="text-center py-12 text-gdc-textMuted">
          <p className="text-lg mb-1">No sessions starred yet</p>
          <p className="text-sm">Star sessions in Browse to add them to your schedule</p>
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

      {/* Export controls */}
      {scheduledSessions.length > 0 && (
        <div className="flex gap-2 pt-2 border-t border-gdc-border">
          <button
            onClick={() => downloadICS(scheduledSessions)}
            className="btn-primary flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export All to .ics
          </button>
          <span className="text-xs text-gdc-textMuted self-center">
            Import into Google Calendar, Outlook, or Apple Calendar
          </span>
        </div>
      )}
    </div>
  )
}
