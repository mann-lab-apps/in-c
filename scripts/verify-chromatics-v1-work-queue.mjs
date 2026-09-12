import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(new URL('..', import.meta.url).pathname)
const queuePath = resolve(
  rootDir,
  'docs/product/chromatics-commercial-v1-work-queue.md'
)

const allowedStatuses = new Set([
  'Todo',
  'In progress',
  'Done',
  'Partial',
  'Blocked external',
  'Manual QA required',
  'Post-V1'
])

const requiredColumns = [
  'ID',
  '문제명',
  '카테고리',
  'Reference 근거',
  '사용자 영향',
  '자동화 가능',
  '외부/수동 필요',
  '상태',
  '다음 action'
]

const requiredCategories = [
  'MusicXML Compatibility',
  'Same-Staff Multi-Voice',
  'Parts / Part View',
  'PDF / Page Setup',
  'Packaged App / Release QA'
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
  if (!existsSync(queuePath)) {
    fail(`Missing Commercial V1 work queue: ${queuePath}`)
  }

  const text = readFileSync(queuePath, 'utf8')
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| CV1-'))
    .map((line) => {
      const [
        id,
        title,
        category,
        reference,
        impact,
        automatable,
        manual,
        status,
        nextAction
      ] = splitRow(line)

      return {
        id,
        title,
        category,
        reference,
        impact,
        automatable,
        manual,
        status,
        nextAction
      }
    })

  const header = text
    .split(/\r?\n/)
    .find((line) => line.startsWith('| ID |'))

  if (!header) {
    fail('Work queue table must include the required header row')
  }

  const columns = splitRow(header)
  if (columns.join('\u0000') !== requiredColumns.join('\u0000')) {
    fail(`Work queue columns changed: ${columns.join(', ')}`)
  }

  if (rows.length < 8) {
    fail(`Expected at least 8 Commercial V1 queue rows, got ${rows.length}`)
  }

  const ids = new Set()
  const categories = new Set()
  const statuses = new Set()

  for (const row of rows) {
    if (ids.has(row.id)) {
      fail(`Duplicate queue id: ${row.id}`)
    }
    ids.add(row.id)
    categories.add(row.category)
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

  for (const category of requiredCategories) {
    if (!categories.has(category)) {
      fail(`Missing required queue category: ${category}`)
    }
  }

  for (const status of ['Manual QA required', 'Blocked external']) {
    if (!statuses.has(status)) {
      fail(`Expected at least one queue row with status: ${status}`)
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
        queue: 'docs/product/chromatics-commercial-v1-work-queue.md',
        rows: rows.length,
        categories: [...categories].sort(),
        statuses: [...statuses].sort(),
        automationQueueDrained: nextAutomatableRows.length === 0,
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
