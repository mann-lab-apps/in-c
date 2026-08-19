import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultOpsDir = resolve(
  repoRoot,
  'docs/product/promotion/validation-ops'
)

const positive = new Set(['yes', 'conditional'])
const positiveGap = new Set(['yes', 'partial'])
const paidRanges = new Set([
  '10000_30000',
  '30000_50000',
  '50000_100000',
  'over_100000'
])
const strongNegative = new Set(['too_many', 'bad_fit', 'privacy', 'annoying'])
const weakActionFields = ['clicked', 'saved', 'shared', 'inquired']

export function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      row.push(cell)
      cell = ''
      continue
    }

    if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    if (char !== '\r') {
      cell += char
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows
}

export function stringifyCsv(rows) {
  return `${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')}\n`
}

export function csvRecords(text) {
  const rows = parseCsv(text)
  const [headers, ...records] = rows

  if (!headers) {
    return []
  }

  return records
    .map((record) =>
      Object.fromEntries(
        headers.map((header, index) => [header, record[index]?.trim() ?? ''])
      )
    )
    .filter((record) => Object.values(record).some((value) => value !== ''))
}

export function summarizeValidationOpsFromTables(tables) {
  const suppliers = rowsWithCode(tables.suppliers ?? [], 'supplier_code')
  const demand = rowsWithCode(tables.demand ?? [], 'demand_code')
  const channelAudits = rowsWithCode(tables.channelAudits ?? [], 'audit_code')
  const opportunities = rowsWithCode(
    tables.opportunities ?? [],
    'opportunity_code'
  )
  const participants = rowsWithCode(
    tables.participants ?? [],
    'participant_code'
  )
  const dispatches = rowsWithDispatch(tables.dispatches ?? [])
  const opportunityTypes = new Map(
    opportunities.map((row) => [row.opportunity_code, row.type])
  )
  const weakActions = dispatches.filter(hasWeakAction)
  const continueRequests = dispatches.filter(
    (row) => normalize(row.continue_request) === 'yes'
  )
  const negativeReactions = dispatches.filter((row) =>
    strongNegative.has(normalize(row.negative_reaction))
  )
  const weakActionTypes = new Set(
    weakActions
      .map((row) => opportunityTypes.get(row.opportunity_code))
      .filter(Boolean)
  )
  const dispatchedTypes = new Set(
    dispatches
      .map((row) => opportunityTypes.get(row.opportunity_code))
      .filter(Boolean)
  )

  return [
    numericMetric({
      metric: 'supplier_interview_count',
      sourceFile: 'supplier-interviews.csv',
      countRule: 'non-empty supplier_code rows',
      threshold: '5',
      actual: suppliers.length,
      evidenceNotes: `${suppliers.length} supplier interview row(s)`
    }),
    numericMetric({
      metric: 'supplier_register_intent',
      sourceFile: 'supplier-interviews.csv',
      countRule: 'would_register_again is yes or conditional',
      threshold: '3',
      actual: countWhere(suppliers, (row) =>
        positive.has(normalize(row.would_register_again))
      ),
      evidenceNotes: 'Counts yes and conditional as positive'
    }),
    numericMetric({
      metric: 'supplier_paid_intent',
      sourceFile: 'supplier-interviews.csv',
      countRule: 'wtp_range is 10000_30000 or higher',
      threshold: '1',
      actual: countWhere(suppliers, (row) =>
        paidRanges.has(normalize(row.wtp_range))
      ),
      evidenceNotes: 'Excludes 0, under_10000, unknown, and blank'
    }),
    numericMetric({
      metric: 'demand_interview_count',
      sourceFile: 'demand-interviews.csv',
      countRule: 'non-empty demand_code rows',
      threshold: '10',
      actual: demand.length,
      evidenceNotes: `${demand.length} demand interview row(s)`
    }),
    numericMetric({
      metric: 'demand_push_useful',
      sourceFile: 'demand-interviews.csv',
      countRule: 'push_acceptance is yes or conditional',
      threshold: '5',
      actual: countWhere(demand, (row) =>
        positive.has(normalize(row.push_acceptance))
      ),
      evidenceNotes: 'Counts yes and conditional as positive'
    }),
    numericMetric({
      metric: 'demand_keep_receiving',
      sourceFile: 'demand-interviews.csv',
      countRule: 'keep_receiving_intent is yes or conditional',
      threshold: '3',
      actual: countWhere(demand, (row) =>
        positive.has(normalize(row.keep_receiving_intent))
      ),
      evidenceNotes: 'Counts yes and conditional as positive'
    }),
    numericMetric({
      metric: 'channel_audit_count',
      sourceFile: 'channel-audit.csv',
      countRule: 'non-empty audit_code rows',
      threshold: '30',
      actual: channelAudits.length,
      evidenceNotes: `${channelAudits.length} public channel audit row(s)`
    }),
    numericMetric({
      metric: 'channel_gap_observed',
      sourceFile: 'channel-audit.csv',
      countRule: 'observed_gap is yes or partial',
      threshold: '10',
      actual: countWhere(channelAudits, (row) =>
        positiveGap.has(normalize(row.observed_gap))
      ),
      evidenceNotes: 'Counts yes and partial as observed substitute gaps'
    }),
    numericMetric({
      metric: 'opportunity_count',
      sourceFile: 'opportunity-inventory.csv',
      countRule: 'non-empty opportunity_code rows',
      threshold: '9',
      actual: opportunities.length,
      evidenceNotes: `${opportunities.length} opportunity row(s)`
    }),
    numericMetric({
      metric: 'matching_participant_count',
      sourceFile: 'matching-participants.csv',
      countRule: 'non-empty participant_code rows',
      threshold: '15',
      actual: participants.length,
      evidenceNotes: `${participants.length} participant row(s)`
    }),
    recordMetric({
      metric: 'dispatch_count',
      sourceFile: 'dispatch-log.csv',
      countRule: 'non-empty date_sent rows',
      threshold: 'record',
      actual: dispatches.length,
      status: dispatches.length > 0 ? 'pass' : 'unknown',
      evidenceNotes: `${dispatches.length} dispatched item(s)`
    }),
    recordMetric({
      metric: 'weak_action_count',
      sourceFile: 'dispatch-log.csv',
      countRule: 'clicked or saved or shared or inquired is yes',
      threshold: 'repeated',
      actual: weakActions.length,
      status:
        dispatches.length === 0
          ? 'unknown'
          : weakActions.length >= 2
            ? 'pass'
            : weakActions.length === 1
              ? 'weak'
              : 'fail',
      evidenceNotes: 'Repeated means at least two weak actions'
    }),
    recordMetric({
      metric: 'continue_request_count',
      sourceFile: 'dispatch-log.csv',
      countRule: 'continue_request is yes',
      threshold: 'record',
      actual: continueRequests.length,
      status:
        dispatches.length === 0
          ? 'unknown'
          : continueRequests.length > 0
            ? 'pass'
            : 'weak',
      evidenceNotes: `${continueRequests.length} continue request(s)`
    }),
    recordMetric({
      metric: 'strong_negative_count',
      sourceFile: 'dispatch-log.csv',
      countRule: 'negative_reaction is too_many bad_fit privacy or annoying',
      threshold: 'low',
      actual: negativeReactions.length,
      status:
        dispatches.length === 0
          ? 'unknown'
          : negativeReactions.length === 0
            ? 'pass'
            : negativeReactions.length <= 2
              ? 'weak'
              : 'fail',
      evidenceNotes: 'Low means zero preferred, one or two requires review'
    }),
    recordMetric({
      metric: 'cross_type_interest_graph',
      sourceFile: 'dispatch-log.csv',
      countRule: 'at least two opportunity types matched by same criteria',
      threshold: 'yes',
      actual: weakActionTypes.size >= 2 ? 'yes' : dispatches.length > 0 ? 'no' : '',
      status:
        dispatches.length === 0
          ? 'unknown'
          : weakActionTypes.size >= 2
            ? 'pass'
            : dispatchedTypes.size >= 2
              ? 'weak'
              : 'fail',
      evidenceNotes:
        weakActionTypes.size >= 2
          ? `Weak actions across types: ${[...weakActionTypes].join(';')}`
          : dispatchedTypes.size >= 2
            ? `Dispatched across types without cross-type weak actions: ${[
                ...dispatchedTypes
              ].join(';')}`
            : 'Manual review needed for same-criteria matching'
    })
  ]
}

