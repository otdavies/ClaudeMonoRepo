import { useState, useEffect, useCallback } from 'react'
import { parseRoom, getZoneLabel, type Building } from '../utils/location'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface Props {
  room: string
  onClose: () => void
}

// Building geometry (relative coords within SVG viewBox 0 0 400 320)
// Layout: North is across Howard St from South/West
//         West is left, South is right, Commons between them
const BUILDINGS: Record<Building, { x: number; y: number; w: number; h: number; label: string; color: string }> = {
  north:   { x: 100, y: 16,  w: 200, h: 80,  label: 'Moscone North',  color: '#3b82f6' },
  west:    { x: 16,  y: 168, w: 150, h: 130, label: 'Moscone West',   color: '#8b5cf6' },
  commons: { x: 178, y: 168, w: 80,  h: 50,  label: 'Commons',        color: '#22c55e' },
  south:   { x: 178, y: 228, w: 200, h: 70,  label: 'Moscone South',  color: '#f59e0b' },
  offsite: { x: 16,  y: 16,  w: 70,  h: 40,  label: 'Offsite',        color: '#6b7280' },
}

// Floor labels within buildings
const FLOOR_LABELS: { building: Building; floor: number; label: string; yOffset: number }[] = [
  { building: 'west', floor: 1, label: 'L1', yOffset: 0.72 },
  { building: 'west', floor: 2, label: 'L2', yOffset: 0.42 },
  { building: 'west', floor: 3, label: 'L3', yOffset: 0.16 },
  { building: 'south', floor: 1, label: 'Stages', yOffset: 0.32 },
  { building: 'south', floor: 2, label: '200s', yOffset: 0.65 },
]

