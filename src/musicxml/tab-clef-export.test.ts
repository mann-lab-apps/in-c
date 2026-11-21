import { expect, it } from 'vitest'
import { createMidiWarningScore, midiWarningRestOracle } from '../testing/midi-warning-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidiWithReport } from '../renderer/src/midi/serialize-midi'
import { parseMusicXml, serializeMusicXml } from './index'

it('uses the MusicXML TAB enumeration for an existing native tab clef without changing its notes', () => {
  const score = decodeNativeProject(encodeNativeProject(createNativeProject(createMidiWarningScore('tab')))).score
  const before = structuredClone(score)
  const xml = serializeMusicXml(score)
  expect(xml).toContain('<sign>TAB</sign>')
  expect(xml).not.toContain('<sign>tab</sign>')
  expect(score).toEqual(before)
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(before)
  // Correct lexical output alone does not add a TAB import model.
  expect(() => parseMusicXml(xml)).toThrow('지원하지 않는 clef sign입니다: TAB')
})
it('retains the existing TAB MIDI omission separately from its later pitched measure', () => {
  const score = createMidiWarningScore('tab')
  const midi = serializeMidiWithReport(score)
  expect(midi.bytes).toEqual(serializeMidiWithReport(midiWarningRestOracle(score)).bytes)
  expect(midi.warnings.filter(w => w.code === 'unsupported-midi-clef')).toEqual([
    expect.objectContaining({ path: 'part[2].staff[1].measure[1].clef' })
  ])
})
it('keeps the otherwise identical pitched control round-trippable', () => {
  const score = createMidiWarningScore('tab')
  score.parts[1].staves[0].measures[0].clef = { sign: 'G', line: 2 }
  const reopened = parseMusicXml(serializeMusicXml(score))
  expect(serializeMidiWithReport(reopened).bytes).toEqual(serializeMidiWithReport(score).bytes)
  expect(reopened.parts[1].staves[0].measures[0].clef).toEqual({ sign: 'G', line: 2, octaveChange: undefined })
})
