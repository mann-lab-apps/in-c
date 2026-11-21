import { expect, it } from 'vitest'
import { TICKS_PER_QUARTER } from '../score-core'
import { createMetronomeBeatUnitFixture } from '../testing/metronome-beat-unit-fixture'
import { createMetronomeTextFixture } from '../testing/metronome-text-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { tempoMarkingToQuarterBpm, createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { createPianoCommands } from '../renderer/src/playback/piano-transport'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const cases = [
  { unit:'128th', source:90, q:2.8125, bpm:2.8125, beatUnit:'quarter', dots:0 },
  { unit:'256th', source:240, q:3.75, bpm:3.75, beatUnit:'quarter', dots:0 },
  { unit:'512th', source:960, q:7.5, bpm:7.5, beatUnit:'quarter', dots:0 },
  { unit:'1024th', source:960, q:3.75, bpm:3.75, beatUnit:'quarter', dots:0 },
  { unit:'breve', source:90, q:720, bpm:720, beatUnit:'quarter', dots:0 },
  { unit:'long', source:90, q:1440, bpm:360, beatUnit:'whole', dots:0 },
  { unit:'maxima', source:90, q:2880, bpm:720, beatUnit:'whole', dots:0 },
  { unit:'maxima', source:234.375, q:7500, bpm:1000, beatUnit:'whole', dots:3 }
] as const

it.each(cases)('converts $unit=$source into existing fields without changing playback or native notes', entry => {
  const actual = parseMusicXmlWithReport(createMetronomeBeatUnitFixture(entry.unit, { text:String(entry.source), soundQuarter:entry.q }))
  const control = parseMusicXmlWithReport(createMetronomeTextFixture({ text:String(entry.bpm), beatUnit:entry.beatUnit, dots:entry.dots, soundQuarter:entry.q }))
  expect(actual.score).toEqual(control.score)
  expect(tempoMarkingToQuarterBpm(actual.score.tempo!)).toBe(entry.q)
  expect(actual.report.warnings).toEqual([expect.objectContaining({ partNumber:1, path:'part[1].measure[1].direction[1].direction-type[1].metronome.beat-unit', message:expect.stringContaining('Converted metronome beat unit ') })])
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(actual.score))).score).toEqual(actual.score)
  const copy = parseMusicXmlWithReport(serializeMusicXml(actual.score))
  expect(copy.score).toEqual(actual.score); expect(copy.report.warnings).toEqual([])
  const commands = (score: typeof actual.score) => createPianoCommands(createPlaybackTimeline(score), 0, tempoMarkingToQuarterBpm(score.tempo!), {})
  expect(commands(actual.score)).toEqual(commands(control.score))
  expect(commands(actual.score).find(command => command.type === 'off')?.time).toBeCloseTo(240 / entry.q, 9)
  if (entry.q < 60_000_000 / 16_777_215) expect(() => serializeMidi(actual.score)).toThrow('Invalid MIDI tempo')
  else expect(serializeMidi(actual.score)).toEqual(serializeMidi(control.score))
})

it.each([0,-1,234.376,1000])('rejects unrepresentable maxima=%s instead of silently applying a different clock', source => {
  expect(() => parseMusicXmlWithReport(createMetronomeBeatUnitFixture('maxima', { text:String(source) }))).toThrow('MusicXML 메트로놈 기준 음가를 정확히 환산할 수 없습니다:')
})

it('keeps strict numeric precedence, explicit words, hidden state, positioned events and independent sound/offset warnings', () => {
  const result = parseMusicXmlWithReport(createMetronomeBeatUnitFixture('breve', { text:'90', dots:1, soundQuarter:95, words:'Dolce', hidden:true, position:true, soundOffset:2 }))
  expect(result.score.tempo).toBeUndefined()
  expect(result.score.tempoEvents?.[0]).toMatchObject({ bpm:270, beatUnit:'whole', dots:0, text:'Dolce', tick:TICKS_PER_QUARTER / 2 })
  expect(result.score.tempoEvents?.[0].transparent).toBeUndefined()
  expect(result.report.warnings.map(warning => warning.message.split(' ')[0])).toEqual(['Converted','Independent'])
  expect(result.report.warnings[1].message).toContain('metronome=1080 quarter BPM, sound=95')
})

