import { useState, useMemo, useCallback, useEffect } from 'react'
import { sessions as allSessions } from './data/sessions'
import { Session, FilterState, UserSessionData, ViewMode, InterestLevel } from './types'
import { applyFilters } from './utils/filters'
import { getScheduleConflicts } from './utils/conflicts'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useProfile } from './hooks/useProfile'
import { useAttendance } from './hooks/useAttendance'
import { FilterBar, BrowseModeControl } from './components/FilterBar'
import { SessionList } from './components/SessionList'
import type { BrowseMode } from './components/SessionList'
import { ScheduleView } from './components/ScheduleView'
import { UpNextView } from './components/UpNextView'
import { SwipeView } from './components/SwipeView'
import { SessionDetailModal } from './components/SessionDetailModal'
import { ProfileSetup } from './components/ProfileSetup'
import { Onboarding } from './components/Onboarding'
import { useNotifications } from './hooks/useNotifications'
import { InstallPrompt } from './components/InstallPrompt'

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
  const [swipeMode, setSwipeMode] = useState(false)
  const [userData, setUserData] = useLocalStorage<Record<string, UserSessionData>>('gdc2026-user-data', {})
  const [hasSeenOnboarding, setHasSeenOnboarding] = useLocalStorage<boolean>('gdc2026-onboarded', false)

  // User profile (name + color)
  const { profile, saveProfile } = useProfile()

  // Session reminders via notifications
  const { requestPermission } = useNotifications(allSessions, userData)

  // Debounce the search string to avoid re-filtering on every keystroke
  const debouncedSearch = useDebouncedValue(filters.search, 150)

  const updateUserData = useCallback((id: string, partial: Partial<UserSessionData>) => {
    setUserData(prev => ({
      ...prev,
      [id]: {
        ...(({ interest: 0 as InterestLevel, scheduled: false, picked: false, notes: '' })),
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

  // Picked session IDs for attendance sync
  const pickedSessionIds = useMemo(
    () => allSessions.filter(s => userData[s.id]?.picked).map(s => s.id),
    [userData]
  )

  // Multi-user attendance
  const { getAttendees, getAllAttendees } = useAttendance(profile, pickedSessionIds)

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

  // Session detail modal
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  const selectSession = useCallback((id: string) => {
    const s = allSessions.find(s => s.id === id)
    if (s) setSelectedSession(s)
  }, [])

  const scheduledCount = scheduledSessions.length

  // Show profile setup on first visit
  if (!profile) {
    return <ProfileSetup onSave={saveProfile} />
  }

  // Show onboarding after profile setup
  if (!hasSeenOnboarding) {
    return <Onboarding onDone={() => setHasSeenOnboarding(true)} />
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gdc-bg/90 backdrop-blur-md border-b border-gdc-border/50">
        <div className="max-w-4xl mx-auto px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h1 className="text-sm font-bold tracking-tight">GDC 2026</h1>
              <span className="text-[10px] text-gdc-textMuted/70 hidden sm:inline">Mar 9–13 · San Francisco</span>
            </div>
            <div className="flex items-center gap-1.5">
              {'Notification' in window && Notification.permission !== 'granted' && (
                <button
                  onClick={requestPermission}
                  className="text-[10px] text-gdc-textMuted hover:text-gdc-accent transition-colors p-1"
                  title="Enable session reminders"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
              )}
              {scheduledCount > 0 && (
                <span className="text-[10px] bg-gdc-accent/10 text-gdc-accent/90 px-1.5 py-0.5 rounded-md font-medium">
                  {scheduledCount}
                </span>
              )}
              <button
                onClick={() => setSelectedSession(null)}
                className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-white/10"
                style={{ backgroundColor: profile.color }}
                title={`${profile.name} — tap to edit profile`}
              >
                {profile.name.charAt(0).toUpperCase()}
              </button>
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="flex mt-2 -mb-px">
            {([
              ['browse', 'Browse', <svg key="b" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>],
              ['up-next', 'Decide', <svg key="d" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6M9 14l2 2 4-4" /></svg>],
              ['schedule', 'Schedule', <svg key="s" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>],
            ] as const).map(([v, label, icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${
                  view === v
                    ? 'bg-gdc-accent/12 text-gdc-accent'
                    : 'text-gdc-textMuted hover:text-gdc-text hover:bg-gdc-surfaceHover'
                }`}
              >
                {icon}
                {label}
                {v === 'schedule' && scheduledCount > 0 && (
                  <span className="ml-0.5 min-w-[16px] h-4 bg-gdc-accent/20 text-gdc-accent text-[10px] rounded-full flex items-center justify-center font-medium">
                    {scheduledCount}
                  </span>
                )}
                {v === 'schedule' && conflictMap.size > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-gdc-danger rounded-full conflict-pulse" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 py-3">
        {view === 'browse' && (
          <div className="space-y-2.5">
            {swipeMode ? (
              <>
                <BrowseModeControl
                  value={browseMode}
                  swipeActive={swipeMode}
                  onChange={setBrowseMode}
                  onSwipe={setSwipeMode}
                />
                <SwipeView
                  sessions={allSessions}
                  userData={userData}
                  onUpdateUserData={updateUserData}
                />
              </>
            ) : (
              <>
                <FilterBar
                  filters={filters}
                  onUpdate={setFilters}
                  sessionCount={filteredSessions.length}
                  totalCount={allSessions.length}
                  browseMode={browseMode}
                  swipeActive={swipeMode}
                  onBrowseModeChange={setBrowseMode}
                  onSwipeChange={setSwipeMode}
                />
                <SessionList
                  sessions={filteredSessions}
                  userData={userData}
                  onUpdateUserData={updateUserData}
                  conflictMap={conflictMap}
                  browseMode={browseMode}
                  onSelectSession={selectSession}
                />
              </>
            )}
          </div>
        )}

        {view === 'schedule' && (
          <ScheduleView
            sessions={allSessions}
            userData={userData}
            onUpdateUserData={updateUserData}
            conflictMap={conflictMap}
            onSelectSession={selectSession}
            getAttendees={getAttendees}
            getAllAttendees={getAllAttendees}
          />
        )}

        {view === 'up-next' && (
          <UpNextView
            sessions={allSessions}
            userData={userData}
            onUpdateUserData={updateUserData}
            onSelectSession={selectSession}
            getAttendees={getAttendees}
            getAllAttendees={getAllAttendees}
          />
        )}

      </main>

      {/* Session detail modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          userData={userData[selectedSession.id] ?? { interest: 0, scheduled: false, picked: false, notes: '' }}
          onUpdateUserData={updateUserData}
          onClose={() => setSelectedSession(null)}
          getAttendees={getAttendees}
        />
      )}

      <InstallPrompt />

      {/* Footer */}
      <footer className="border-t border-gdc-border/30 py-2 text-center text-[10px] text-gdc-textMuted/50">
        Real GDC 2026 schedule data · Last updated Mar 8, 2026 · {allSessions.length} sessions
      </footer>
    </div>
  )
}
