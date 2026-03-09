import { useState } from 'react'
import { Session, UserSessionData, Day, ALL_DAYS } from '../types'
import { DaySchedule } from './DaySchedule'
import { WeekCalendar } from './WeekCalendar'
import { AttendeeInfo } from '../hooks/useAttendance'

interface Props {
  sessions: Session[]
  userData: Record<string, UserSessionData>
  onUpdateUserData: (id: string, data: Partial<UserSessionData>) => void
  conflictMap: Map<string, string[]>
  onSelectSession?: (id: string) => void
  getAttendees?: (sessionId: string) => AttendeeInfo[]
  getAllAttendees?: (sessionId: string) => AttendeeInfo[]
}

function getClosestDay(): Day {
  const dayOfWeek = new Date().getDay() // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const map: Record<number, Day> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' }
  return map[dayOfWeek] ?? 'Mon'
}

export function ScheduleView({ sessions, userData, onUpdateUserData, conflictMap, onSelectSession, getAttendees, getAllAttendees }: Props) {
  const [mode, setMode] = useState<'day' | 'week'>('day')
  const [selectedDay, setSelectedDay] = useState<Day>(getClosestDay)

  // interest > 0 = starred, picked = attending
  const scheduledSessions = sessions.filter(s => (userData[s.id]?.interest ?? 0) > 0)
  const pickedCount = sessions.filter(s => userData[s.id]?.picked).length

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
              const count = sessions.filter(s => s.day === d && userData[s.id]?.picked).length
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`text-xs px-2 py-1 rounded-md transition-colors relative ${
                    selectedDay === d
                      ? 'bg-gdc-accent text-white'
                      : count > 0
                      ? 'text-gdc-textMuted hover:text-gdc-text hover:bg-gdc-surfaceHover'
                      : 'text-gdc-textMuted/50'
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

      {pickedCount === 0 ? (
        <div className="text-center py-12 text-gdc-textMuted">
          <p className="text-lg mb-1">No sessions picked yet</p>
          <p className="text-sm">Pick sessions to attend in the Decide tab</p>
        </div>
      ) : mode === 'day' ? (
        <DaySchedule
          day={selectedDay}
          sessions={scheduledSessions}
          userData={userData}
          onUpdateUserData={onUpdateUserData}
          conflictMap={conflictMap}
          onSelectSession={onSelectSession}
          getAttendees={getAttendees}
          getAllAttendees={getAllAttendees}
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
