import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(new URL('..', import.meta.url).pathname)
const roadmapPath = resolve(
  rootDir,
  'docs/product/chromatics-musescore-parity-roadmap.md'
)

const requiredSections = [
  '## Reference Scope',
  '## Feature Area Map',
  '## Current Chromatics Capability',
  '## MuseScore Gap Matrix',
  '## Execution Queue',
  '## Current Loop Notes',
  '## External / Manual QA Requirements',
  '## Postponed / Research Items',
  '## Latest Verification Evidence',
  '## Sources'
]

const requiredColumns = [
  'ID',
  'Area',
  'MuseScore Reference Feature',
  'Chromatics Current State',
  'Gap',
  'User Workflow Impact',
  'Implementation Slice',
  'Test Strategy',
  'Status',
  'Next Action'
]

const allowedStatuses = new Set([
  'Todo',
  'In progress',
  'Partial',
  'Done',
  'Research',
  'External QA',
  'Manual QA required',
  'Postpone'
])

const requiredAreas = [
  'UI / Workspace',
  'Note Input',
  'Selection / Editing',
  'Notation Objects',
  'Parts',
  'Layout / Engraving',
  'File / Exchange',
  'Playback',
  'Customization'
]

function fail(message) {
  throw new Error(message)
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function main() {
  if (!existsSync(roadmapPath)) {
    fail(`Missing MuseScore parity roadmap: ${roadmapPath}`)
  }

  const text = readFileSync(roadmapPath, 'utf8')

  for (const section of requiredSections) {
    if (!text.includes(section)) {
      fail(`Missing required section: ${section}`)
    }
  }

  const header = text
    .split(/\r?\n/)
    .find((line) => line.startsWith('| ID | Area | MuseScore Reference Feature |'))

  if (!header) {
    fail('Missing MuseScore gap matrix header')
  }

  const columns = splitRow(header)
  if (columns.join('\u0000') !== requiredColumns.join('\u0000')) {
    fail(`Roadmap columns changed: ${columns.join(', ')}`)
  }

  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| MS-'))
    .map((line) => {
      const [
        id,
        area,
        referenceFeature,
        currentState,
        gap,
        impact,
        implementationSlice,
        testStrategy,
        status,
        nextAction
      ] = splitRow(line)

      return {
        id,
        area,
        referenceFeature,
        currentState,
        gap,
        impact,
        implementationSlice,
        testStrategy,
        status,
        nextAction
      }
    })

  if (rows.length < 14) {
    fail(`Expected at least 14 MuseScore parity rows, got ${rows.length}`)
  }

  const ids = new Set()
  const areas = new Set()
  const statuses = new Set()

  for (const row of rows) {
    if (ids.has(row.id)) {
      fail(`Duplicate roadmap id: ${row.id}`)
    }
    ids.add(row.id)
    areas.add(row.area)
    statuses.add(row.status)

    for (const [key, value] of Object.entries(row)) {
      if (!String(value).trim()) {
        fail(`${row.id} has empty ${key}`)
      }
    }

    if (!allowedStatuses.has(row.status)) {
      fail(`${row.id} has unsupported status: ${row.status}`)
    }
  }

  for (const area of requiredAreas) {
    if (!areas.has(area)) {
      fail(`Missing required MuseScore parity area: ${area}`)
    }
  }

  for (const status of ['Done', 'Research', 'External QA']) {
    if (!statuses.has(status)) {
      fail(`Expected at least one row with status: ${status}`)
    }
  }

  const requiredSourceUrls = [
    'https://handbook.musescore.org/',
    'https://handbook.musescore.org/navigation/the-user-interface',
    'https://handbook.musescore.org/basics/copy-and-paste',
    'https://handbook.musescore.org/en_gb/formatting/score-size-and-spacing'
  ]

  for (const sourceUrl of requiredSourceUrls) {
    if (!text.includes(sourceUrl)) {
      fail(`Missing required official source URL: ${sourceUrl}`)
    }
  }

  const nextAutomatableRows = rows
    .filter((row) => ['Todo', 'Partial', 'In progress'].includes(row.status))
    .map((row) => row.id)

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        status: 'passed',
        roadmap: 'docs/product/chromatics-musescore-parity-roadmap.md',
        rows: rows.length,
        areas: [...areas].sort(),
        statuses: [...statuses].sort(),
        parityAutomationQueueDrained: nextAutomatableRows.length === 0,
        nextAutomatableRows
      },
      null,
      2
    )
  )
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
