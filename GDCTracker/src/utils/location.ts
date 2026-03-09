import { Session } from '../types'
import { timeToMinutes } from './conflicts'

// GDC venue zones — Moscone Center buildings are spread across multiple blocks
type Zone = 'west' | 'south' | 'north' | 'offsite'

// Walking time in minutes between zones
const WALK_TIMES: Record<string, number> = {
  'west-south': 8,
  'west-north': 12,
  'south-north': 7,
  'west-offsite': 15,
  'south-offsite': 15,
  'north-offsite': 15,
}

function getZone(room: string): Zone {
  const lower = room.toLowerCase()
  if (lower.includes('west')) return 'west'
  if (lower.includes('south')) return 'south'
  if (lower.includes('north')) return 'north'
  return 'offsite'
}

function getWalkTime(zoneA: Zone, zoneB: Zone): number {
  if (zoneA === zoneB) return 0
  const key = [zoneA, zoneB].sort().join('-')
  return WALK_TIMES[key] ?? 10
}

export interface WalkWarning {
  fromSession: Session
  toSession: Session
  walkMinutes: number
  gapMinutes: number
  tight: boolean // walk time > gap between sessions
}

/**
 * Check consecutive starred sessions for tight transitions between buildings.
 * Returns warnings for any pair where the gap between sessions is tight
 * relative to walking distance.
 */
export function getWalkWarnings(starredSessions: Session[]): WalkWarning[] {
  const warnings: WalkWarning[] = []

  // Group by day, sort by start time
  const byDay = new Map<string, Session[]>()
  for (const s of starredSessions) {
    if (!byDay.has(s.day)) byDay.set(s.day, [])
    byDay.get(s.day)!.push(s)
  }

  for (const [, daySessions] of byDay) {
    const sorted = daySessions.sort((a, b) => a.startTime.localeCompare(b.startTime))

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i]
      const next = sorted[i + 1]

      const zoneA = getZone(current.room)
      const zoneB = getZone(next.room)
      const walkTime = getWalkTime(zoneA, zoneB)

      if (walkTime === 0) continue // same building, no warning

      const gapMinutes = timeToMinutes(next.startTime) - timeToMinutes(current.endTime)

      // Only warn if gap is less than walk time + 5 min buffer
      if (gapMinutes < walkTime + 5) {
        warnings.push({
          fromSession: current,
          toSession: next,
          walkMinutes: walkTime,
          gapMinutes: Math.max(0, gapMinutes),
          tight: gapMinutes < walkTime,
        })
      }
    }
  }

  return warnings
}

/** Get walk time in minutes between two rooms. 0 = same building. */
export function getWalkTimeBetweenRooms(roomA: string, roomB: string): number {
  return getWalkTime(getZone(roomA), getZone(roomB))
}

/** Get a short zone label for display */
export function getZoneLabel(room: string): string {
  const zone = getZone(room)
  switch (zone) {
    case 'west': return 'West Hall'
    case 'south': return 'South Hall'
    case 'north': return 'North Hall'
    case 'offsite': return 'Offsite'
  }
}
