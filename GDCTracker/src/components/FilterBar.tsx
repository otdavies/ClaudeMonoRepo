import { useState } from 'react'
import { FilterState, Track, SessionFormat, Day, ALL_TRACKS, ALL_FORMATS, ALL_DAYS, DAY_LABELS, TRACK_COLORS, InterestLevel } from '../types'
import type { BrowseMode } from './SessionList'

interface Props {
  filters: FilterState
  onUpdate: (filters: FilterState) => void
  sessionCount: number
  totalCount: number
  browseMode: BrowseMode
  swipeActive: boolean
  onBrowseModeChange: (v: BrowseMode) => void
  onSwipeChange: (on: boolean) => void
}

// --- Toggle component ---
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="toggle-switch"
        data-checked={String(checked)}
      >
        <span className="toggle-knob" />
      </button>
      <span className="text-[11px] text-gdc-textMuted">{label}</span>
    </label>
  )
}

export function FilterBar({ filters, onUpdate, sessionCount, totalCount, browseMode, swipeActive, onBrowseModeChange, onSwipeChange }: Props) {
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

  const activeFilterCount = [
    filters.tracks.length > 0,
    filters.formats.length > 0,
    filters.days.length > 0,
    filters.interestMin > 0,
    filters.scheduledOnly,
    filters.timeRange != null,
  ].filter(Boolean).length

  return (
    <div className="space-y-2">
      {/* Top bar: view modes + session count */}
      <div className="flex items-center justify-between gap-2">
        <BrowseModeControl
          value={browseMode}
          swipeActive={swipeActive}
          onChange={onBrowseModeChange}
          onSwipe={onSwipeChange}
        />
        <span className="text-[10px] text-gdc-textMuted/60 tabular-nums shrink-0">
          {sessionCount === totalCount
            ? `${totalCount} sessions`
            : `${sessionCount} / ${totalCount}`}
        </span>
      </div>

      {/* Search + filter controls */}
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gdc-textMuted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path d="m21 21-4.35-4.35" strokeWidth="2" />
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={e => onUpdate({ ...filters, search: e.target.value })}
            placeholder="Search sessions, speakers..."
            className="input pl-8 py-1.5 text-xs"
          />
          {filters.search && (
            <button
              onClick={() => onUpdate({ ...filters, search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gdc-textMuted/50 hover:text-gdc-text"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 border ${
            showAdvanced
              ? 'bg-gdc-accent/10 text-gdc-accent border-gdc-accent/30'
              : 'text-gdc-textMuted border-gdc-border/40 hover:text-gdc-text hover:border-gdc-border/60'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          {activeFilterCount > 0 && (
            <span className="min-w-[14px] h-3.5 bg-gdc-accent/20 text-gdc-accent text-[9px] rounded-full flex items-center justify-center font-medium">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Quick toggles row */}
      <div className="flex items-center gap-3">
        <Toggle
          checked={filters.scheduledOnly}
          onChange={checked => onUpdate({ ...filters, scheduledOnly: checked })}
          label="Starred only"
        />
        {hasActiveFilters && (
          <button onClick={clearAll} className="text-[10px] text-gdc-danger/70 hover:text-gdc-danger transition-colors ml-auto">
            Clear filters
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="card p-3 space-y-3">
          {/* Days */}
          <FilterSection label="Days">
            <div className="flex flex-wrap gap-1">
              {ALL_DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={filters.days.includes(d) ? 'pill-active' : 'pill-inactive'}
                >
                  {DAY_LABELS[d]}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Tracks */}
          <FilterSection label="Tracks">
            <div className="flex flex-wrap gap-1">
              {ALL_TRACKS.map(t => (
                <button
                  key={t}
                  onClick={() => toggleTrack(t)}
                  className={`track-badge transition-all duration-150 cursor-pointer ${TRACK_COLORS[t]} ${
                    filters.tracks.length > 0 && !filters.tracks.includes(t) ? 'opacity-25 scale-95' : ''
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Formats */}
          <FilterSection label="Format">
            <div className="flex flex-wrap gap-1">
              {ALL_FORMATS.map(f => (
                <button
                  key={f}
                  onClick={() => toggleFormat(f)}
                  className={filters.formats.includes(f) ? 'pill-active' : 'pill-inactive'}
                >
                  {f}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Interest filter */}
          <FilterSection label="Minimum Interest">
            <div className="flex gap-1">
              {([0, 1, 2, 3] as const).map(n => (
                <button
                  key={n}
                  onClick={() => onUpdate({ ...filters, interestMin: n as InterestLevel })}
                  className={filters.interestMin === n ? 'pill-active' : 'pill-inactive'}
                >
                  {n === 0 ? 'All' : n === 1 ? 'Maybe+' : n === 2 ? 'Want+' : 'Must'}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Time range */}
          <FilterSection label="Time Range">
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={filters.timeRange?.start ?? '09:00'}
                onChange={e => onUpdate({
                  ...filters,
                  timeRange: { start: e.target.value, end: filters.timeRange?.end ?? '18:00' }
                })}
                className="input w-auto text-[11px] py-1 px-2"
              />
              <span className="text-gdc-textMuted/50 text-[10px]">to</span>
              <input
                type="time"
                value={filters.timeRange?.end ?? '18:00'}
                onChange={e => onUpdate({
                  ...filters,
                  timeRange: { start: filters.timeRange?.start ?? '09:00', end: e.target.value }
                })}
                className="input w-auto text-[11px] py-1 px-2"
              />
              {filters.timeRange && (
                <button
                  onClick={() => onUpdate({ ...filters, timeRange: null })}
                  className="text-[10px] text-gdc-danger/70 hover:text-gdc-danger transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </FilterSection>
        </div>
      )}
    </div>
  )
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-gdc-textMuted/60 uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

// --- Browse mode tabs ---

type BrowseTab = BrowseMode | 'swipe'

const BROWSE_TABS: { key: BrowseTab; label: string; accent?: boolean }[] = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'tracks', label: 'Tracks' },
  { key: 'compact', label: 'Compact' },
  { key: 'swipe', label: 'Rate All', accent: true },
]

export function BrowseModeControl({
  value,
  swipeActive,
  onChange,
  onSwipe,
}: {
  value: BrowseMode
  swipeActive: boolean
  onChange: (v: BrowseMode) => void
  onSwipe: (on: boolean) => void
}) {
  const activeKey: BrowseTab = swipeActive ? 'swipe' : value
  return (
    <div className="inline-flex items-center rounded-lg bg-gdc-surface/50 border border-gdc-border/30 p-0.5 gap-0.5">
      {BROWSE_TABS.map(({ key, label, accent }) => {
        const isActive = activeKey === key
        return (
          <button
            key={key}
            onClick={() => {
              if (key === 'swipe') {
                onSwipe(true)
              } else {
                onSwipe(false)
                onChange(key)
              }
            }}
            className={`text-[11px] px-2.5 py-1 rounded-md transition-all duration-150 font-medium ${
              isActive
                ? accent
                  ? 'bg-gdc-gold/15 text-gdc-gold'
                  : 'bg-gdc-accent/12 text-gdc-accent'
                : accent
                  ? 'text-gdc-gold/50 hover:text-gdc-gold/80'
                  : 'text-gdc-textMuted/70 hover:text-gdc-text'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
