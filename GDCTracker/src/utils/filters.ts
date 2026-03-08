import { Session, FilterState } from '../types'

export function applyFilters(sessions: Session[], filters: FilterState): Session[] {
  return sessions.filter(s => {
    // Text search across title, description, speakers, tags
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const searchable = [
        s.title,
        s.description,
        ...s.speakers,
        ...s.tags,
        s.track,
        s.format,
      ].join(' ').toLowerCase()
      // Support multiple keywords separated by spaces (all must match)
      const keywords = q.split(/\s+/).filter(Boolean)
      if (!keywords.every(kw => searchable.includes(kw))) return false
    }

    if (filters.tracks.length > 0 && !filters.tracks.includes(s.track)) return false
    if (filters.formats.length > 0 && !filters.formats.includes(s.format)) return false
    if (filters.days.length > 0 && !filters.days.includes(s.day)) return false

    if (filters.timeRange) {
      if (s.startTime === 'TBD' || s.endTime === 'TBD') return false
      if (s.startTime < filters.timeRange.start || s.endTime > filters.timeRange.end) return false
    }

    return true
  })
}

export function sortSessions(sessions: Session[], sortBy: 'time' | 'track' | 'interest', userData: Record<string, { interest: number }>): Session[] {
  const dayOrder: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, TBD: 5 }
  return [...sessions].sort((a, b) => {
    if (sortBy === 'interest') {
      const ia = userData[a.id]?.interest ?? 0
      const ib = userData[b.id]?.interest ?? 0
      if (ib !== ia) return ib - ia
    }
    if (sortBy === 'track') {
      const tc = a.track.localeCompare(b.track)
      if (tc !== 0) return tc
    }
    // Default secondary sort: day then time
    const dayDiff = dayOrder[a.day] - dayOrder[b.day]
    if (dayDiff !== 0) return dayDiff
    return a.startTime.localeCompare(b.startTime)
  })
}
