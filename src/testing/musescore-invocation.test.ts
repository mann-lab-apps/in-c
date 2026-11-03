import { expect, it, vi } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { buildMuseScoreConversionArgs, invokeMuseScoreConversion } from '../../scripts/musescore-invocation.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const script = join(root, 'scripts/verify-musescore-cli-fixtures.mjs')
const fixture = join(root, 'src/musicxml/fixtures/external-apps/musescore-4-7-5-cli-grand-staff-export.musicxml')
const digest = () => createHash('sha256').update(readFileSync(fixture)).digest('hex')

// This is an orchestration test, never an external compatibility run.
// A preload guard prevents even an accidental real application launch.
function failingOwnedNode(stale = false, zeroWithoutOutput = false, versionAbort = false) {
  const directory = mkdtempSync(join(tmpdir(), 'studio-musescore-command-policy-'))
  const output = join(directory, 'output'), log = join(directory, 'calls.jsonl')
  mkdirSync(output)
  const pdf = join(output, 'musescore-4-7-5-cli-grand-staff-export.pdf')
  const prior = Buffer.from('%PDF-owned-prior-artifact\n' + 'x'.repeat(1200) + '\n%%EOF')
  if (stale) writeFileSync(pdf, prior)
  const guard = join(directory, 'guard.cjs')
  writeFileSync(guard, `const cp=require('node:child_process'),fs=require('node:fs');
const original=cp.spawnSync;
cp.spawnSync=function(command,args,options){
 fs.appendFileSync(${JSON.stringify(log)},JSON.stringify({command,args})+'\\n');
 if(command!==process.execPath)throw Error('Owned command test forbids a real application');
 if(${JSON.stringify(versionAbort)}&&args.includes('--version'))return {pid:0,output:[],stdout:'',stderr:'owned version abort',status:null,signal:'SIGABRT'};
 if(${JSON.stringify(zeroWithoutOutput)}&&args.includes('-o'))return {pid:0,output:[],stdout:'',stderr:'',status:0,signal:null};
 return original.call(this,command,args,options);
};require('node:module').syncBuiltinESMExports();`)
  const before = digest()
  const result = spawnSync(process.execPath, ['--require', guard, script], {
    cwd: root, encoding: 'utf8', timeout: 12_000,
    env: { ...process.env, MUSESCORE_BIN: process.execPath,
      REQUIRE_MUSESCORE_CLI: '1', MUSESCORE_CLI_QA_OUTPUT_DIR: output,
      MUSESCORE_CLI_VERIFY_ALL: '0', MUSESCORE_CLI_FIXTURE_ID: 'musescore-4-7-5-cli-grand-staff-export' }
  })
  writeFileSync(join(directory, 'stdout.log'), result.stdout ?? '')
  writeFileSync(join(directory, 'stderr.log'), result.stderr ?? '')
  const calls = readdirSync(directory).includes('calls.jsonl')
    ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : []
  console.log('Owned mocked CLI policy artifacts (not MuseScore):', directory)
  expect(digest()).toBe(before)
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(1)
  expect(result.stdout).not.toContain('"status": "passed"')
  expect(calls.every(call => call.command === process.execPath)).toBe(true)
  return { directory, output, calls: calls.filter(call => call.args.includes('-o')), pdf, prior }
}

it('external CLI policy uses one non-resetting conversion and retains its failure diagnostics', () => {
  const { output, calls } = failingOwnedNode()
  expect.soft(calls).toHaveLength(1)
  expect.soft(calls.flatMap(call => call.args)).not.toContain('-F')
  expect.soft(calls.flatMap(call => call.args)).not.toContain('--factory-settings')
  const receipts = readdirSync(output).filter(name => name.endsWith('-attempt.json'))
  expect.soft(receipts).toHaveLength(1)
  if (receipts.length === 1) {
    const receipt = JSON.parse(readFileSync(join(output, receipts[0]), 'utf8'))
    expect(receipt.attempts).toHaveLength(1)
    expect(receipt.attempts[0].status).not.toBe(0)
    expect(receipt.attempts[0].stderr).toContain('bad option')
  }
})

it('external CLI policy rejects an existing output without converting or overwriting it', () => {
  const { calls, pdf, prior } = failingOwnedNode(true, true)
  expect(calls).toHaveLength(0)
  expect(readFileSync(pdf)).toEqual(prior)
})

it('external CLI policy does not accept exit zero without a newly produced file', () => {
  const { output, calls } = failingOwnedNode(false, true)
  expect(calls).toHaveLength(1)
  const receipts = readdirSync(output).filter(name => name.endsWith('-attempt.json'))
  expect(receipts).toHaveLength(1)
  const receipt = JSON.parse(readFileSync(join(output, receipts[0]), 'utf8'))
  expect(receipt.passed).toBe(false)
  expect(receipt.validationError).toContain('without a new output')
})

it('retains an aborted version probe and does not start conversion afterward', () => {
  const { output, calls } = failingOwnedNode(false, false, true)
  expect(calls).toHaveLength(0)
  const receipts = readdirSync(output).filter(name => name.endsWith('-version.json'))
  expect(receipts).toHaveLength(1)
  const receipt = JSON.parse(readFileSync(join(output, receipts[0]), 'utf8'))
  expect(receipt.status).toBeNull()
  expect(receipt.signal).toBe('SIGABRT')
  expect(receipt.stderr).toBe('owned version abort')
})

it('both command consumers share literal path arguments and one bounded invocation', () => {
  const inputPath = join(tmpdir(), 'owned score', '-F.mxl'), outputPath = join(tmpdir(), 'owned score', 'copy.musicxml')
  const raw = { pid: 0, output: [], stdout: '', stderr: 'owned diagnostic', status: null, signal: 'SIGABRT' as const }
  const execute = vi.fn((_binary: string, _args: string[], _options: { encoding: 'utf8'; timeout: number }) => raw)
  expect(invokeMuseScoreConversion({ binary: process.execPath, inputPath, outputPath, execute })).toBe(raw)
  expect(execute).toHaveBeenCalledOnce()
  const [binary, args, options] = execute.mock.calls[0]
  expect(binary).toBe(process.execPath)
  expect(args).toEqual(['--musicxml-use-default-font', '-o', outputPath, inputPath])
  expect(args).not.toContain('-F')
  expect(args).not.toContain('-R')
  expect(options).toEqual({ encoding: 'utf8', timeout: 90_000 })
})

it('rejects relative option-like paths and literal source/output aliasing before invoking anything', () => {
  const output = join(tmpdir(), 'copy.musicxml')
  expect(() => buildMuseScoreConversionArgs('-F', output)).toThrow(/absolute/)
  expect(() => buildMuseScoreConversionArgs(output, output)).toThrow(/differ/)
  const execute = vi.fn()
  expect(() => invokeMuseScoreConversion({ binary: process.execPath, inputPath: output, outputPath: output, execute })).toThrow(/differ/)
  expect(execute).not.toHaveBeenCalled()
})
