import { expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { parseMusicXml, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { TICKS_PER_QUARTER } from '../score-core'

const symbols = [
  { root: 'C', kind: 'major', text: 'C' },
  { root: 'D', kind: 'minor-seventh', text: 'Dm7/G', bass: 'G' },
  { root: 'B', alter: -1, kind: 'dominant', text: 'Bb7/F#', bass: 'F', bassAlter: 1 },
  { root: 'F', kind: 'suspended-fourth', text: 'Fsus4' }
]
function source(legacy: boolean) {
  const harmonies = symbols.map((h, i) => `<harmony><root><root-step>${h.root}</root-step>${h.alter ? `<root-alter>${h.alter}</root-alter>` : ''}</root><kind${legacy ? ` text="${h.text}"` : ''}>${h.kind}</kind>${h.bass ? `<bass><bass-step>${h.bass}</bass-step>${h.bassAlter ? `<bass-alter>${h.bassAlter}</bass-alter>` : ''}</bass>` : ''}<offset>${i}</offset></harmony>`).join('')
  const notes = '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>'.repeat(4)
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>Generated harmony display study</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${harmonies}${notes}</measure></part></score-partwise>`
}

it.each(['standard', 'legacy-full'])('combines standard root/kind/bass display while preserving %s source musical and native data', kind => {
  const xml = source(kind === 'legacy-full'), score = parseMusicXml(xml), before = structuredClone(score)
  expect(score.harmonies?.map(h => h.tick)).toEqual(symbols.map((_, i) => i * TICKS_PER_QUARTER))
  expect(score.harmonies?.map(h => h.root?.step)).toEqual(symbols.map(h => h.root))
  expect(score.harmonies?.[2].bass).toEqual({ step: 'F', alter: 1 })
  const out = process.env.DDIRORI_HARMONY_DISPLAY_QA_DIR
  if (out) {
    // Explicit label oracle, not an assertion that the current parser is right.
    const expected = structuredClone(score)
    expected.harmonies!.forEach((h, i) => h.text = symbols[i].text)
    const dir = join(out, kind); mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.musicxml'), xml)
    writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(expected)))
    writeFileSync(join(dir, 'source.mid'), serializeMidi(expected))
  }
  expect(score.harmonies?.map(h => h.text)).toEqual(symbols.map(h => h.text))
  const native = encodeNativeProject(createNativeProject(score)), midi = serializeMidi(score)
  const imported = parseMusicXml(serializeMusicXml(score))
  expect(imported.harmonies).toEqual(score.harmonies)
  expect(serializeMidi(imported)).toEqual(midi)
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
  expect(score).toEqual(before)
})

const schema = resolve('src/musicxml/schema/musicxml-4.0')
const available = spawnSync('xmllint', ['--version']).status === 0
it.skipIf(!available).each([false, true])('validates the complete foreign harmony display input, legacy=%s', legacy => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-harmony-display-')), file = join(dir, 'input.musicxml')
  try {
    writeFileSync(file, source(legacy))
    const r = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file],
      { encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') } })
    expect(r.status, r.stderr).toBe(0)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

it.each([
  ['major', 'C'], ['minor', 'Cm'], ['dominant', 'C7'], ['major-seventh', 'Cmaj7'],
  ['minor-seventh', 'Cm7'], ['diminished', 'Cdim'], ['suspended-fourth', 'Csus4']
])('formats the existing editor vocabulary for standard %s', (kind, expected) => {
  const score = parseMusicXml(source(false).replace('<kind>major</kind>', `<kind>${kind}</kind>`))
  expect(score.harmonies?.[0]).toMatchObject({ text: expected, kind, root: { step: 'C' } })
})

it('preserves opaque custom text and unhandled kinds instead of claiming broader chord notation support', () => {
  const custom = parseMusicXml(source(false).replace('<kind>major</kind>', '<kind text="Original analysis">other</kind>'))
  expect(custom.harmonies?.[0]).toMatchObject({ text: 'Original analysis', kind: 'other', root: { step: 'C' } })
  const unsupported = parseMusicXml(source(false).replace('<kind>major</kind>', '<kind>Tristan</kind>'))
  expect(unsupported.harmonies?.[0]).toMatchObject({ text: 'Tristan', kind: 'Tristan', root: { step: 'C' } })
})