export function VenueMap({ room, onClose }: Props) {
  const loc = parseRoom(room)
  const zoneLabel = getZoneLabel(room)
  const [userLocation, setUserLocation] = useLocalStorage<Building | null>('gdc2026-user-location', null)
  const [pulse, setPulse] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 1000)
    return () => clearInterval(id)
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const sessionBuilding = loc.building

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-gdc-surface border border-gdc-border rounded-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gdc-border/50">
          <div>
            <h3 className="text-sm font-bold">Venue Map</h3>
            <p className="text-[11px] text-gdc-textMuted">{room}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gdc-bg/80 text-gdc-textMuted hover:text-gdc-text"
          >
            &#x2715;
          </button>
        </div>

        {/* Map */}
        <div className="p-3">
          <svg viewBox="0 0 400 320" className="w-full h-auto" style={{ maxHeight: '50vh' }}>
            {/* Background */}
            <rect x="0" y="0" width="400" height="320" rx="8" fill="#0f1219" />

            {/* Howard Street divider */}
            <rect x="16" y="108" width="368" height="24" rx="4" fill="#1e2230" />
            <text x="200" y="124" textAnchor="middle" fill="#4a5068" fontSize="9" fontFamily="system-ui">
              Howard Street
            </text>

            {/* 3rd St label */}
            <text x="392" y="196" textAnchor="end" fill="#4a5068" fontSize="8" fontFamily="system-ui" transform="rotate(-90, 392, 196)">
              3rd Street
            </text>

            {/* 4th St label */}
            <text x="8" y="196" textAnchor="start" fill="#4a5068" fontSize="8" fontFamily="system-ui" transform="rotate(-90, 8, 196)">
              4th Street
            </text>

            {/* Yerba Buena Gardens (decorative) */}
            <rect x="178" y="140" width="200" height="22" rx="4" fill="#166534" fillOpacity="0.15" stroke="#166534" strokeOpacity="0.2" strokeWidth="0.5" />
            <text x="278" y="154" textAnchor="middle" fill="#22c55e" fillOpacity="0.4" fontSize="7" fontFamily="system-ui">
              Yerba Buena Gardens
            </text>

            {/* Buildings */}
            {Object.entries(BUILDINGS).map(([key, b]) => {
              const building = key as Building
              const isTarget = building === sessionBuilding
              const isUserHere = building === userLocation
              const baseOpacity = isTarget ? 0.25 : 0.08
              const strokeOpacity = isTarget ? 0.8 : 0.3

              return (
                <g key={key}>
                  {/* Building rect */}
                  <rect
                    x={b.x} y={b.y} width={b.w} height={b.h}
                    rx="6"
                    fill={b.color}
                    fillOpacity={baseOpacity}
                    stroke={b.color}
                    strokeOpacity={strokeOpacity}
                    strokeWidth={isTarget ? 2 : 1}
                    className="cursor-pointer"
                    onClick={() => setUserLocation(building === userLocation ? null : building)}
                  />

                  {/* Building label */}
                  <text
                    x={b.x + b.w / 2}
                    y={b.y + (building === 'offsite' ? 18 : building === 'commons' ? 20 : 16)}
                    textAnchor="middle"
                    fill={b.color}
                    fillOpacity={isTarget ? 1 : 0.6}
                    fontSize={building === 'offsite' || building === 'commons' ? 9 : 10}
                    fontWeight="600"
                    fontFamily="system-ui"
                  >
                    {b.label}
                  </text>

                  {/* Target marker - session location */}
                  {isTarget && (
                    <g>
                      {/* Pulsing ring */}
                      <circle
                        cx={b.x + b.w / 2}
                        cy={b.y + b.h / 2 + (building === 'north' || building === 'commons' ? 4 : 8)}
                        r={pulse ? 16 : 14}
                        fill="none"
                        stroke={b.color}
                        strokeOpacity={pulse ? 0.4 : 0.2}
                        strokeWidth="2"
                      />
                      {/* Pin dot */}
                      <circle
                        cx={b.x + b.w / 2}
                        cy={b.y + b.h / 2 + (building === 'north' || building === 'commons' ? 4 : 8)}
                        r="5"
                        fill={b.color}
                        fillOpacity="0.9"
                      />
                      {/* Room label */}
                      <text
                        x={b.x + b.w / 2}
                        y={b.y + b.h / 2 + (building === 'north' || building === 'commons' ? 4 : 8) + 22}
                        textAnchor="middle"
                        fill={b.color}
                        fontSize="9"
                        fontWeight="700"
                        fontFamily="system-ui"
                      >
                        {zoneLabel}
                      </text>
                    </g>
                  )}

                  {/* "You are here" marker */}
                  {isUserHere && (
                    <g>
                      <circle
                        cx={b.x + b.w - 14}
                        cy={b.y + 14}
                        r={pulse ? 10 : 8}
                        fill="none"
                        stroke="#22c55e"
                        strokeOpacity={pulse ? 0.5 : 0.2}
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={b.x + b.w - 14}
                        cy={b.y + 14}
                        r="4"
                        fill="#22c55e"
                      />
                    </g>
                  )}
                </g>
              )
            })}

            {/* Floor divisions in West */}
            {FLOOR_LABELS.filter(f => f.building === 'west').map(f => {
              const b = BUILDINGS.west
              const y = b.y + b.h * f.yOffset
              return (
                <g key={`${f.building}-${f.floor}`}>
                  <line
                    x1={b.x + 8} y1={y}
                    x2={b.x + b.w - 8} y2={y}
                    stroke="#8b5cf6"
                    strokeOpacity="0.15"
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={b.x + 12} y={y + 12}
                    fill="#8b5cf6"
                    fillOpacity="0.4"
                    fontSize="8"
                    fontFamily="system-ui"
                  >
                    {f.label}
                  </text>
                </g>
              )
            })}

            {/* Walk time indicator when user location is set */}
            {userLocation && userLocation !== sessionBuilding && userLocation !== 'offsite' && sessionBuilding !== 'offsite' && (() => {
              const from = BUILDINGS[userLocation]
              const to = BUILDINGS[sessionBuilding]
              const fromCx = from.x + from.w / 2
              const fromCy = from.y + from.h / 2
              const toCx = to.x + to.w / 2
              const toCy = to.y + to.h / 2

              // Walk time from location utility
              const key = [userLocation, sessionBuilding].sort().join('-')
              const walkTimes: Record<string, number> = {
                'commons-south': 2, 'north-south': 7, 'commons-north': 8,
                'south-west': 8, 'commons-west': 9, 'north-west': 12,
              }
              const mins = walkTimes[key] ?? 10
              const midX = (fromCx + toCx) / 2
              const midY = (fromCy + toCy) / 2

              return (
                <g>
                  <line
                    x1={fromCx} y1={fromCy}
                    x2={toCx} y2={toCy}
                    stroke="#22c55e"
                    strokeOpacity="0.3"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <rect
                    x={midX - 22} y={midY - 9}
                    width="44" height="18"
                    rx="9"
                    fill="#131620"
                    stroke="#22c55e"
                    strokeOpacity="0.5"
                    strokeWidth="1"
                  />
                  <text
                    x={midX} y={midY + 4}
                    textAnchor="middle"
                    fill="#22c55e"
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="system-ui"
                  >
                    ~{mins}min
                  </text>
                </g>
              )
            })()}
          </svg>
        </div>

        {/* Legend / You are here control */}
        <div className="px-4 pb-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BUILDINGS[sessionBuilding]?.color ?? '#6366f1' }} />
                <span className="text-gdc-textMuted">Session</span>
              </span>
              {userLocation && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-gdc-textMuted">You</span>
                </span>
              )}
            </div>
          </div>

          {/* Your location picker */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-gdc-textMuted shrink-0">I'm at:</span>
            {(['north', 'west', 'south', 'commons'] as Building[]).map(b => (
              <button
                key={b}
                onClick={() => setUserLocation(b === userLocation ? null : b)}
                className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                  userLocation === b
                    ? 'bg-green-500/20 text-green-400 font-medium'
                    : 'bg-gdc-bg text-gdc-textMuted hover:text-gdc-text'
                }`}
              >
                {b === 'north' ? 'North' : b === 'west' ? 'West' : b === 'south' ? 'South' : 'Commons'}
              </button>
            ))}
            {userLocation && (
              <button
                onClick={() => setUserLocation(null)}
                className="text-[10px] text-gdc-textMuted/60 hover:text-gdc-textMuted"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
