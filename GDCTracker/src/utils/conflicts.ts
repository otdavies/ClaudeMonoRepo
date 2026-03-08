import { Session } from '../types'

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function sessionsOverlap(a: Session, b: Session): boolean {
  if (a.day !== b.day) return false
  const aStart = timeToMinutes(a.startTime)
  const aEnd = timeToMinutes(a.endTime)
  const bStart = timeToMinutes(b.startTime)
  const bEnd = timeToMinutes(b.endTime)
  return aStart < bEnd && bStart < aEnd
}

export function getConflicts(session: Session, scheduled: Session[]): Session[] {
  return scheduled.filter(s => s.id !== session.id && sessionsOverlap(session, s))
}

export function getScheduleConflicts(scheduled: Session[]): Map<string, string[]> {
  const conflicts = new Map<string, string[]>()
  for (let i = 0; i < scheduled.length; i++) {
    for (let j = i + 1; j < scheduled.length; j++) {
      if (sessionsOverlap(scheduled[i], scheduled[j])) {
        const ai = conflicts.get(scheduled[i].id) ?? []
        ai.push(scheduled[j].id)
        conflicts.set(scheduled[i].id, ai)
        const bi = conflicts.get(scheduled[j].id) ?? []
        bi.push(scheduled[i].id)
        conflicts.set(scheduled[j].id, bi)
      }
    }
  }
  return conflicts
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} - ${formatTime(end)}`
}

export function getDurationMinutes(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start)
}
