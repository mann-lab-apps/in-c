import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'
import { measureDynamicsFixture } from '../testing/measure-dynamics-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXml, serializeMusicXml } from './index'

const scopes = ['filled-control', 'primary', 'passive', 'whole-first-bar'] as const
function fixture(scope: typeof scopes[number]) {
  const { source: score } = measureDynamicsFixture()
  // This fixture isolates timing. Manual span ownership and dynamic duplicate
  // behavior have separate native/engraving regressions.
  delete score.slurs; delete score.hairpins; delete score.dynamics
  score.title = `Generated empty voice exchange ${scope}`
  if (scope === 'primary') score.parts[0].staves[0].measures[0].voices[0].events = []
  if (scope === 'passive') score.parts[0].staves[1].measures[3].voices[0].events = []
  if (scope === 'whole-first-bar') for (const part of score.parts) for (const staff of part.staves) staff.measures[0].voices[0].events = []
  return score
}

it('preserves every MIDI onset/duration through the filled control XML exchange', () => {
  const scope = 'filled-control'
  const score = fixture(scope), before = structuredClone(score)
  const project = createNativeProject(score), native = encodeNativeProject(project)
  const midi = serializeMidi(score), xml = serializeMusicXml(score), reopened = parseMusicXml(xml)
  expect(serializeMidi(reopened)).toEqual(midi)
  expect(score).toEqual(before)
  expect(encodeNativeProject(project)).toBe(native)
  const root = process.env.DDIRORI_EMPTY_VOICE_EXCHANGE_QA_DIR
  if (root) {
    const dir = join(root, scope); mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), native)
    writeFileSync(join(dir, 'source.musicxml'), xml)
    writeFileSync(join(dir, 'source.mid'), midi)
    writeFileSync(join(dir, 'reopened.mid'), serializeMidi(reopened))
  }
})

it.each(['primary', 'passive', 'whole-first-bar'] as const)('keeps strict XML rejection and native/MIDI data for an empty voice: %s', scope => {
  const score = fixture(scope), before = structuredClone(score)
  const project = createNativeProject(score), native = encodeNativeProject(project), midi = serializeMidi(score)
  const error = `measure ${scope === 'passive' ? 4 : 1}의 리듬 정합성이 올바르지 않습니다: empty`
  expect(() => serializeMusicXml(score)).toThrow(error)
  expect(score).toEqual(before)
  expect(encodeNativeProject(project)).toBe(native)
  expect(serializeMidi(score)).toEqual(midi)
  const root = process.env.DDIRORI_EMPTY_VOICE_EXCHANGE_QA_DIR
  if (root) {
    const dir = join(root, scope); mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), native)
    writeFileSync(join(dir, 'source.mid'), midi)
    writeFileSync(join(dir, 'expected-blocked.txt'), error)
  }
})

const schema = resolve('src/musicxml/schema/musicxml-4.0')
const available = spawnSync('xmllint', ['--version'], { encoding: 'utf8' }).status === 0
it.skipIf(!available)('validates the filled control with the pinned offline XSD', () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-empty-voice-')), file = join(dir, 'source.musicxml')
  try {
    const xml = serializeMusicXml(fixture('filled-control')); writeFileSync(file, xml)
    const result = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file],
      { encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') } })
    expect(result.status, result.stderr).toBe(0)
    expect(readFileSync(file, 'utf8')).toBe(xml)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
