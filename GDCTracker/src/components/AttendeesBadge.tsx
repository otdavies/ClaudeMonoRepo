import { useState, useRef, useEffect } from 'react'
import { AttendeeInfo } from '../hooks/useAttendance'

interface Props {
  attendees: AttendeeInfo[]
}

export function AttendeesBadge({ attendees }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (attendees.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open) }}
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gdc-bg/80 hover:bg-gdc-surfaceHover text-[10px] text-gdc-textMuted transition-colors"
        title={`${attendees.length} friend${attendees.length !== 1 ? 's' : ''} attending`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="font-medium">{attendees.length}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-gdc-surface border border-gdc-border rounded-lg shadow-lg py-1 min-w-[120px]">
          {attendees.map(a => (
            <div key={a.userId} className="flex items-center gap-2 px-3 py-1">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: a.color }}
              />
              <span className="text-xs truncate">{a.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Thin colored strip showing attendee colors (for session card borders) */
export function AttendeeStrip({ attendees }: Props) {
  if (attendees.length === 0) return null

  const gradient = attendees.length === 1
    ? attendees[0].color
    : `linear-gradient(to bottom, ${attendees.map((a, i) => {
        const pct = (i / attendees.length) * 100
        const pctEnd = ((i + 1) / attendees.length) * 100
        return `${a.color} ${pct}%, ${a.color} ${pctEnd}%`
      }).join(', ')})`

  return (
    <div
      className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
      style={{ background: gradient }}
    />
  )
}
