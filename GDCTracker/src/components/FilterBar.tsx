import { useState } from 'react'
import { FilterState, Track, SessionFormat, Day, ALL_TRACKS, ALL_FORMATS, ALL_DAYS, DAY_LABELS, TRACK_COLORS, InterestLevel } from '../types'

interface Props {
  filters: FilterState
  onUpdate: (filters: FilterState) => void
  sessionCount: number
  totalCount: number
}

type SortMode = 'time' | 'track' | 'interest'

export function FilterBar({ filters, onUpdate, sessionCount, totalCount }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const toggleTrack = (t: Track) => {
    const tracks = filters.tracks.includes(t)
      ? filters.tracks.filter(x => x !== t)
      : [...filters.tracks, t]
    onUpdate({ ...filters, tracks })
  }

  const toggleFormat = (f: SessionFormat) => {
    const formats = filters.formats.includes(f)
      ? filters.formats.filter(x => x !== f)
      : [...filters.formats, f]
    onUpdate({ ...filters, formats })
  }

  const toggleDay = (d: Day) => {
    const days = filters.days.includes(d)
      ? filters.days.filter(x => x !== d)
      : [...filters.days, d]
    onUpdate({ ...filters, days })
  }

  const clearAll = () => {
    onUpdate({
      search: '',
      tracks: [],
      formats: [],
      days: [],
      interestMin: 0,
      scheduledOnly: false,
      hideConflicts: false,
      timeRange: null,
    })
  }

  const hasActiveFilters = filters.search || filters.tracks.length > 0 || filters.formats.length > 0 ||
    filters.days.length > 0 || filters.interestMin > 0 || filters.scheduledOnly || filters.timeRange

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gdc-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path d="m21 21-4.35-4.35" strokeWidth="2" />
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={e => onUpdate({ ...filters, search: e.target.value })}
            placeholder="Search sessions, speakers, tags..."
            className="input pl-9"
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`btn-ghost flex items-center gap-1 ${showAdvanced ? 'text-gdc-accent' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" d="M3 4h18M3 12h12M3 20h6" />
          </svg>
          <span className="hidden sm:inline">Filters</span>
        </button>
        {hasActiveFilters && (
          <button onClick={clearAll} className="btn-ghost text-gdc-danger">
            Clear
          </button>
        )}
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between text-xs text-gdc-textMuted">
        <span>
          {sessionCount === totalCount
            ? `${totalCount} sessions`
            : `${sessionCount} of ${totalCount} sessions`}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.scheduledOnly}
              onChange={e => onUpdate({ ...filters, scheduledOnly: e.target.checked })}
              className="rounded border-gdc-border bg-gdc-surface text-gdc-accent focus:ring-gdc-accent"
            />
            <span>Scheduled only</span>
          </label>
        </div>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="card p-3 space-y-3">
          {/* Days */}
          <div>
            <label className="text-xs font-medium text-gdc-textMuted mb-1 block">Days</label>
            <div className="flex flex-wrap gap-1">
              {ALL_DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    filters.days.includes(d)
                      ? 'bg-gdc-accent text-white'
                      : 'bg-gdc-bg text-gdc-textMuted hover:text-gdc-text'
                  }`}
                >
                  {DAY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Tracks */}
          <div>
            <label className="text-xs font-medium text-gdc-textMuted mb-1 block">Tracks</label>
            <div className="flex flex-wrap gap-1">
              {ALL_TRACKS.map(t => (
                <button
                  key={t}
                  onClick={() => toggleTrack(t)}
                  className={`track-badge transition-opacity cursor-pointer ${TRACK_COLORS[t]} ${
                    filters.tracks.length > 0 && !filters.tracks.includes(t) ? 'opacity-30' : ''
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Formats */}
          <div>
            <label className="text-xs font-medium text-gdc-textMuted mb-1 block">Format</label>
            <div className="flex flex-wrap gap-1">
              {ALL_FORMATS.map(f => (
                <button
                  key={f}
                  onClick={() => toggleFormat(f)}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    filters.formats.includes(f)
                      ? 'bg-gdc-accent text-white'
                      : 'bg-gdc-bg text-gdc-textMuted hover:text-gdc-text'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Interest filter */}
          <div>
            <label className="text-xs font-medium text-gdc-textMuted mb-1 block">Minimum Interest</label>
            <div className="flex gap-1">
              {([0, 1, 2, 3] as const).map(n => (
                <button
                  key={n}
                  onClick={() => onUpdate({ ...filters, interestMin: n as InterestLevel })}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    filters.interestMin === n
                      ? 'bg-gdc-accent text-white'
                      : 'bg-gdc-bg text-gdc-textMuted hover:text-gdc-text'
                  }`}
                >
                  {n === 0 ? 'All' : n === 1 ? 'Maybe+' : n === 2 ? 'Want+' : 'Must'}
                </button>
              ))}
            </div>
          </div>

          {/* Time range */}
          <div>
            <label className="text-xs font-medium text-gdc-textMuted mb-1 block">Time Range</label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={filters.timeRange?.start ?? '09:00'}
                onChange={e => onUpdate({
                  ...filters,
                  timeRange: { start: e.target.value, end: filters.timeRange?.end ?? '18:00' }
                })}
                className="input w-auto text-xs"
              />
              <span className="text-gdc-textMuted text-xs">to</span>
              <input
                type="time"
                value={filters.timeRange?.end ?? '18:00'}
                onChange={e => onUpdate({
                  ...filters,
                  timeRange: { start: filters.timeRange?.start ?? '09:00', end: e.target.value }
                })}
                className="input w-auto text-xs"
              />
              {filters.timeRange && (
                <button
                  onClick={() => onUpdate({ ...filters, timeRange: null })}
                  className="text-xs text-gdc-danger hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function SortControl({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-gdc-textMuted">Sort:</span>
      {(['time', 'track', 'interest'] as const).map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={value === s ? 'tab-active text-xs px-2 py-1' : 'tab-inactive text-xs px-2 py-1'}
        >
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </button>
      ))}
    </div>
  )
}
