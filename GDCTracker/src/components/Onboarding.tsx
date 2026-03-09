import { useState, useMemo } from 'react'
import { Session, InterestLevel } from '../types'

interface StepDef {
  title: string
  description: string
  visual: React.ReactNode
}

const STATIC_STEPS: StepDef[] = [
  {
    title: 'Browse Sessions',
    description: 'Explore 700+ GDC sessions by time, track, or in a compact list.',
    visual: (
      <div className="flex flex-col items-center gap-3 pointer-events-none select-none">
        {/* Illustrative tab bar */}
        <div className="flex gap-1 opacity-70">
          {['Timeline', 'Tracks', 'Compact'].map((t, i) => (
            <span key={t} className={`text-[11px] px-3 py-1 rounded-md font-medium ${i === 0 ? 'bg-gdc-accent/15 text-gdc-accent' : 'text-gdc-textMuted/60'}`}>{t}</span>
          ))}
        </div>
        {/* Illustrative session list */}
        <div className="w-full max-w-[260px] space-y-1.5 opacity-80">
          {[
            { time: '10:00', title: 'Next-Gen Rendering', track: 'Programming', color: 'bg-blue-500/15 text-blue-400/70' },
            { time: '10:00', title: 'AI for NPCs', track: 'AI Summit', color: 'bg-purple-500/15 text-purple-400/70' },
            { time: '11:30', title: 'Narrative Design', track: 'Design', color: 'bg-green-500/15 text-green-400/70' },
          ].map((s, i) => (
            <div key={i} className="bg-gdc-bg/60 border border-gdc-border/40 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-[10px] font-mono text-gdc-textMuted/60 shrink-0">{s.time}</span>
              <span className="text-[11px] text-gdc-text/70 flex-1 truncate">{s.title}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${s.color}`}>{s.track}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Rate Your Interest',
    description: 'Tap stars on any session to mark your interest level. This helps you plan later.',
    visual: (
      <div className="flex flex-col items-center gap-4 pointer-events-none select-none">
        <div className="w-full max-w-[260px] space-y-2">
          {[
            { label: 'Maybe', stars: 1, color: 'text-slate-400/80', bg: 'bg-slate-500/8 border-slate-500/10' },
            { label: 'Want to see', stars: 2, color: 'text-amber-400/80', bg: 'bg-amber-500/8 border-amber-500/10' },
            { label: 'Must see!', stars: 3, color: 'text-rose-400/80', bg: 'bg-rose-500/8 border-rose-500/10' },
          ].map(({ label, stars, color, bg }) => (
            <div key={label} className={`flex items-center gap-3 ${bg} border rounded-lg px-4 py-2.5`}>
              <div className="flex gap-0.5">
                {[1, 2, 3].map(n => (
                  <svg key={n} className={`w-4 h-4 ${n <= stars ? color : 'text-gdc-border/40'}`} viewBox="0 0 24 24" fill={n <= stars ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={n <= stars ? '0' : '1.5'}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <span className={`text-xs font-medium ${color}`}>{label}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gdc-textMuted/60 text-center italic">Tip: Use Swipe mode to quickly rate sessions</p>
      </div>
    ),
  },
  {
    title: 'Decide & Schedule',
    description: 'Go to Decide to pick between overlapping sessions. Then view your final schedule as a calendar.',
    visual: (
      <div className="flex flex-col items-center gap-3 pointer-events-none select-none">
        {/* Illustrative nav */}
        <div className="flex gap-1 w-full max-w-[260px] opacity-70">
          {['Browse', 'Decide', 'Schedule'].map((t, i) => (
            <span key={t} className={`flex-1 text-center text-[11px] py-1.5 rounded-md font-medium ${i === 1 ? 'bg-gdc-accent/15 text-gdc-accent' : 'text-gdc-textMuted/60'}`}>{t}</span>
          ))}
        </div>
        {/* Illustrative conflict block */}
        <div className="w-full max-w-[260px] space-y-1.5 opacity-80">
          <div className="text-[10px] text-gdc-textMuted/60 mb-0.5 italic">Wed 10:00 AM — Pick one:</div>
          {[
            { title: 'Next-Gen Rendering', picked: true },
            { title: 'AI for NPCs', picked: false },
          ].map((s, i) => (
            <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${s.picked ? 'bg-gdc-accent/10 border-gdc-accent/30' : 'bg-gdc-bg/40 border-gdc-border/40'}`}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${s.picked ? 'border-gdc-accent/70 bg-gdc-accent/70' : 'border-gdc-textMuted/40'}`}>
                {s.picked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className={`text-[11px] ${s.picked ? 'text-gdc-text/80' : 'text-gdc-textMuted/60'}`}>{s.title}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
]

const TOTAL_STEPS = STATIC_STEPS.length + 1 // +1 for import step

/** Normalize a string for fuzzy matching: lowercase, strip punctuation, collapse whitespace */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

/** Parse .ics SUMMARY lines or plain text lines into event names */
function parseEventNames(text: string): string[] {
  const lines = text.split(/\r?\n/)
  const names: string[] = []
  for (const line of lines) {
    // .ics SUMMARY field
    const icsMatch = line.match(/^SUMMARY[;:](.+)/i)
    if (icsMatch) {
      names.push(icsMatch[1].trim())
      continue
    }
    // Plain text line — skip empty or very short
    const trimmed = line.trim()
    if (trimmed.length > 3) {
      names.push(trimmed)
    }
  }
  return [...new Set(names)]
}

/** Match event names to sessions. Returns matched session IDs. */
function matchSessions(eventNames: string[], sessions: Session[]): Session[] {
  const matched: Session[] = []
  const matchedIds = new Set<string>()
  const normalizedNames = eventNames.map(normalize)

  for (const session of sessions) {
    if (matchedIds.has(session.id)) continue
    const normTitle = normalize(session.title)

    for (const normName of normalizedNames) {
      // Check if either contains the other (handles partial matches)
      if (normTitle.includes(normName) || normName.includes(normTitle)) {
        matched.push(session)
        matchedIds.add(session.id)
        break
      }
      // Also check significant word overlap
      const nameWords = normName.split(' ').filter(w => w.length > 3)
      const titleWords = normTitle.split(' ').filter(w => w.length > 3)
      if (nameWords.length >= 2 && titleWords.length >= 2) {
        const overlap = nameWords.filter(w => titleWords.includes(w)).length
        if (overlap >= 2 || overlap >= nameWords.length * 0.6) {
          matched.push(session)
          matchedIds.add(session.id)
          break
        }
      }
    }
  }

  return matched
}

function ImportStep({
  sessions,
  onImport,
}: {
  sessions: Session[]
  onImport: (sessionIds: string[]) => void
}) {
  const [text, setText] = useState('')
  const [imported, setImported] = useState(false)

  const matches = useMemo(
    () => text.trim() ? matchSessions(parseEventNames(text), sessions) : [],
    [text, sessions]
  )

  const handleImport = () => {
    onImport(matches.map(s => s.id))
    setImported(true)
  }

  if (imported) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="text-2xl">&#10003;</div>
        <p className="text-sm font-medium">
          {matches.length} session{matches.length !== 1 ? 's' : ''} marked as interested
        </p>
        <p className="text-[10px] text-gdc-textMuted">You can adjust ratings later in Browse</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gdc-textMuted leading-relaxed">
        Paste event names from your Google Calendar, Apple Calendar, or an .ics file.
        We'll match them to GDC sessions and mark them as interested.
      </p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={"Paste calendar events or .ics content here...\n\ne.g.\nNext-Gen Rendering Techniques\nAI for NPCs Workshop\nIndie Dev Meetup"}
        className="input text-[11px] h-28 resize-none w-full"
        rows={5}
      />

      {text.trim() && (
        <div className="space-y-2">
          <p className="text-[11px] text-gdc-textMuted">
            {matches.length > 0
              ? <>Found <span className="text-gdc-accent font-medium">{matches.length}</span> matching session{matches.length !== 1 ? 's' : ''}:</>
              : 'No matching sessions found. Try different event names.'}
          </p>

          {matches.length > 0 && (
            <>
              <div className="max-h-28 overflow-y-auto space-y-1 rounded-lg bg-gdc-bg/60 p-2">
                {matches.slice(0, 10).map(s => (
                  <div key={s.id} className="flex items-center gap-1.5 text-[10px]">
                    <svg className="w-3 h-3 text-gdc-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="truncate text-gdc-text/80">{s.title}</span>
                  </div>
                ))}
                {matches.length > 10 && (
                  <p className="text-[10px] text-gdc-textMuted pl-4.5">+{matches.length - 10} more</p>
                )}
              </div>

              <button onClick={handleImport} className="btn-primary w-full text-xs">
                Import {matches.length} session{matches.length !== 1 ? 's' : ''}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  onDone: () => void
  sessions: Session[]
  onUpdateUserData: (id: string, data: { interest: InterestLevel }) => void
}

export function Onboarding({ onDone, sessions, onUpdateUserData }: Props) {
  const [step, setStep] = useState(0)
  const isImportStep = step === STATIC_STEPS.length
  const isLast = step === TOTAL_STEPS - 1
  const current = isImportStep ? null : STATIC_STEPS[step]

  const handleImport = (sessionIds: string[]) => {
    for (const id of sessionIds) {
      onUpdateUserData(id, { interest: 1 })
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-gdc-surface border border-gdc-border/50 rounded-2xl w-full max-w-sm overflow-hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-5 pb-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-gdc-accent' : i < step ? 'w-1.5 bg-gdc-accent/40' : 'w-1.5 bg-gdc-border/40'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-5 pt-3 pb-5">
          {isImportStep ? (
            <>
              <div className="text-center mb-4">
                <h2 className="text-base font-bold mb-1.5">Import from Calendar</h2>
                <p className="text-xs text-gdc-textMuted leading-relaxed">
                  Already have GDC events saved? Import them to get a head start.
                </p>
              </div>
              <div className="mb-4">
                <ImportStep sessions={sessions} onImport={handleImport} />
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-5">
                <h2 className="text-base font-bold mb-1.5">{current!.title}</h2>
                <p className="text-xs text-gdc-textMuted leading-relaxed">{current!.description}</p>
              </div>
              <div className="mb-6">
                {current!.visual}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="btn-ghost flex-1"
              >
                Back
              </button>
            )}
            <button
              onClick={() => isLast ? onDone() : setStep(step + 1)}
              className="btn-primary flex-1"
            >
              {isLast ? 'Get Started' : isImportStep ? 'Skip' : 'Next'}
            </button>
          </div>

          {/* Skip */}
          {!isLast && !isImportStep && (
            <button
              onClick={onDone}
              className="w-full text-center text-[10px] text-gdc-textMuted/60 hover:text-gdc-textMuted mt-3 transition-colors"
            >
              Skip intro
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