it('uses explicit sound quarter BPM for an approximate unsupported unit without claiming its original glyph is preserved', () => {
  const result = parseMusicXmlWithReport(createMetronomeBeatUnitFixture('long', { text:'ca. 90', soundQuarter:1440 }))
  expect(result.score.tempo).toMatchObject({ bpm:360, beatUnit:'whole', dots:0, text:'𝅝 = 360' })
  expect(result.report.warnings.some(warning => warning.message.startsWith('Converted metronome beat unit '))).toBe(true)
  expect(result.report.warnings.some(warning => warning.message.startsWith('Unrepresented metronome tempo text '))).toBe(true)
})

it('does not promote an unsupported secondary instruction or reject the primary clock because of it', () => {
  const result = parseMusicXmlWithReport(createMetronomeBeatUnitFixture('maxima', { text:'1000', secondary:true }))
  expect(result.score.tempo).toBeUndefined(); expect(result.score.tempoEvents).toBeUndefined()
  expect(result.report.warnings).toEqual([expect.objectContaining({ partNumber:2, message:expect.stringContaining('Unrepresented metronome beat unit ') })])
})

it('converts a native-out-of-range source number when its actual clock is representable without legacy clamping', () => {
  const result = parseMusicXmlWithReport(createMetronomeBeatUnitFixture('128th', { text:'1001' }))
  expect(result.score.tempo).toMatchObject({ bpm:31.28125, beatUnit:'quarter', dots:0 })
  expect(result.report.warnings).toHaveLength(1)
  expect(result.report.warnings[0].message).toContain('Converted metronome beat unit ')
})

it('preserves hidden conversion, raw prefix fallback and a genuinely independent playback offset', () => {
  const hidden = parseMusicXmlWithReport(createMetronomeBeatUnitFixture('breve', { text:'90', hidden:true }))
  expect(hidden.score.tempo).toMatchObject({ bpm:720, transparent:true })
  const prefix = parseMusicXmlWithReport(createMetronomeBeatUnitFixture('breve', { text:'90 circa' }))
  expect(prefix.score.tempo).toMatchObject({ bpm:720, text:'♩ = 720' })
  const position = parseMusicXmlWithReport(createMetronomeBeatUnitFixture('long', { text:'90', position:true, soundQuarter:1440, soundOffset:0 }))
  expect(position.report.warnings).toHaveLength(2)
  expect(position.report.warnings[1].message).toContain('Independent tempo offset')
})

it('inspects hidden secondary words without trying to materialize their unrepresentable clock', () => {
  const xml = createMetronomeBeatUnitFixture('maxima', { text:'1000', secondary:true, hidden:true, words:'Tempo' })
    .replace('<words>Tempo</words>', '<words color="#00000000">Tempo</words>')
  const result = parseMusicXmlWithReport(xml)
  expect(result.score.tempo).toBeUndefined()
  expect(result.report.warnings).toEqual([expect.objectContaining({ partNumber:2, message:expect.stringContaining('Unrepresented metronome beat unit ') })])
})

const schema = resolve('src/musicxml/schema/musicxml-4.0')
const fullXsdAvailable = spawnSync('xmllint', ['--version'], { encoding:'utf8' }).status === 0
it.skipIf(!fullXsdAvailable).each(cases)('validates $unit=$source source and converted copy against the full pinned offline XSD', entry => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-unit-conversion-'))
  try {
    const xml = createMetronomeBeatUnitFixture(entry.unit, { text:String(entry.source), soundQuarter:entry.q })
    for (const [name, contents] of [['source', xml], ['copy', serializeMusicXml(parseMusicXmlWithReport(xml).score)]]) {
      const file = join(dir, name + '.musicxml'); writeFileSync(file, contents)
      const checked = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], { encoding:'utf8', env:{ ...process.env, XML_CATALOG_FILES:join(schema, 'catalog.xml') } })
      expect(checked.status, checked.stderr).toBe(0)
    }
  } finally { rmSync(dir, { recursive:true, force:true }) }
})
