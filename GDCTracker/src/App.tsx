import { useState, useMemo, useCallback, useEffect } from 'react'
import { sessions as allSessions } from './data/sessions'
import { FilterState, UserSessionData, ViewMode, InterestLevel } from './types'
import { applyFilters } from './utils/filters'
import { getScheduleConflicts } from './utils/conflicts'
import { useLocalStorage } from './hooks/useLocalStorage'
import { FilterBar, BrowseModeControl } from './components/FilterBar'
import { SessionList } from './components/SessionList'
import type { BrowseMode } from './components/SessionList'
import { ScheduleView } from './components/ScheduleView'
import { UpNextView } from './components/UpNextView'
import { ClaudeAssistant } from './components/ClaudeAssistant'
import { useNotifications } from './hooks/useNotifications'

const DEFAULT_FILTERS: FilterState = {
  search: '',
  tracks: [],
  formats: [],
  days: [],
  interestMin: 0,
  scheduledOnly: false,
  hideConflicts: false,
  timeRange: null,
}

// Debounce hook for search input
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function App() {
  const [view, setView] = useState<ViewMode>('browse')
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [browseMode, setBrowseMode] = useState<BrowseMode>('timeline')
  const [userData, setUserData] = useLocalStorage<Record<string, UserSessionData>>('gdc2026-user-data', {})

  // Session reminders via notifications
  const { requestPermission } = useNotifications(allSessions, userData)

  // Debounce the search string to avoid re-filtering on every keystroke
  const debouncedSearch = useDebouncedValue(filters.search, 150)

  const updateUserData = useCallback((id: string, partial: Partial<UserSessionData>) => {
    setUserData(prev => ({
      ...prev,
      [id]: {
        ...(({ interest: 0 as InterestLevel, scheduled: false, notes: '' })),
        ...prev[id],
        ...partial,
      },
    }))
  }, [setUserData])

  // interest > 0 means scheduled
  const scheduledSessions = useMemo(
    () => allSessions.filter(s => (userData[s.id]?.interest ?? 0) > 0),
    [userData]
  )

  const conflictMap = useMemo(
    () => getScheduleConflicts(scheduledSessions),
    [scheduledSessions]
  )

  // Use debounced search for filtering
  const debouncedFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  )

  // Apply pure filters first (no userData dependency)
  const baseFilteredSessions = useMemo(
    () => applyFilters(allSessions, debouncedFilters),
    [debouncedFilters]
  )

  // Apply userData-dependent filters (sorting handled by each browse mode)
  const filteredSessions = useMemo(() => {
    let result = baseFilteredSessions

    if (filters.interestMin > 0) {
      result = result.filter(s => (userData[s.id]?.interest ?? 0) >= filters.interestMin)
    }

    if (filters.scheduledOnly) {
      result = result.filter(s => (userData[s.id]?.interest ?? 0) > 0)
    }

    return result
  }, [baseFilteredSessions, filters.interestMin, filters.scheduledOnly, userData])

  const scheduledCount = scheduledSessions.length

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gdc-bg/95 backdrop-blur-sm border-b border-gdc-border">
        <div className="max-w-4xl mx-auto px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold">GDC 2026</h1>
              <span className="text-xs text-gdc-textMuted hidden sm:inline">March 9-13 | San Francisco</span>
            </div>
            <div className="flex items-center gap-2">
              {'Notification' in window && Notification.permission !== 'granted' && (
                <button
                  onClick={requestPermission}
                  className="text-[10px] text-gdc-textMuted hover:text-gdc-accent"
                  title="Enable session reminders"
                >
                  🔔 Notify
                </button>
              )}
              {scheduledCount > 0 && (
                <span className="text-xs bg-gdc-accent/20 text-gdc-accent px-2 py-0.5 rounded-full">
                  {scheduledCount} starred
                </span>
              )}
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="flex gap-1">
            {([
              ['browse', 'Browse'],
              ['schedule', 'Schedule'],
              ['up-next', 'Up Next'],
              ['claude', 'Claude'],
            ] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`${view === v ? 'tab-active' : 'tab-inactive'} relative`}
              >
                {label}
                {v === 'schedule' && scheduledCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-gdc-accent text-white text-[10px] rounded-full flex items-center justify-center">
                    {scheduledCount}
                  </span>
                )}
                {v === 'schedule' && conflictMap.size > 0 && (
                  <span className="absolute -top-1 -left-1 w-2 h-2 bg-gdc-danger rounded-full conflict-pulse" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 py-4">
        {view === 'browse' && (
          <div className="space-y-3">
            <FilterBar
              filters={filters}
              onUpdate={setFilters}
              sessionCount={filteredSessions.length}
              totalCount={allSessions.length}
            />
            <BrowseModeControl value={browseMode} onChange={setBrowseMode} />
            <SessionList
              sessions={filteredSessions}
              userData={userData}
              onUpdateUserData={updateUserData}
              conflictMap={conflictMap}
              browseMode={browseMode}
            />
          </div>
        )}

        {view === 'schedule' && (
          <ScheduleView
            sessions={allSessions}
            userData={userData}
            onUpdateUserData={updateUserData}
            conflictMap={conflictMap}
          />
        )}

        {view === 'up-next' && (
          <UpNextView
            sessions={allSessions}
            userData={userData}
            onUpdateUserData={updateUserData}
          />
        )}

        {view === 'claude' && (
          <ClaudeAssistant
            sessions={allSessions}
            userData={userData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gdc-border py-2 text-center text-[10px] text-gdc-textMuted">
        GDC Tracker 2026 | Session data is illustrative | Built for planning your GDC week
      </footer>
    </div>
  )
}
