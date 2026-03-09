import { useState } from 'react'
import { PROFILE_COLORS, UserProfile } from '../hooks/useProfile'

interface Props {
  existingProfile?: UserProfile | null
  onSave: (name: string, color: string) => void
}

export function ProfileSetup({ existingProfile, onSave }: Props) {
  const [name, setName] = useState(existingProfile?.name ?? '')
  const [color, setColor] = useState(existingProfile?.color ?? PROFILE_COLORS[5].hex)

  const canSave = name.trim().length > 0

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-gdc-surface border border-gdc-border rounded-xl w-full max-w-sm mx-4 p-5">
        <h2 className="text-lg font-bold mb-1">Welcome to GDC Tracker</h2>
        <p className="text-xs text-gdc-textMuted mb-4">
          Pick a name and color so friends can see what you're attending.
        </p>

        {/* Name input */}
        <label className="text-xs text-gdc-textMuted mb-1 block">Your name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Alex"
          className="input w-full mb-4 text-sm"
          maxLength={20}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && canSave) onSave(name, color) }}
        />

        {/* Color picker */}
        <label className="text-xs text-gdc-textMuted mb-2 block">Your color</label>
        <div className="grid grid-cols-5 gap-2 mb-5">
          {PROFILE_COLORS.map(c => (
            <button
              key={c.hex}
              onClick={() => setColor(c.hex)}
              className={`w-full aspect-square rounded-full transition-all ${
                color === c.hex
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-gdc-surface scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
        </div>

        {/* Preview */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gdc-bg rounded-lg">
          <div
            className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
            style={{ backgroundColor: color }}
          >
            {name.trim().charAt(0).toUpperCase() || '?'}
          </div>
          <span className="text-sm">{name.trim() || 'Your Name'}</span>
        </div>

        <button
          onClick={() => canSave && onSave(name, color)}
          disabled={!canSave}
          className="btn-primary w-full disabled:opacity-40"
        >
          {existingProfile ? 'Update' : "Let's Go"}
        </button>
      </div>
    </div>
  )
}
