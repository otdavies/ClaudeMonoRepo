#!/usr/bin/env node
/**
 * Parses schedule.csv (exported from GDC schedule) and generates src/data/sessions.ts
 *
 * Usage: node scripts/import-csv.mjs [path-to-csv]
 *   Default CSV path: schedule.csv in project root
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

// --- CSV Parsing (no external deps) ---

function parseCSV(text) {
  const rows = []
  let i = 0
  const len = text.length

  function parseField() {
    if (i >= len || text[i] === '\n' || text[i] === '\r') return ''

    if (text[i] === '"') {
      // Quoted field
      i++ // skip opening quote
      let field = ''
      while (i < len) {
        if (text[i] === '"') {
          if (i + 1 < len && text[i + 1] === '"') {
            field += '"'
            i += 2
          } else {
            i++ // skip closing quote
            break
          }
        } else {
          field += text[i]
          i++
        }
      }
      return field
    } else {
      // Unquoted field
      let field = ''
      while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
        field += text[i]
        i++
      }
      return field
    }
  }

  while (i < len) {
    const row = []
    while (i < len) {
      const field = parseField()
      row.push(field)
      if (i < len && text[i] === ',') {
        i++ // skip comma
      } else {
        break
      }
    }
    // Skip line endings
    while (i < len && (text[i] === '\r' || text[i] === '\n')) i++
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      rows.push(row)
    }
  }
  return rows
}

// --- Track mapping ---

const VALID_TRACKS = [
  'Audio',
  'Business Strategy',
  'Career',
  'Culture & Sustainability',
  'Design',
  'Discovery & Marketing',
  'Educators',
  'Game & Production Technology',
  'Independent Development',
  'Luminaries',
  'Narrative & Performance',
  'Product Management',
  'Production',
  'Special Event',
  'Team Leadership',
  'Visual Development',
]

// Map CSV track names to our Track type
const TRACK_MAP = {
  'Audio': 'Audio',
  'Business Strategy': 'Business Strategy',
  'Career': 'Career',
  'Career Development': 'Career',
  'Culture & Sustainability': 'Culture & Sustainability',
  'Design': 'Design',
  'Discovery & Marketing': 'Discovery & Marketing',
  'Educators': 'Educators',
  'Educators Summit': 'Educators',
  'Game & Production Technology': 'Game & Production Technology',
  'Independent Development': 'Independent Development',
  'Independent Games Summit': 'Independent Development',
  'Luminaries': 'Luminaries',
  'Narrative & Performance': 'Narrative & Performance',
  'Product Management': 'Product Management',
  'Production': 'Production',
  'Special Event': 'Special Event',
  'Team Leadership': 'Team Leadership',
  'Visual Development': 'Visual Development',
  'Visual Arts': 'Visual Development',
  'Programming': 'Game & Production Technology',
  'Game AI': 'Game & Production Technology',
  'Machine Learning Summit': 'Game & Production Technology',
  'Advanced Graphics Summit': 'Game & Production Technology',
  'Free to Play Summit': 'Business Strategy',
  'Art Direction': 'Visual Development',
  'Future Realities Summit': 'Game & Production Technology',
  'Community Management': 'Discovery & Marketing',
  'Business & Marketing': 'Discovery & Marketing',
  'Production & Leadership': 'Production',
  'Advocacy': 'Culture & Sustainability',
  'Partner Developer Summit': 'Game & Production Technology',
  'Thriving Players': 'Culture & Sustainability',
  'Tools': 'Game & Production Technology',
}

function mapTrack(csvTracks) {
  if (!csvTracks || csvTracks.trim() === '') return 'Special Event'

  // CSV may have multiple comma-separated tracks
  const tracks = csvTracks.split(',').map(t => t.trim())

  for (const t of tracks) {
    if (VALID_TRACKS.includes(t)) return t
    if (TRACK_MAP[t]) return TRACK_MAP[t]
  }

  // Try partial matching
  for (const t of tracks) {
    const lower = t.toLowerCase()
    for (const [key, val] of Object.entries(TRACK_MAP)) {
      if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
        return val
      }
    }
  }

  console.warn(`  Unknown track: "${csvTracks}" -> defaulting to 'Special Event'`)
  return 'Special Event'
}

// --- Format mapping ---

const VALID_FORMATS = [
  'Lecture', 'Panel', 'Workshop', 'Roundtable', 'Fireside Chat',
  'Forum', 'Keynote', 'Microtalks', 'Power Talk', 'Special Event',
]

const FORMAT_MAP = {
  'Session': 'Lecture',
  'Lecture': 'Lecture',
  'Panel': 'Panel',
  'Workshop': 'Workshop',
  'Roundtable': 'Roundtable',
  'Fireside Chat': 'Fireside Chat',
  'Forum': 'Forum',
  'Keynote': 'Keynote',
  'Microtalks': 'Microtalks',
  'Microtalk': 'Microtalks',
  'Power Talk': 'Power Talk',
  'Special Event': 'Special Event',
  'Tutorial': 'Workshop',
  'Sponsored Session': 'Lecture',
  'Partner Developer Summit': 'Partner Developer Summit',
  'Summit': 'Lecture',
}

function mapFormat(csvFormat) {
  if (!csvFormat || csvFormat.trim() === '') return 'Lecture'
  const f = csvFormat.trim()
  if (VALID_FORMATS.includes(f)) return f
  if (FORMAT_MAP[f]) return FORMAT_MAP[f]

  // Partial match
  const lower = f.toLowerCase()
  for (const [key, val] of Object.entries(FORMAT_MAP)) {
    if (lower.includes(key.toLowerCase())) return val
  }

  console.warn(`  Unknown format: "${csvFormat}" -> defaulting to 'Lecture'`)
  return 'Lecture'
}

// --- Day mapping ---

function mapDay(csvDay, startTime) {
  if (csvDay && csvDay !== 'TBD') {
    const dayMap = {
      'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed',
      'Thursday': 'Thu', 'Friday': 'Fri',
      'Mon': 'Mon', 'Tue': 'Tue', 'Wed': 'Wed', 'Thu': 'Thu', 'Fri': 'Fri',
    }
    if (dayMap[csvDay]) return dayMap[csvDay]
  }

  // Try to extract from startTime (format: "2026-03-09 09:00:00")
  if (startTime && startTime !== 'TBD') {
    const match = startTime.match(/2026-03-(\d{2})/)
    if (match) {
      const dateMap = { '09': 'Mon', '10': 'Tue', '11': 'Wed', '12': 'Thu', '13': 'Fri' }
      if (dateMap[match[1]]) return dateMap[match[1]]
    }
  }

  return 'TBD'
}

// --- Time parsing ---

function parseTime(csvTime) {
  if (!csvTime || csvTime === 'TBD') return 'TBD'
  // Format: "2026-03-09 09:00:00"
  const match = csvTime.match(/(\d{2}):(\d{2}):\d{2}$/)
  if (match) return `${match[1]}:${match[2]}`
  return 'TBD'
}

// --- Speaker parsing ---

function parseSpeakers(csvSpeakers) {
  if (!csvSpeakers || csvSpeakers === 'No speakers found for this session') return []
  // Format: "Name1(Company1), Name2(Company2)"
  return csvSpeakers.split(/,\s*(?=[A-Z])/).map(s => s.trim()).filter(Boolean)
}

// --- Room parsing ---

function parseRoom(csvLocation) {
  if (!csvLocation || csvLocation.trim() === '' || csvLocation === 'TBD') return 'TBD'
  return csvLocation.trim()
}

// --- Tag generation ---

function generateTags(title, description, tracks, speakers) {
  const tags = new Set()

  // Add track-derived tags
  if (tracks) {
    tracks.split(',').forEach(t => {
      const trimmed = t.trim().toLowerCase()
      if (trimmed) tags.add(trimmed)
    })
  }

  // Extract company names from speakers
  if (speakers) {
    const companies = speakers.match(/\(([^)]+)\)/g)
    if (companies) {
      companies.forEach(c => tags.add(c.replace(/[()]/g, '').trim()))
    }
  }

  // Add keyword tags from title
  const keywords = [
    'AI', 'ML', 'machine learning', 'VR', 'AR', 'XR', 'UE5', 'Unreal',
    'Unity', 'DirectX', 'Vulkan', 'ray tracing', 'path tracing', 'shader',
    'audio', 'narrative', 'design', 'indie', 'mobile', 'multiplayer',
    'networking', 'animation', 'procedural', 'accessibility', 'localization',
    'monetization', 'live service', 'free to play', 'Roblox', 'Fortnite',
  ]
  const titleLower = title.toLowerCase()
  keywords.forEach(kw => {
    if (titleLower.includes(kw.toLowerCase())) tags.add(kw)
  })

  return [...tags].slice(0, 8) // Cap at 8 tags
}

// --- Main ---

const csvPath = process.argv[2] || resolve(projectRoot, 'schedule.csv')
console.log(`Reading CSV from: ${csvPath}`)

let csvText
try {
  csvText = readFileSync(csvPath, 'utf-8')
  // Strip BOM if present
  if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1)
} catch (e) {
  console.error(`Error: Could not read ${csvPath}`)
  console.error('Usage: node scripts/import-csv.mjs [path-to-schedule.csv]')
  process.exit(1)
}

const rows = parseCSV(csvText)
const headers = rows[0].map(h => h.toLowerCase().trim().replace(/^"+|"+$/g, ''))
console.log(`Found ${rows.length - 1} data rows`)
console.log(`Headers: ${headers.join(', ')}`)

// Map header indices
const col = {}
const headerMap = {
  'session title': 'title',
  'start time': 'startTime',
  'end time': 'endTime',
  'duration': 'duration',
  'day': 'day',
  'description': 'description',
  'takeaway': 'takeaway',
  'intended audience': 'audience',
  'location': 'location',
  'tracks': 'tracks',
  'format': 'format',
  'passes': 'passes',
  'speakers': 'speakers',
  'gdc vault recording': 'recording',
}

headers.forEach((h, i) => {
  if (headerMap[h]) col[headerMap[h]] = i
})

console.log(`Mapped columns:`, col)

// Day counters for generating IDs
const dayCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, TBD: 0 }
const dayPrefixes = { Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', TBD: 'tbd' }

const sessions = []
const skipped = []

for (let r = 1; r < rows.length; r++) {
  const row = rows[r]
  if (row.length < 5) continue

  const get = (field) => (col[field] !== undefined && row[col[field]]) ? row[col[field]].trim() : ''

  const title = get('title')
  if (!title) continue

  // Skip cancelled sessions
  if (title.toLowerCase().startsWith('cancelation:') || title.toLowerCase().startsWith('cancellation:')) {
    skipped.push(title)
    continue
  }

  const rawDay = get('day')
  const rawStartTime = get('startTime')
  const rawEndTime = get('endTime')
  const description = get('description')
  const tracks = get('tracks')
  const format = get('format')
  const speakers = get('speakers')
  const location = get('location')

  const day = mapDay(rawDay, rawStartTime)
  const startTime = parseTime(rawStartTime)
  const endTime = parseTime(rawEndTime)

  dayCounts[day] = (dayCounts[day] || 0) + 1
  const id = `${dayPrefixes[day] || 'tbd'}-${String(dayCounts[day]).padStart(3, '0')}`

  const session = {
    id,
    title,
    description: description.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() || title,
    speakers: parseSpeakers(speakers),
    track: mapTrack(tracks),
    format: mapFormat(format),
    day,
    startTime,
    endTime,
    room: parseRoom(location),
    tags: generateTags(title, description, tracks, speakers),
  }

  sessions.push(session)
}

console.log(`\nProcessed ${sessions.length} sessions`)
console.log(`Skipped ${skipped.length} cancelled sessions:`)
skipped.forEach(s => console.log(`  - ${s}`))
console.log(`\nBy day:`)
Object.entries(dayCounts).filter(([, v]) => v > 0).forEach(([k, v]) => console.log(`  ${k}: ${v}`))

// Collect unique tracks and formats for verification
const uniqueTracks = new Set(sessions.map(s => s.track))
const uniqueFormats = new Set(sessions.map(s => s.format))
console.log(`\nUnique tracks used: ${[...uniqueTracks].sort().join(', ')}`)
console.log(`Unique formats used: ${[...uniqueFormats].sort().join(', ')}`)

// --- Generate sessions.ts ---

function escapeStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

let output = `// Auto-generated from schedule.csv — do not edit manually.
// Run: npm run import-csv
import type { Session } from '../types'

export const sessions: Session[] = [\n`

// Sort: by day order, then start time, then title
const dayOrder = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, TBD: 5 }
sessions.sort((a, b) => {
  const d = (dayOrder[a.day] ?? 5) - (dayOrder[b.day] ?? 5)
  if (d !== 0) return d
  if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime)
  return a.title.localeCompare(b.title)
})

for (const s of sessions) {
  output += `  {
    id: '${escapeStr(s.id)}',
    title: '${escapeStr(s.title)}',
    description: '${escapeStr(s.description)}',
    speakers: [${s.speakers.map(sp => `'${escapeStr(sp)}'`).join(', ')}],
    track: '${s.track}',
    format: '${s.format}',
    day: '${s.day}',
    startTime: '${s.startTime}',
    endTime: '${s.endTime}',
    room: '${escapeStr(s.room)}',
    tags: [${s.tags.map(t => `'${escapeStr(t)}'`).join(', ')}],
  },\n`
}

output += `]\n`

const outPath = resolve(projectRoot, 'src/data/sessions.ts')
writeFileSync(outPath, output, 'utf-8')
console.log(`\nWrote ${sessions.length} sessions to ${outPath}`)
