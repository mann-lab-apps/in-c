import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMusicXml, parseMusicXmlWithReport } from './parse'
import { createDirectSoundTempoFixture, type DirectSoundTempoCase } from '../testing/direct-sound-tempo-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

it.each(['initial', 'direct', 'matching', 'secondary', 'direction', 'pedal'] as DirectSoundTempoCase[])(
  'reports unrepresented direct tempo data for %s without changing current conversion', kind => {
  const { xml } = createDirectSoundTempoFixture(kind), baseline = parseMusicXml(xml), { score, report } = parseMusicXmlWithReport(xml)
  expect(score).toEqual(baseline)
  expect(encodeNativeProject(createNativeProject(score))).toBe(encodeNativeProject(createNativeProject(baseline)))
  expect(serializeMidi(score)).toEqual(serializeMidi(baseline))
  const out = process.env.DDIRORI_DIRECT_TEMPO_QA_DIR
  if (out) {
    const dir = join(out, kind); mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.musicxml'), xml)
    writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(baseline)))
    writeFileSync(join(dir, 'source.mid'), serializeMidi(baseline))
    writeFileSync(join(dir, 'warnings.json'), JSON.stringify(report, null, 2))
  }
  // Primary direct tempo is now represented by the approved hidden-mark path.
  // Secondary independent tempo still cannot alter the whole ensemble.
  const unsupported = kind === 'secondary'
  expect(report.warnings).toHaveLength(unsupported ? 1 : 0)
  if (unsupported) {
    expect(report.warnings[0]).toMatchObject({ code: 'unsupported-direction', measureNumber: 1,
      path: `part[${kind === 'secondary' ? 2 : 1}].measure[1].sound[1].tempo` })
    expect(report.warnings[0].message).toContain('Direct measure sound tempo is not represented separately')
    expect(report.warnings[0].message).toContain('60 quarter BPM')
  }
})

it.each([39, 241, 60.5, 0, 1001])('warns instead of clamping unsupported direct quarter BPM %s', bpm => {
  const { xml } = createDirectSoundTempoFixture('direct')
  const { score, report } = parseMusicXmlWithReport(xml.replace('tempo="60"', `tempo="${bpm}"`))
  expect(score.tempo?.bpm).toBe(120); expect(score.tempoEvents).toBeUndefined()
  expect(report.warnings).toHaveLength(1)
  expect(report.warnings[0].message).toContain(`${bpm} quarter BPM`)
})

it('keeps an out-of-measure direct instruction warned instead of moving it into the bar', () => {
  const { xml } = createDirectSoundTempoFixture('direct')
  const { score, report } = parseMusicXmlWithReport(xml.replace('<offset>1</offset>', '<offset>5</offset>'))
  expect(score.tempoEvents).toBeUndefined(); expect(report.warnings).toHaveLength(1)
  expect(report.warnings[0].path).toBe('part[1].measure[1].sound[1].tempo')
})

it('imports an eligible change while retaining a later unsupported value and its source index in warnings', () => {
  const { xml } = createDirectSoundTempoFixture('direct')
  const { score, report } = parseMusicXmlWithReport(xml.replace('</measure>', '<sound tempo="600"><offset>-2</offset></sound></measure>'))
  expect(score.tempoEvents).toHaveLength(1); expect(score.tempoEvents![0].bpm).toBe(60)
  expect(report.warnings).toHaveLength(1); expect(report.warnings[0].path).toBe('part[1].measure[1].sound[2].tempo')
  expect(report.warnings[0].message).toContain('600 quarter BPM')
})
