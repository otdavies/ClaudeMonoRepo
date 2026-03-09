import { useState } from 'react'

const STEPS = [
  {
    title: 'Browse Sessions',
    description: 'Explore 700+ GDC sessions by time, track, or in a compact list.',
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1">
          {['Timeline', 'Tracks', 'Compact'].map((t, i) => (
            <span key={t} className={`text-[11px] px-3 py-1 rounded-md font-medium ${i === 0 ? 'bg-gdc-accent/15 text-gdc-accent' : 'text-gdc-textMuted/50'}`}>{t}</span>
          ))}
        </div>
        <div className="w-full max-w-[240px] space-y-1.5">
          {[
            { time: '10:00', title: 'Next-Gen Rendering', track: 'Programming', color: 'bg-blue-500/20 text-blue-300' },
            { time: '10:00', title: 'AI for NPCs', track: 'AI Summit', color: 'bg-purple-500/20 text-purple-300' },
            { time: '11:30', title: 'Narrative Design', track: 'Design', color: 'bg-green-500/20 text-green-300' },
          ].map((s, i) => (
            <div key={i} className="bg-gdc-surface/80 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-[10px] font-mono text-gdc-textMuted/60">{s.time}</span>
              <span className="text-[11px] text-gdc-text/80 flex-1 truncate">{s.title}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${s.color}`}>{s.track}</span>
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
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-[240px] space-y-2">
          {[
            { label: 'Maybe', stars: 1, color: 'text-slate-400', bg: 'bg-slate-400/10' },
            { label: 'Want', stars: 2, color: 'text-amber-400', bg: 'bg-amber-400/10' },
            { label: 'Must See', stars: 3, color: 'text-rose-400', bg: 'bg-rose-400/10' },
          ].map(({ label, stars, color, bg }) => (
            <div key={label} className={`flex items-center gap-3 ${bg} rounded-lg px-4 py-2.5`}>
              <div className="flex gap-0.5">
                {[1, 2, 3].map(n => (
                  <span key={n} className={`text-lg ${n <= stars ? color : 'text-gdc-border/30'}`}>
                    {n <= stars ? '\u2605' : '\u2606'}
                  </span>
                ))}
              </div>
              <span className={`text-xs font-medium ${color}`}>{label}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gdc-textMuted/50 text-center">Tip: Use Swipe mode to quickly rate all sessions</p>
      </div>
    ),
  },
  {
    title: 'Decide & Schedule',
    description: 'Go to Decide to pick between overlapping sessions. Then view your final schedule as a calendar.',
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1 w-full max-w-[240px]">
          {['Browse', 'Decide', 'Schedule'].map((t, i) => (
            <span key={t} className={`flex-1 text-center text-[11px] py-1.5 rounded-md font-medium ${i === 1 ? 'bg-gdc-accent/15 text-gdc-accent' : 'text-gdc-textMuted/50'}`}>{t}</span>
          ))}
        </div>
        <div className="w-full max-w-[240px] space-y-1">
          <div className="text-[10px] text-gdc-textMuted/50 mb-1">Wed 10:00 AM — Pick one:</div>
          {[
            { title: 'Next-Gen Rendering', picked: true },
            { title: 'AI for NPCs', picked: false },
          ].map((s, i) => (
            <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${s.picked ? 'bg-gdc-accent/10 ring-1 ring-gdc-accent/30' : 'bg-gdc-surface/50'}`}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${s.picked ? 'border-gdc-accent bg-gdc-accent' : 'border-gdc-border/40'}`}>
                {s.picked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className={`text-[11px] ${s.picked ? 'text-gdc-text' : 'text-gdc-textMuted/60'}`}>{s.title}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
]

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-gdc-surface border border-gdc-border/50 rounded-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-5 pb-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-gdc-accent' : i < step ? 'w-1.5 bg-gdc-accent/40' : 'w-1.5 bg-gdc-border/40'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pt-3 pb-5">
          <div className="text-center mb-5">
            <h2 className="text-base font-bold mb-1.5">{current.title}</h2>
            <p className="text-xs text-gdc-textMuted leading-relaxed">{current.description}</p>
          </div>

          {/* Visual */}
          <div className="mb-6">
            {current.visual}
          </div>

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
              {isLast ? 'Get Started' : 'Next'}
            </button>
          </div>

          {/* Skip */}
          {!isLast && (
            <button
              onClick={onDone}
              className="w-full text-center text-[10px] text-gdc-textMuted/40 hover:text-gdc-textMuted mt-3 transition-colors"
            >
              Skip intro
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
