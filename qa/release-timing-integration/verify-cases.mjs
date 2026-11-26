import assert from 'node:assert/strict'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [mode, evidence] = process.argv.slice(2)
const read = name => readFileSync(join(evidence, name), 'utf8')
const rows = name => read(name).trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
const findings = []
function verifyCase(name, code, ...messages) {
  const log = read(name + '-console.log')
  assert.equal(Number(read(name + '.exit')), code, name)
  for (const message of messages) assert(log.includes(message), name + ' missing ' + message)
  const phases = name === 'init' ? [] : rows(name + '/phases.jsonl')
  findings.push({ name, exitCode: code, phases: phases.length, warnings: log.split('\n').filter(line => line.startsWith('::warning::')) })
  return phases
}

if (mode === 'timeout') {
  const phases = verifyCase('timeout', 1, 'Test timed out in 15000ms', 'Vitest exit code: 1')
  const summary = JSON.parse(read('timeout/summary.json'))
  const failed = summary.tracked.find(test => test.channel === 'save')
  assert.equal(summary.exitCode, 1)
  assert.equal(failed.state, 'failed')
  assert.match(failed.error, /timed out in 15000ms/i)
  assert.equal(failed.lastCompletedPhase.name, 'awaiting synthetic timeout')
  assert.equal(failed.predecessorCases.at(-1).state, 'passed')
  assert.equal(phases.at(-1).name, 'awaiting synthetic timeout')
} else {
  assert.equal(mode, 'faults')
  verifyCase('writers', 0, '2 passed', 'Could not record Studio test phases', 'Could not record Vitest case timing', 'Vitest exit code: 0')
  assert.equal(Number(read('writers/test-exit.txt')), 0)
  const passPhases = verifyCase('summary', 0, '2 passed', 'Could not summarize the Vitest timing evidence', 'Vitest exit code: 0')
  assert.equal(passPhases.filter(phase => phase.name === 'complete').length, 2)
  assert(statSync(join(evidence, 'summary/summary.json')).isDirectory())
  verifyCase('init', 0, 'Could not initialize the Studio timing directory', '2 passed')
  verifyCase('exit-record', 0, 'Could not save the Vitest exit code', 'Vitest exit code: 0', '2 passed')
  const partial = verifyCase('partial-summary', 1, 'Test timed out in 15000ms', 'Could not record Studio test phases', 'Could not summarize the Vitest timing evidence', 'Vitest exit code: 1')
  assert.equal(partial.at(-1).name, 'fixture ready')
  assert.equal(partial.at(-1).channel, 'save')
  assert.equal(partial.filter(phase => phase.name === 'complete').length, 1)
  assert.equal(Number(read('partial-summary/test-exit.txt')), 1)
  const failed = rows('partial-summary/cases.jsonl').find(row => row.kind === 'case-result' && row.state === 'failed')
  assert.match(failed.error, /timed out in 15000ms/i)
}
writeFileSync(join(evidence, 'qa-verification.json'), JSON.stringify(findings, null, 2) + '\n')
console.log('PASS Studio timing ' + mode, JSON.stringify(findings.map(({name,exitCode,phases}) => ({name,exitCode,phases}))))