export function renderMarkdownSummary(metrics) {
  const rows = metrics.map((metric) => [
    metric.metric,
    metric.actual,
    metric.threshold,
    metric.status,
    metric.evidence_notes
  ])

  return [
    '# in C validation ops summary',
    '',
    '| metric | actual | threshold | status | evidence |',
    '| --- | ---: | --- | --- | --- |',
    ...rows.map(
      ([metric, actual, threshold, status, evidence]) =>
        `| ${metric} | ${actual} | ${threshold} | ${status} | ${evidence} |`
    ),
    '',
    judgementHint(metrics),
    ''
  ].join('\n')
}

export function scorecardCsv(metrics) {
  const headers = [
    'metric',
    'source_file',
    'count_rule',
    'threshold',
    'actual',
    'status',
    'evidence_notes'
  ]

  return stringifyCsv([
    headers,
    ...metrics.map((metric) => headers.map((header) => metric[header] ?? ''))
  ])
}

function rowsWithCode(rows, field) {
  return rows.filter((row) => normalize(row[field]) !== '')
}

function rowsWithDispatch(rows) {
  return rows.filter(
    (row) =>
      normalize(row.date_sent) !== '' ||
      normalize(row.participant_code) !== '' ||
      normalize(row.opportunity_code) !== ''
  )
}

