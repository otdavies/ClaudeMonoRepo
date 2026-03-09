import { useState, useEffect, useCallback, useRef } from 'react'
import { UserProfile } from './useProfile'

export interface AttendeeInfo {
  userId: string
  name: string
  color: string
}

// Map of userId → their attendance data
interface AttendanceStore {
  [userId: string]: {
    name: string
    color: string
    sessions: string[] // picked session IDs
    updatedAt: number
  }
}

const STORAGE_KEY = 'gdc2026-attendance'
const SYNC_INTERVAL = 60_000 // sync every 60s when online

// Configure this URL to enable multi-user sync.
// Leave empty for local-only mode.
// Example: a simple JSON API, serverless function, etc.
const SYNC_URL = ''

function loadCached(): AttendanceStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveCached(data: AttendanceStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* quota */ }
}

export function useAttendance(profile: UserProfile | null, pickedSessionIds: string[]) {
  const [attendance, setAttendance] = useState<AttendanceStore>(loadCached)
  const syncTimerRef = useRef<ReturnType<typeof setInterval>>()
  const lastPublishedRef = useRef<string>('')

  // Publish local user's picks to the store
  useEffect(() => {
    if (!profile) return
    const key = JSON.stringify(pickedSessionIds)
    if (key === lastPublishedRef.current) return
    lastPublishedRef.current = key

    setAttendance(prev => {
      const next = {
        ...prev,
        [profile.id]: {
          name: profile.name,
          color: profile.color,
          sessions: pickedSessionIds,
          updatedAt: Date.now(),
        },
      }
      saveCached(next)
      return next
    })
  }, [profile, pickedSessionIds])

  // Sync with remote (if configured)
  const syncWithRemote = useCallback(async () => {
    if (!SYNC_URL || !profile) return

    try {
      // Push our data
      await fetch(`${SYNC_URL}/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          color: profile.color,
          sessions: pickedSessionIds,
          updatedAt: Date.now(),
        }),
      })

      // Pull everyone's data
      const res = await fetch(SYNC_URL)
      if (res.ok) {
        const remote: AttendanceStore = await res.json()
        setAttendance(prev => {
          // Merge: keep whichever is newer per user
          const merged = { ...prev }
          for (const [uid, data] of Object.entries(remote)) {
            if (!merged[uid] || data.updatedAt > (merged[uid].updatedAt ?? 0)) {
              merged[uid] = data
            }
          }
          saveCached(merged)
          return merged
        })
      }
    } catch {
      // Network error — that's fine, we'll retry later
    }
  }, [profile, pickedSessionIds])

  // Periodic sync
  useEffect(() => {
    if (!SYNC_URL) return
    syncWithRemote()
    syncTimerRef.current = setInterval(syncWithRemote, SYNC_INTERVAL)
    return () => clearInterval(syncTimerRef.current)
  }, [syncWithRemote])

  // Sync when coming back online
  useEffect(() => {
    if (!SYNC_URL) return
    const handler = () => syncWithRemote()
    window.addEventListener('online', handler)
    return () => window.removeEventListener('online', handler)
  }, [syncWithRemote])

  // Get attendees for a specific session (excluding current user)
  const getAttendees = useCallback((sessionId: string): AttendeeInfo[] => {
    const result: AttendeeInfo[] = []
    for (const [userId, data] of Object.entries(attendance)) {
      if (userId === profile?.id) continue
      if (data.sessions.includes(sessionId)) {
        result.push({ userId, name: data.name, color: data.color })
      }
    }
    return result
  }, [attendance, profile?.id])

  // Get all attendees (including current user) for color gradient
  const getAllAttendees = useCallback((sessionId: string): AttendeeInfo[] => {
    const result: AttendeeInfo[] = []
    for (const [userId, data] of Object.entries(attendance)) {
      if (data.sessions.includes(sessionId)) {
        result.push({ userId, name: data.name, color: data.color })
      }
    }
    return result
  }, [attendance])

  return { getAttendees, getAllAttendees, syncWithRemote }
}
