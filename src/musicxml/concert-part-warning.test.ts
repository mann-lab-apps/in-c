import { expect, it } from 'vitest'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

import { concertPartFixture, concertPartSettings } from '../testing/concert-part-fixture'

it('identifies lost written part metadata in a concert score without transposing the sounding note', () => {
  const before = parseMusicXmlWithReport(concertPartFixture(concertPartSettings))
  expect(before.report.warnings).toEqual([expect.objectContaining({
    code:'unsupported-notation', partNumber:1, measureNumber:1,
    path:'part[1].measure[1].attributes[1].for-part[1]',
    message:expect.stringMatching(/Unrepresented concert-score part settings .+?-2/)
  })])
  const control = parseMusicXmlWithReport(concertPartFixture(''))
  expect(control.report.warnings).toEqual([])
  expect(before.score).toEqual(control.score)
  expect(serializeMidi(before.score)).toEqual(serializeMidi(control.score))
  expect(parseMusicXmlWithReport(serializeMusicXml(before.score)).score).toEqual(control.score)
})

it('keeps ordinary written-score transpose distinct from optional concert-score part settings', () => {
  const result = parseMusicXmlWithReport(concertPartFixture('<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>', ''))
  expect(result.report.warnings).toEqual([])
  expect(result.score.parts[0].staves[0].measures[0].transposition).toEqual({diatonic:-1,chromatic:-2})
})
