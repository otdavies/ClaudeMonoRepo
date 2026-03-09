export type Track =
  | 'Audio'
  | 'Business Strategy'
  | 'Career'
  | 'Culture & Sustainability'
  | 'Design'
  | 'Discovery & Marketing'
  | 'Educators'
  | 'Game & Production Technology'
  | 'Independent Development'
  | 'Luminaries'
  | 'Narrative & Performance'
  | 'Product Management'
  | 'Production'
  | 'Special Event'
  | 'Team Leadership'
  | 'Visual Development'

export type SessionFormat =
  | 'Lecture'
  | 'Panel'
  | 'Workshop'
  | 'Roundtable'
  | 'Fireside Chat'
  | 'Forum'
  | 'Keynote'
  | 'Microtalks'
  | 'Power Talk'
  | 'Special Event'
  | 'Partner Developer Summit'

export type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'TBD'

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

export type ViewMode = 'browse' | 'schedule' | 'up-next' | 'claude'

export const TRACK_COLORS: Record<Track, string> = {
  'Audio': 'bg-green-500/20 text-green-400 border-green-500',
  'Business Strategy': 'bg-cyan-500/20 text-cyan-400 border-cyan-500',
  'Career': 'bg-amber-500/20 text-amber-400 border-amber-500',
  'Culture & Sustainability': 'bg-teal-500/20 text-teal-400 border-teal-500',
  'Design': 'bg-purple-500/20 text-purple-400 border-purple-500',
  'Discovery & Marketing': 'bg-sky-500/20 text-sky-400 border-sky-500',
  'Educators': 'bg-lime-500/20 text-lime-400 border-lime-500',
  'Game & Production Technology': 'bg-blue-500/20 text-blue-400 border-blue-500',
  'Independent Development': 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  'Luminaries': 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500',
  'Narrative & Performance': 'bg-rose-500/20 text-rose-400 border-rose-500',
  'Product Management': 'bg-indigo-500/20 text-indigo-400 border-indigo-500',
  'Production': 'bg-orange-500/20 text-orange-400 border-orange-500',
  'Special Event': 'bg-red-500/20 text-red-400 border-red-500',
  'Team Leadership': 'bg-emerald-500/20 text-emerald-400 border-emerald-500',
  'Visual Development': 'bg-pink-500/20 text-pink-400 border-pink-500',
}

export const DAY_LABELS: Record<Day, string> = {
  'Mon': 'Monday 3/9',
  'Tue': 'Tuesday 3/10',
  'Wed': 'Wednesday 3/11',
  'Thu': 'Thursday 3/12',
  'Fri': 'Friday 3/13',
  'TBD': 'TBD',
}

export const ALL_TRACKS: Track[] = [
  'Audio', 'Business Strategy', 'Career', 'Culture & Sustainability',
  'Design', 'Discovery & Marketing', 'Educators',
  'Game & Production Technology', 'Independent Development', 'Luminaries',
  'Narrative & Performance', 'Product Management', 'Production',
  'Special Event', 'Team Leadership', 'Visual Development',
]

export const ALL_FORMATS: SessionFormat[] = [
  'Lecture', 'Panel', 'Workshop', 'Roundtable', 'Fireside Chat',
  'Forum', 'Keynote', 'Microtalks', 'Power Talk', 'Special Event',
  'Partner Developer Summit',
]

export const ALL_DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'TBD']