function countWhere(rows, predicate) {
  return rows.filter(predicate).length
}

function hasWeakAction(row) {
  return weakActionFields.some((field) => normalize(row[field]) === 'yes')
}

function numericMetric({
  metric,
  sourceFile,
  countRule,
  threshold,
  actual,
  evidenceNotes
}) {
  const numericThreshold = Number(threshold)

  return recordMetric({
    metric,
    sourceFile,
    countRule,
    threshold,
    actual,
    status:
      actual >= numericThreshold ? 'pass' : actual > 0 ? 'weak' : 'fail',
    evidenceNotes
  })
}

function recordMetric({
  metric,
  sourceFile,
  countRule,
  threshold,
  actual,
  status,
  evidenceNotes
}) {
  return {
    metric,
    source_file: sourceFile,
    count_rule: countRule,
    threshold,
    actual: String(actual),
    status,
    evidence_notes: evidenceNotes
  }
}

function judgementHint(metrics) {
  const byMetric = new Map(metrics.map((metric) => [metric.metric, metric]))
  const value = (metric) => byMetric.get(metric)?.status
  const dataStarted = [
    'supplier_interview_count',
    'demand_interview_count',
    'opportunity_count',
    'matching_participant_count',
    'dispatch_count'
  ].some((metric) => Number(byMetric.get(metric)?.actual ?? 0) > 0)

  if (!dataStarted) {
    return 'Judgement hint: 데이터 부족'
  }

  if (
    value('supplier_register_intent') === 'pass' &&
    value('demand_push_useful') === 'pass' &&
    value('weak_action_count') === 'pass' &&
    value('supplier_paid_intent') === 'pass' &&
    value('cross_type_interest_graph') === 'pass'
  ) {
    return 'Judgement hint: 플랫폼 가능성 강함'
  }

  if (
    value('supplier_register_intent') === 'pass' &&
    value('demand_push_useful') === 'pass' &&
    ['pass', 'weak'].includes(value('weak_action_count')) &&
    ['pass', 'weak'].includes(value('cross_type_interest_graph'))
  ) {
    return 'Judgement hint: 알림/매칭 구조 가능성 있음'
  }

  if (
    value('supplier_register_intent') === 'pass' ||
    value('demand_push_useful') === 'pass'
  ) {
    return 'Judgement hint: 문제는 있으나 플랫폼 구조 약함'
  }

  return 'Judgement hint: 이미 해결됨 또는 데이터 부족'
}

function escapeCsvCell(value) {
  const text = String(value)

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }

  return text
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase()
}

function readValidationOpsTables(dir) {
  const read = (name) => csvRecords(readFileSync(resolve(dir, name), 'utf8'))

  return {
    suppliers: read('supplier-interviews.csv'),
    demand: read('demand-interviews.csv'),
    channelAudits: read('channel-audit.csv'),
    opportunities: read('opportunity-inventory.csv'),
    participants: read('matching-participants.csv'),
    dispatches: read('dispatch-log.csv')
  }
}

function parseArgs(argv) {
  const args = { dir: defaultOpsDir, writeScorecard: false }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--dir') {
      args.dir = resolve(argv[index + 1])
      index += 1
      continue
    }

    if (arg === '--write-scorecard') {
      args.writeScorecard = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const metrics = summarizeValidationOpsFromTables(readValidationOpsTables(args.dir))

  if (args.writeScorecard) {
    writeFileSync(resolve(args.dir, 'scorecard.csv'), scorecardCsv(metrics))
  }

  process.stdout.write(renderMarkdownSummary(metrics))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
