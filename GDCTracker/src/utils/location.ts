import { Session } from '../types'
import { timeToMinutes } from './conflicts'

// Moscone Center room location model
// West Hall: rooms 2xxx (Level 2), 3xxx (Level 3), "Level 1" areas
// South Hall: rooms 2xx (lower), 3xx (upper), named stages/lobbies
// North Hall: "North Hall" main stage area
// Commons: "GDC Commons" areas (adjacent to South Hall)
// Offsite: YBCA, Metreon, Yerba Buena Gardens, Oracle Park, etc.

type Building = 'west' | 'south' | 'north' | 'commons' | 'offsite'

interface RoomLocation {
  building: Building
  floor: number    // 1, 2, 3 within building
  roomNum: number  // parsed room number, 0 if named room
}

function parseRoom(room: string): RoomLocation {
  const lower = room.toLowerCase()

  // Offsite venues
  if (lower.includes('ybca') || lower.includes('metreon') ||
      lower.includes('yerba buena') || lower.includes('oracle park')) {
    return { building: 'offsite', floor: 1, roomNum: 0 }
  }

  // GDC Commons
  if (lower.includes('commons')) {
    return { building: 'commons', floor: 1, roomNum: 0 }
  }

  // North Hall
  if (lower.includes('north')) {
    return { building: 'north', floor: 1, roomNum: 0 }
  }

  // West Hall — room numbers 2xxx (Level 2) and 3xxx (Level 3)
  if (lower.includes('west')) {
    const numMatch = room.match(/\b([23]\d{3})\b/)
    if (numMatch) {
      const num = parseInt(numMatch[1])
      return { building: 'west', floor: Math.floor(num / 1000), roomNum: num }
    }
    if (lower.includes('level 3')) return { building: 'west', floor: 3, roomNum: 0 }
    if (lower.includes('level 1')) return { building: 'west', floor: 1, roomNum: 0 }
    return { building: 'west', floor: 2, roomNum: 0 }
  }

  // South Hall — room numbers 1xx-3xx, or named stages
  if (lower.includes('south') || lower.includes('esplanade') ||
      lower.includes('festival') || lower.includes('booth') ||
      lower.includes('monetization') || lower.includes('indie') ||
      lower.includes('international') || lower.includes('future tech')) {
    const numMatch = room.match(/\b([123]\d{2})\b/)
    if (numMatch) {
      const num = parseInt(numMatch[1])
      const floor = Math.floor(num / 100)
      return { building: 'south', floor, roomNum: num }
    }
    // Named stages are ground/lobby level
    return { building: 'south', floor: 1, roomNum: 0 }
  }

  // Fallback: try to infer from bare room numbers
  const bareNum = room.match(/\b([23]\d{3})\b/)
  if (bareNum) {
    const num = parseInt(bareNum[1])
    return { building: 'west', floor: Math.floor(num / 1000), roomNum: num }
  }
  const southNum = room.match(/\b([123]\d{2})\b/)
  if (southNum) {
    const num = parseInt(southNum[1])
    return { building: 'south', floor: Math.floor(num / 100), roomNum: num }
  }

  return { building: 'offsite', floor: 1, roomNum: 0 }
}

// Walk time between buildings (minutes)
const BUILDING_WALK: Record<string, number> = {
  'commons-south': 2,
  'north-south': 7,
  'commons-north': 8,
  'south-west': 8,
  'commons-west': 9,
  'north-west': 12,
  'commons-offsite': 15,
  'north-offsite': 15,
  'south-offsite': 15,
  'west-offsite': 15,
}

function getBuildingWalkTime(a: Building, b: Building): number {
  if (a === b) return 0
  const key = [a, b].sort().join('-')
  return BUILDING_WALK[key] ?? 10
}

/**
 * Estimate walk time in minutes between two rooms.
 * Layers: same-floor-nearby (1) < same-floor-far (3) < different-floor (4) < different-building (7-15)
 */
