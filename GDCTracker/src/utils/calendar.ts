import { Session, Day } from '../types'

const DAY_DATES: Record<Day, string> = {
  Mon: '20260309',
  Tue: '20260310',
  Wed: '20260311',
  Thu: '20260312',
  Fri: '20260313',
  TBD: '20260309', // Fallback for unscheduled sessions
}

function toICSDateTime(day: Day, time: string): string {
  const date = DAY_DATES[day]
  const [h, m] = time.split(':')
  return `${date}T${h}${m}00`
}

function escapeICS(text: string): string {
  return text.replace(/[\\;,]/g, c => `\\${c}`).replace(/\n/g, '\\n')
}

function generateUID(session: Session): string {
  return `${session.id}@gdctracker2026`
}

export function generateICS(sessions: Session[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GDC Tracker 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:GDC 2026 Schedule',
    'X-WR-TIMEZONE:America/Los_Angeles',
    // VTIMEZONE for PST/PDT
    'BEGIN:VTIMEZONE',
    'TZID:America/Los_Angeles',
    'BEGIN:STANDARD',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'TZOFFSETFROM:-0700',
    'TZOFFSETTO:-0800',
    'TZNAME:PST',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'TZOFFSETFROM:-0800',
    'TZOFFSETTO:-0700',
    'TZNAME:PDT',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
  ]

  // Skip sessions without confirmed day/time
  const exportable = sessions.filter(s => s.day !== 'TBD' && s.startTime !== 'TBD')
  for (const session of exportable) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${generateUID(session)}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;TZID=America/Los_Angeles:${toICSDateTime(session.day, session.startTime)}`,
      `DTEND;TZID=America/Los_Angeles:${toICSDateTime(session.day, session.endTime)}`,
      `SUMMARY:${escapeICS(session.title)}`,
      `DESCRIPTION:${escapeICS(`${session.description}\\n\\nSpeakers: ${session.speakers.join(', ')}\\nTrack: ${session.track}\\nFormat: ${session.format}`)}`,
      `LOCATION:${escapeICS(`${session.room}, Moscone Center, San Francisco`)}`,
      `CATEGORIES:${session.track}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadICS(sessions: Session[], filename = 'gdc-2026-schedule.ics') {
  const ics = generateICS(sessions)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function generateGoogleCalendarURL(session: Session): string {
  const date = DAY_DATES[session.day]
  const [sh, sm] = session.startTime.split(':')
  const [eh, em] = session.endTime.split(':')
  const start = `${date}T${sh}${sm}00`
  const end = `${date}T${eh}${em}00`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: session.title,
    dates: `${start}/${end}`,
    details: `${session.description}\n\nSpeakers: ${session.speakers.join(', ')}\nTrack: ${session.track}\nFormat: ${session.format}`,
    location: `${session.room}, Moscone Center, San Francisco`,
    ctz: 'America/Los_Angeles',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
