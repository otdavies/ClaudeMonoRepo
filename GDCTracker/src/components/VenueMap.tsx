import { useState, useEffect, useCallback } from 'react'
import { parseRoom, getZoneLabel, type Building } from '../utils/location'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface Props {
  room: string
  onClose: () => void
}

// Accurate Moscone Center layout (SVG viewBox 0 0 420 340)
// Real geography:
//   - Moscone West is on the LEFT (4th St side)
//   - Moscone North is upper-right (north of Howard St, underground beneath Yerba Buena Gardens)
//   - Moscone South is lower-right (south of Howard St)
//   - Howard Street runs east-west between North and South
//   - 4th Street runs north-south between West and North/South
//   - Commons is attached to South Hall (lobby area)
//   - A glass pedestrian bridge connects North and South over Howard St

const BUILDINGS: Record<Building, { x: number; y: number; w: number; h: number; label: string; color: string }> = {
  west:    { x: 16,  y: 30,  w: 130, h: 200, label: 'Moscone West',   color: '#8b5cf6' },
  north:   { x: 206, y: 30,  w: 196, h: 90,  label: 'Moscone North',  color: '#3b82f6' },
  south:   { x: 206, y: 182, w: 196, h: 90,  label: 'Moscone South',  color: '#f59e0b' },
  commons: { x: 206, y: 280, w: 100, h: 40,  label: 'Commons',        color: '#22c55e' },
  offsite: { x: 320, y: 280, w: 82,  h: 40,  label: 'Offsite',        color: '#6b7280' },
}

