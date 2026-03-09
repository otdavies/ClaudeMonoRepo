import { useEffect, useCallback, useRef } from 'react'
import { Session, UserSessionData } from '../types'
import { formatTime } from '../utils/conflicts'

// GDC 2026 dates: Mon 3/9 - Fri 3/13
const DAY_TO_DATE: Record<string, number> = {
  Mon: 9, Tue: 10, Wed: 11, Thu: 12, Fri: 13,
}

const REMINDER_MINUTES = 10

function getSessionDate(session: Session): Date | null {
  const dateNum = DAY_TO_DATE[session.day]
  if (!dateNum) return null
  const [h, m] = session.startTime.split(':').map(Number)
  return new Date(2026, 2, dateNum, h, m, 0) // month is 0-indexed
}

export function useNotifications(
  sessions: Session[],
  userData: Record<string, UserSessionData>,
) {
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    const result = await Notification.requestPermission()
    return result === 'granted'
  }, [])

  // Schedule notifications for starred sessions
  useEffect(() => {
    // Clear previous timers
    for (const t of timersRef.current) clearTimeout(t)
    timersRef.current = []

    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const now = Date.now()
    const starredSessions = sessions.filter(s => (userData[s.id]?.interest ?? 0) > 0)

    for (const session of starredSessions) {
      const sessionDate = getSessionDate(session)
      if (!sessionDate) continue

      const reminderTime = sessionDate.getTime() - REMINDER_MINUTES * 60 * 1000
      const delay = reminderTime - now

      if (delay > 0 && delay < 7 * 24 * 60 * 60 * 1000) { // within a week
        const timer = setTimeout(() => {
          const interest = userData[session.id]?.interest ?? 0
          const interestLabel = ['', 'Maybe', 'Want', 'MUST'][interest]
          new Notification(`${session.title}`, {
            body: `Starts in ${REMINDER_MINUTES} min at ${formatTime(session.startTime)} in ${session.room}\n${interestLabel} | ${session.track}`,
            tag: session.id,
            icon: '/GDC/pwa-192x192.svg',
          })
        }, delay)
        timersRef.current.push(timer)
      }
    }

    return () => {
      for (const t of timersRef.current) clearTimeout(t)
      timersRef.current = []
    }
  }, [sessions, userData])

  return { requestPermission }
}
