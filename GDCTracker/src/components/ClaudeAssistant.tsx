import { useState } from 'react'
import { Session, UserSessionData, DAY_LABELS, Day, ALL_DAYS } from '../types'
import { formatTimeRange } from '../utils/conflicts'

interface Props {
  sessions: Session[]
  userData: Record<string, UserSessionData>
}

type ContextMode = 'full_schedule' | 'day_plan' | 'find_sessions' | 'resolve_conflicts'

export function ClaudeAssistant({ sessions, userData }: Props) {
  const [contextMode, setContextMode] = useState<ContextMode>('full_schedule')
  const [selectedDay, setSelectedDay] = useState<Day>('Wed')
  const [customPrompt, setCustomPrompt] = useState('')
  const [copied, setCopied] = useState(false)

  const scheduledSessions = sessions.filter(s => userData[s.id]?.scheduled)
  const interestedSessions = sessions.filter(s => (userData[s.id]?.interest ?? 0) > 0)

  const generateContext = (): string => {
    let context = `# GDC 2026 Schedule Assistant\n\nI'm planning my GDC 2026 week (March 9-13, San Francisco). Help me optimize my schedule.\n\n`

    if (contextMode === 'full_schedule') {
      context += `## My Current Schedule (${scheduledSessions.length} sessions)\n\n`
      for (const day of ALL_DAYS) {
        const daySessions = scheduledSessions
          .filter(s => s.day === day)
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
        if (daySessions.length > 0) {
          context += `### ${DAY_LABELS[day]}\n`
          for (const s of daySessions) {
            const interest = userData[s.id]?.interest ?? 0
            const interestLabel = ['', ' [Maybe]', ' [Want]', ' [MUST]'][interest]
            context += `- ${formatTimeRange(s.startTime, s.endTime)} | **${s.title}**${interestLabel} | ${s.track} | ${s.speakers.join(', ')} | ${s.room}\n`
          }
          context += '\n'
        }
      }

      if (interestedSessions.length > 0) {
        const unscheduledInterested = interestedSessions.filter(s => !userData[s.id]?.scheduled)
        if (unscheduledInterested.length > 0) {
          context += `## Sessions I'm Interested In But Haven't Scheduled (${unscheduledInterested.length})\n\n`
          for (const s of unscheduledInterested) {
            const interest = userData[s.id]?.interest ?? 0
            const interestLabel = ['', 'Maybe', 'Want', 'MUST'][interest]
            context += `- [${interestLabel}] ${s.day} ${formatTimeRange(s.startTime, s.endTime)} | **${s.title}** | ${s.track}\n`
          }
          context += '\n'
        }
      }

      context += `## What I Need Help With\n\n`
      context += customPrompt || 'Please review my schedule and suggest improvements. Look for gaps, conflicts, and sessions I might want to swap. Consider travel time between rooms.'
    }

    else if (contextMode === 'day_plan') {
      context += `## Planning ${DAY_LABELS[selectedDay]}\n\n`

      const dayScheduled = scheduledSessions
        .filter(s => s.day === selectedDay)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))

      if (dayScheduled.length > 0) {
        context += `### Already Scheduled\n`
        for (const s of dayScheduled) {
          context += `- ${formatTimeRange(s.startTime, s.endTime)} | **${s.title}** | ${s.track} | ${s.room}\n`
        }
        context += '\n'
      }

      const dayAvailable = sessions
        .filter(s => s.day === selectedDay && !userData[s.id]?.scheduled)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))

      context += `### Available Sessions (${dayAvailable.length})\n`
      for (const s of dayAvailable) {
        const interest = userData[s.id]?.interest ?? 0
        const interestLabel = interest > 0 ? ` [${['', 'Maybe', 'Want', 'MUST'][interest]}]` : ''
        context += `- ${formatTimeRange(s.startTime, s.endTime)} | **${s.title}**${interestLabel} | ${s.track} | ${s.speakers.join(', ')}\n`
        context += `  ${s.description.substring(0, 120)}...\n`
      }
      context += '\n'
      context += `## What I Need Help With\n\n`
      context += customPrompt || `Help me plan my ${DAY_LABELS[selectedDay]} at GDC. I'm interested in [describe your interests]. Suggest the best sessions and help me build a schedule that avoids conflicts.`
    }

    else if (contextMode === 'find_sessions') {
      context += `## All Available Sessions (${sessions.length})\n\n`
      for (const day of ALL_DAYS) {
        const daySessions = sessions
          .filter(s => s.day === day)
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
        context += `### ${DAY_LABELS[day]}\n`
        for (const s of daySessions) {
          context += `- ${formatTimeRange(s.startTime, s.endTime)} | **${s.title}** | ${s.track} | ${s.format} | Tags: ${s.tags.join(', ')}\n`
        }
        context += '\n'
      }
      context += `## What I Need Help With\n\n`
      context += customPrompt || 'I\'m interested in [describe your interests, e.g. "rendering, shader programming, and technical art"]. Which sessions would you recommend? Please rank them by relevance.'
    }

    else if (contextMode === 'resolve_conflicts') {
      const conflicts = findConflictGroups(scheduledSessions)
      if (conflicts.length === 0) {
        context += `No scheduling conflicts found! Your schedule is clean.\n`
      } else {
        context += `## Schedule Conflicts to Resolve (${conflicts.length} groups)\n\n`
        for (let i = 0; i < conflicts.length; i++) {
          context += `### Conflict ${i + 1}\n`
          for (const s of conflicts[i]) {
            const interest = userData[s.id]?.interest ?? 0
            const interestLabel = ['', 'Maybe', 'Want', 'MUST'][interest]
            const notes = userData[s.id]?.notes ?? ''
            context += `- ${s.day} ${formatTimeRange(s.startTime, s.endTime)} | **${s.title}** | Interest: ${interestLabel} | ${s.track}\n`
            context += `  ${s.description.substring(0, 150)}...\n`
            if (notes) context += `  My notes: ${notes}\n`
          }
          context += '\n'
        }
        context += `## What I Need Help With\n\n`
        context += customPrompt || 'Help me resolve these scheduling conflicts. For each conflict, recommend which session I should attend and why, based on my interest levels and the session content.'
      }
    }

    return context
  }

  const handleCopy = async () => {
    const text = generateContext()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-2">Claude Schedule Assistant</h3>
        <p className="text-xs text-gdc-textMuted mb-3">
          Generate a context-rich prompt with your schedule data that you can paste into Claude (claude.ai or the Claude app).
          Claude will have full context about your schedule, interests, and available sessions to help you plan.
        </p>

        {/* Context mode selector */}
        <div className="space-y-2 mb-3">
          <label className="text-xs font-medium text-gdc-textMuted">What do you need help with?</label>
          <div className="grid grid-cols-2 gap-1">
            {([
              ['full_schedule', 'Review Full Schedule'],
              ['day_plan', 'Plan a Day'],
              ['find_sessions', 'Find Sessions'],
              ['resolve_conflicts', 'Resolve Conflicts'],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setContextMode(mode)}
                className={`text-xs p-2 rounded-md text-left transition-colors ${
                  contextMode === mode
                    ? 'bg-gdc-accent text-white'
                    : 'bg-gdc-bg text-gdc-textMuted hover:text-gdc-text hover:bg-gdc-surfaceHover'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Day selector for day planning mode */}
        {contextMode === 'day_plan' && (
          <div className="mb-3">
            <label className="text-xs font-medium text-gdc-textMuted mb-1 block">Which day?</label>
            <div className="flex gap-1">
              {ALL_DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    selectedDay === d
                      ? 'bg-gdc-accent text-white'
                      : 'bg-gdc-bg text-gdc-textMuted hover:text-gdc-text'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom prompt */}
        <div className="mb-3">
          <label className="text-xs font-medium text-gdc-textMuted mb-1 block">
            Additional instructions (optional)
          </label>
          <textarea
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder="E.g., 'I'm most interested in graphics programming and AI. I prefer lectures over panels. I want to keep afternoons free for the expo floor.'"
            className="input text-xs h-20 resize-none"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gdc-textMuted mb-3">
          <span>{scheduledSessions.length} scheduled</span>
          <span>{interestedSessions.length} interested</span>
          <span>{sessions.length} total sessions</span>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied! Paste into Claude
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy Prompt to Clipboard
            </>
          )}
        </button>
      </div>

      {/* Preview */}
      <div className="card p-4">
        <h4 className="text-xs font-medium text-gdc-textMuted mb-2">Prompt Preview</h4>
        <pre className="text-[10px] text-gdc-textMuted bg-gdc-bg rounded p-3 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
          {generateContext()}
        </pre>
      </div>
    </div>
  )
}

function findConflictGroups(sessions: Session[]): Session[][] {
  const groups: Session[][] = []
  const used = new Set<string>()

  for (let i = 0; i < sessions.length; i++) {
    if (used.has(sessions[i].id)) continue
    const group: Session[] = [sessions[i]]
    for (let j = i + 1; j < sessions.length; j++) {
      if (used.has(sessions[j].id)) continue
      if (sessions[i].day === sessions[j].day) {
        const [aStart, aEnd] = [sessions[i].startTime, sessions[i].endTime]
        const [bStart, bEnd] = [sessions[j].startTime, sessions[j].endTime]
        if (aStart < bEnd && bStart < aEnd) {
          group.push(sessions[j])
          used.add(sessions[j].id)
        }
      }
    }
    if (group.length > 1) {
      used.add(sessions[i].id)
      groups.push(group)
    }
  }

  return groups
}
