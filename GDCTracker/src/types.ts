export type Track =
  | 'Programming'
  | 'Design'
  | 'Visual Arts'
  | 'Audio'
  | 'Production'
  | 'Business'
  | 'AI Summit'
  | 'Indie Summit'
  | 'Advocacy'
  | 'XR Summit'
  | 'Career Development'
  | 'Game Narrative'

export type SessionFormat =
  | 'Lecture'
  | 'Panel'
  | 'Workshop'
  | 'Roundtable'
  | 'Fireside Chat'
  | 'Postmortem'
  | 'Tutorial'
  | 'Micro Talk'

export type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'

export interface Session {
  id: string
  title: string
  description: string
  speakers: string[]
  track: Track
  format: SessionFormat
  day: Day
  startTime: string // "HH:MM" 24h
  endTime: string   // "HH:MM" 24h
  room: string
  tags: string[]
}

export type InterestLevel = 0 | 1 | 2 | 3

export interface UserSessionData {
  interest: InterestLevel
  scheduled: boolean
  notes: string
}

export interface AppState {
  sessions: Session[]
  userData: Record<string, UserSessionData>
  filters: FilterState
  view: ViewMode
  selectedDay: Day
}

export interface FilterState {
  search: string
  tracks: Track[]
  formats: SessionFormat[]
  days: Day[]
  interestMin: InterestLevel
  scheduledOnly: boolean
  hideConflicts: boolean
  timeRange: { start: string; end: string } | null
}

export type ViewMode = 'browse' | 'schedule' | 'calendar' | 'claude'

export const TRACK_COLORS: Record<Track, string> = {
  'Programming': 'bg-blue-500/20 text-blue-400 border-blue-500',
  'Design': 'bg-purple-500/20 text-purple-400 border-purple-500',
  'Visual Arts': 'bg-pink-500/20 text-pink-400 border-pink-500',
  'Audio': 'bg-green-500/20 text-green-400 border-green-500',
  'Production': 'bg-orange-500/20 text-orange-400 border-orange-500',
  'Business': 'bg-cyan-500/20 text-cyan-400 border-cyan-500',
  'AI Summit': 'bg-red-500/20 text-red-400 border-red-500',
  'Indie Summit': 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  'Advocacy': 'bg-teal-500/20 text-teal-400 border-teal-500',
  'XR Summit': 'bg-violet-500/20 text-violet-400 border-violet-500',
  'Career Development': 'bg-amber-500/20 text-amber-400 border-amber-500',
  'Game Narrative': 'bg-rose-500/20 text-rose-400 border-rose-500',
}

export const DAY_LABELS: Record<Day, string> = {
  'Mon': 'Monday 3/16',
  'Tue': 'Tuesday 3/17',
  'Wed': 'Wednesday 3/18',
  'Thu': 'Thursday 3/19',
  'Fri': 'Friday 3/20',
}

export const ALL_TRACKS: Track[] = [
  'Programming', 'Design', 'Visual Arts', 'Audio', 'Production',
  'Business', 'AI Summit', 'Indie Summit', 'Advocacy', 'XR Summit',
  'Career Development', 'Game Narrative',
]

export const ALL_FORMATS: SessionFormat[] = [
  'Lecture', 'Panel', 'Workshop', 'Roundtable', 'Fireside Chat',
  'Postmortem', 'Tutorial', 'Micro Talk',
]

export const ALL_DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