function estimateWalkTime(a: RoomLocation, b: RoomLocation): number {
  // Different buildings
  if (a.building !== b.building) {
    return getBuildingWalkTime(a.building, b.building)
  }

  // Same building, different floor
  if (a.floor !== b.floor) {
    return 4
  }

  // Same building, same floor
  if (a.roomNum > 0 && b.roomNum > 0) {
    const dist = Math.abs(a.roomNum - b.roomNum)
    if (dist <= 5) return 1   // adjacent rooms
    if (dist <= 15) return 2  // nearby on same floor
    return 3                  // far ends of same floor
  }

  // Same floor, but one or both are named rooms — assume moderate walk
  return 2
}

export interface WalkWarning {
  fromSession: Session
  toSession: Session
  walkMinutes: number
  gapMinutes: number
  tight: boolean
}

interface ChoiceSlot {
  sessions: Session[]
  startTime: string
  endTime: string
}

/**
 * Group overlapping sessions into "choice slots" — you only attend one per slot.
 */
function groupIntoSlots(sorted: Session[]): ChoiceSlot[] {
  const slots: ChoiceSlot[] = []
  for (const s of sorted) {
    const last = slots[slots.length - 1]
    if (last && timeToMinutes(s.startTime) < timeToMinutes(last.endTime)) {
      last.sessions.push(s)
      if (s.endTime > last.endTime) last.endTime = s.endTime
    } else {
      slots.push({ sessions: [s], startTime: s.startTime, endTime: s.endTime })
    }
  }
  return slots
}

/**
 * Pick representative session for a choice slot — the one you'll most likely attend.
 * Highest interest wins; ties broken by earliest start.
 */
function slotRepresentative(slot: ChoiceSlot, userData?: Record<string, { interest?: number }>): Session {
  if (slot.sessions.length === 1) return slot.sessions[0]
  return [...slot.sessions].sort((a, b) => {
    const ai = userData?.[a.id]?.interest ?? 0
    const bi = userData?.[b.id]?.interest ?? 0
    if (bi !== ai) return bi - ai
    return a.startTime.localeCompare(b.startTime)
  })[0]
}

/**
 * Check transitions between non-overlapping session groups for tight walks.
 * Overlapping sessions are choices (you attend one), not sequential commitments.
 * Uses highest-starred session per group as the likely pick for distance.
 */
export function getWalkWarnings(
  starredSessions: Session[],
  userData?: Record<string, { interest?: number }>
): WalkWarning[] {
  const warnings: WalkWarning[] = []

  const byDay = new Map<string, Session[]>()
  for (const s of starredSessions) {
    if (!byDay.has(s.day)) byDay.set(s.day, [])
    byDay.get(s.day)!.push(s)
  }

  for (const [, daySessions] of byDay) {
    const sorted = [...daySessions].sort((a, b) => a.startTime.localeCompare(b.startTime))
    const slots = groupIntoSlots(sorted)

    for (let i = 0; i < slots.length - 1; i++) {
      const fromSlot = slots[i]
      const toSlot = slots[i + 1]

      const fromSession = slotRepresentative(fromSlot, userData)
      const toSession = slotRepresentative(toSlot, userData)

      const walkTime = estimateWalkTime(parseRoom(fromSession.room), parseRoom(toSession.room))
      if (walkTime <= 1) continue

      const gapMinutes = timeToMinutes(toSlot.startTime) - timeToMinutes(fromSlot.endTime)

      if (gapMinutes < walkTime + 3) {
        warnings.push({
          fromSession,
          toSession,
          walkMinutes: walkTime,
          gapMinutes: Math.max(0, gapMinutes),
          tight: gapMinutes < walkTime,
        })
      }
    }
  }

  return warnings
}

/** Get walk time in minutes between two rooms (granular). */
export function getWalkTimeBetweenRooms(roomA: string, roomB: string): number {
  return estimateWalkTime(parseRoom(roomA), parseRoom(roomB))
}

/** Get a descriptive zone label for display */
export function getZoneLabel(room: string): string {
  const loc = parseRoom(room)
  switch (loc.building) {
    case 'west':
      if (loc.floor === 3) return 'West L3'
      if (loc.floor === 1) return 'West L1'
      return 'West L2'
    case 'south':
      if (loc.floor === 3) return 'South 300s'
      if (loc.floor === 2) return 'South 200s'
      return 'South Hall'
    case 'north': return 'North Hall'
    case 'commons': return 'Commons'
    case 'offsite': return 'Offsite'
  }
}