const FLOOR_LABELS: { building: Building; floor: number; label: string; yOffset: number }[] = [
  { building: 'west', floor: 3, label: 'L3  Rooms 3xxx', yOffset: 0.14 },
  { building: 'west', floor: 2, label: 'L2  Rooms 2xxx', yOffset: 0.46 },
  { building: 'west', floor: 1, label: 'L1  Exhibit Hall', yOffset: 0.78 },
  { building: 'south', floor: 2, label: '200s', yOffset: 0.30 },
  { building: 'south', floor: 1, label: 'Stages & Lobby', yOffset: 0.70 },
  { building: 'north', floor: 1, label: 'Main Stage', yOffset: 0.55 },
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

  // Compute pin position within building (adjusting for floor)
  function getPinY(b: typeof BUILDINGS[Building], building: Building): number {
    if (building === 'west') {
      // Position pin on the correct floor
      if (loc.floor === 3) return b.y + b.h * 0.14
      if (loc.floor === 1) return b.y + b.h * 0.78
      return b.y + b.h * 0.46
    }
    if (building === 'south') {
      if (loc.floor >= 2) return b.y + b.h * 0.30
      return b.y + b.h * 0.65
    }
    return b.y + b.h * 0.5
  }

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
          <svg viewBox="0 0 420 340" className="w-full h-auto" style={{ maxHeight: '50vh' }}>
            {/* Background */}
            <rect x="0" y="0" width="420" height="340" rx="8" fill="#0f1219" />

            {/* 4th Street (vertical, between West and North/South) */}
            <rect x="156" y="16" width="36" height="228" rx="4" fill="#1e2230" />
            <text x="174" y="140" textAnchor="middle" fill="#4a5068" fontSize="8" fontWeight="500" fontFamily="system-ui" transform="rotate(-90, 174, 140)">
              4th Street
            </text>

            {/* Howard Street (horizontal, between North and South) */}
            <rect x="192" y="128" width="220" height="44" rx="4" fill="#1e2230" />
            <text x="304" y="154" textAnchor="middle" fill="#4a5068" fontSize="8" fontWeight="500" fontFamily="system-ui">
              Howard Street
            </text>

            {/* Pedestrian bridge (connecting North and South) */}
            <rect x="280" y="122" width="24" height="56" rx="2" fill="#3b82f6" fillOpacity="0.08" stroke="#3b82f6" strokeOpacity="0.2" strokeWidth="0.5" strokeDasharray="3,2" />
            <text x="292" y="152" textAnchor="middle" fill="#3b82f6" fillOpacity="0.35" fontSize="5" fontFamily="system-ui">
              Bridge
            </text>

            {/* 3rd Street label */}
            <text x="414" y="150" textAnchor="middle" fill="#4a5068" fontSize="8" fontFamily="system-ui" transform="rotate(-90, 414, 150)">
              3rd Street
            </text>

            {/* Yerba Buena Gardens (above North, decorative) */}
            <rect x="206" y="6" width="196" height="18" rx="4" fill="#166534" fillOpacity="0.12" stroke="#166534" strokeOpacity="0.15" strokeWidth="0.5" />
            <text x="304" y="18" textAnchor="middle" fill="#22c55e" fillOpacity="0.35" fontSize="7" fontFamily="system-ui">
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
                    y={b.y + (building === 'commons' || building === 'offsite' ? 17 : 16)}
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
                      <circle
                        cx={b.x + b.w / 2}
                        cy={getPinY(b, building)}
                        r={pulse ? 16 : 14}
                        fill="none"
                        stroke={b.color}
                        strokeOpacity={pulse ? 0.4 : 0.2}
                        strokeWidth="2"
                      />
                      <circle
                        cx={b.x + b.w / 2}
                        cy={getPinY(b, building)}
                        r="5"
                        fill={b.color}
                        fillOpacity="0.9"
                      />
                      <text
                        x={b.x + b.w / 2}
                        y={getPinY(b, building) + 22}
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
                  {isUserHere && !isTarget && (
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
                  {isUserHere && isTarget && (
                    <g>
                      <circle
                        cx={b.x + 14}
                        cy={b.y + 14}
                        r={pulse ? 10 : 8}
                        fill="none"
                        stroke="#22c55e"
                        strokeOpacity={pulse ? 0.5 : 0.2}
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={b.x + 14}
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
                    fillOpacity={sessionBuilding === 'west' && loc.floor === f.floor ? 0.8 : 0.3}
                    fontSize="7"
                    fontFamily="system-ui"
                  >
                    {f.label}
                  </text>
                </g>
              )
            })}

            {/* Floor labels in South */}
            {FLOOR_LABELS.filter(f => f.building === 'south').map(f => {
              const b = BUILDINGS.south
              const y = b.y + b.h * f.yOffset
              return (
                <g key={`${f.building}-${f.floor}`}>
                  <line
                    x1={b.x + 8} y1={y}
                    x2={b.x + b.w - 8} y2={y}
                    stroke="#f59e0b"
                    strokeOpacity="0.12"
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={b.x + 12} y={y + 11}
                    fill="#f59e0b"
                    fillOpacity={sessionBuilding === 'south' && loc.floor === f.floor ? 0.8 : 0.3}
                    fontSize="7"
                    fontFamily="system-ui"
                  >
                    {f.label}
                  </text>
                </g>
              )
            })}

            {/* Floor label in North */}
            {FLOOR_LABELS.filter(f => f.building === 'north').map(f => {
              const b = BUILDINGS.north
              return (
                <text
                  key={`${f.building}-${f.floor}`}
                  x={b.x + b.w / 2} y={b.y + b.h * f.yOffset + 4}
                  textAnchor="middle"
                  fill="#3b82f6"
                  fillOpacity={sessionBuilding === 'north' ? 0.7 : 0.3}
                  fontSize="8"
                  fontFamily="system-ui"
                >
                  {f.label}
                </text>
              )
            })}

            {/* Walk time indicator */}
            {userLocation && userLocation !== sessionBuilding && userLocation !== 'offsite' && sessionBuilding !== 'offsite' && (() => {
              const from = BUILDINGS[userLocation]
              const to = BUILDINGS[sessionBuilding]
              const fromCx = from.x + from.w / 2
              const fromCy = from.y + from.h / 2
              const toCx = to.x + to.w / 2
              const toCy = to.y + to.h / 2

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
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                  />
                  <rect
                    x={midX - 24} y={midY - 10}
                    width="48" height="20"
                    rx="10"
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

        {/* Legend + location picker */}
        <div className="px-4 pb-3 space-y-2">
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
          <p className="text-[9px] text-gdc-textMuted/50">Tap a building on the map or use the buttons above to set your location</p>
        </div>
      </div>
    </div>
  )
}
