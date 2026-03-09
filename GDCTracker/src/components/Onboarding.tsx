import { useState } from 'react'

const STEPS = [
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

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-gdc-surface border border-gdc-border/50 rounded-2xl w-full max-w-sm overflow-hidden">
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
        <div className="px-5 pt-3 pb-5">
          <div className="text-center mb-5">
            <h2 className="text-base font-bold mb-1.5">{current.title}</h2>
            <p className="text-xs text-gdc-textMuted leading-relaxed">{current.description}</p>
          </div>

          {/* Visual — illustrative, not interactive */}
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
