import { expect, it } from 'vitest'
import { createNewScore } from '../renderer/src/editor/new-score'
import { musicXmlPrintBreaksKey, serializeMusicXmlWithReport } from './serialize'

const fixture = () => createNewScore({ title: 'Copy break identity', templateId: 'piano-grand-staff', measureCount: 4, keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })

it('musicxml.break-copy-key treats reordered duplicate, lower-staff and generic anchors as the same actual print output', () => {
  const score = fixture(), other = structuredClone(score)
  score.layout = { systemBreakBeforeMeasureIds: score.parts[0]!.staves[1]!.measures.slice(1,3).map(m => m.id) }
  other.layout = { systemBreakBeforeMeasureIds: ['measure-3', other.parts[0]!.staves[0]!.measures[1]!.id, 'measure-3'] }
  const before = structuredClone([score, other])
  expect(serializeMusicXmlWithReport(score).contents).toBe(serializeMusicXmlWithReport(other).contents)
  expect(musicXmlPrintBreaksKey(score)).toBe(musicXmlPrintBreaksKey(other))
  expect([score, other]).toEqual(before)
})

it('musicxml.break-copy-key distinguishes actual new-page and new-system at the same position', () => {
  const score = fixture(), other = structuredClone(score), id = score.parts[0]!.staves[0]!.measures[1]!.id
  score.layout = { systemBreakBeforeMeasureIds: [id] }
  other.layout = { pageBreakBeforeMeasureIds: [id] }
  expect(serializeMusicXmlWithReport(score).contents).not.toBe(serializeMusicXmlWithReport(other).contents)
  expect(musicXmlPrintBreaksKey(score)).not.toBe(musicXmlPrintBreaksKey(other))
})

it('musicxml.break-copy-key ignores unprinted stale anchors while retaining the existing loss warnings', () => {
  const score = fixture(), other = structuredClone(score)
  other.layout = { systemBreakBeforeMeasureIds: ['missing-system'], pageBreakBeforeMeasureIds: ['missing-page'] }
  const result = serializeMusicXmlWithReport(other)
  expect(result.contents).toBe(serializeMusicXmlWithReport(score).contents)
  expect(result.report.warnings.map(w => w.measureId)).toEqual(['missing-system', 'missing-page'])
  expect(musicXmlPrintBreaksKey(score)).toBe(musicXmlPrintBreaksKey(other))
})
