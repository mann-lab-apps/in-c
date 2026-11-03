import { expect, it } from 'vitest'
import { legacySpanOrderFixture } from '../testing/legacy-span-order-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXml, serializeMusicXml, serializeMusicXmlWithReport } from './index'

it.each([['slur','equal'],['slur','reversed'],['hairpin','equal'],['hairpin','reversed']] as const)('rejects existing %s %s range before emitting any XML', (kind, order) => {
    const {source, repaired} = legacySpanOrderFixture(kind, order), before = structuredClone(source)
    const native = encodeNativeProject(createNativeProject(source))
    expect(decodeNativeProject(native).score).toEqual(source)
    for (const serialize of [serializeMusicXml, serializeMusicXmlWithReport]) {
      expect(() => serialize(source)).toThrow(/span endpoint|슬러.*끝점|헤어핀.*끝점/)
      expect(source).toEqual(before)
    }
    expect(serializeMidi(parseMusicXml(serializeMusicXml(repaired)))).toEqual(serializeMidi(repaired))
    expect(source).toEqual(before)
})
it.each(['8va','8vb','15ma','15mb'] as const)('keeps a valid one-note %s distinct from a zero-duration hairpin', type => {
  const {repaired:score} = legacySpanOrderFixture('hairpin','equal')
  score.octaveShifts = [{id:'one-note-octave',type,startEventId:'primary-bar-2-a',endEventId:'primary-bar-2-a'}]
  const before=structuredClone(score), reopened=parseMusicXml(serializeMusicXml(score))
  expect(reopened.octaveShifts).toHaveLength(1)
  expect(reopened.octaveShifts![0].type).toBe(type)
  expect(reopened.octaveShifts![0].startEventId).toBe(reopened.octaveShifts![0].endEventId)
  expect(serializeMidi(reopened)).toEqual(serializeMidi(score));expect(score).toEqual(before)
})
