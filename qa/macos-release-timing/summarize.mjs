import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const directory = process.argv[2]
const original = JSON.parse(readFileSync(join(directory, 'run.json'), 'utf8'))
const exitCode = Number(readFileSync(join(directory, 'test-exit.txt'), 'utf8').trim())
const readRows = name => readFileSync(join(directory, name), 'utf8')
  .split('\n').filter(Boolean).map(line => JSON.parse(line))
const chronology = readRows('cases.jsonl')
const phases = readRows('phases.jsonl')
const caseResults = chronology.filter(row => row.kind === 'case-result')
const moduleResults = chronology.filter(row => row.kind === 'module-result')
const runEnd = chronology.findLast(row => row.kind === 'run-end')
assert(runEnd && caseResults.length > 0)
assert.equal(exitCode === 0, runEnd.reason === 'passed')
const targetCases = caseResults.map((result, index) => ({ result, index }))
  .filter(({ result }) => result.name.includes('studio.metadata-save-feedback')
    || result.name.includes('records the last phase of an intentional 15-second timeout'))
const tracked = targetCases.map(({ result, index }) => {
  const channel = original.mode === 'timeout' ? 'intentional-timeout'
    : result.name.includes('blocked save') ? 'save' : 'copy'
  const checkpoints = phases.filter(row => row.channel === channel)
  const predecessorCases = caseResults.slice(0, index)
    .filter(row => Number.isFinite(row.durationMs)).slice(-3)
  assert(checkpoints.every((row, position) => Number.isFinite(row.ms)
    && (position === 0 || row.ms >= checkpoints[position - 1].ms)))
  return { channel, ...result, checkpoints, lastCompletedPhase: checkpoints.at(-1) ?? null, predecessorCases }
})
assert.equal(tracked.length, original.mode === 'timeout' ? 1 : 2)
if (original.mode === 'timeout') {
  const [probe] = tracked
  assert.equal(exitCode, 1)
  assert.match(probe.error, /timed out in 15000ms/i)
  assert.equal(probe.lastCompletedPhase?.name, 'awaiting synthetic timeout')
  assert.equal(probe.predecessorCases.at(-1)?.state, 'passed')
}
if (original.mode === 'trace' && exitCode === 0) {
  assert(tracked.every(entry => entry.lastCompletedPhase?.name === 'complete'))
}
const summary = {
  ...original, exitCode, reason: runEnd.reason,
  totals: {
    modules: moduleResults.length,
    passed: caseResults.filter(row => row.state === 'passed').length,
    failed: caseResults.filter(row => row.state === 'failed').length,
    skipped: caseResults.filter(row => row.state === 'skipped').length,
  },
  tracked,
}
writeFileSync(join(directory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
console.log('Studio test timing receipt', JSON.stringify(summary))
