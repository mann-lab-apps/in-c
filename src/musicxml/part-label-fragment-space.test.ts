import { expect, it } from 'vitest'
import { createNativePartIdFixture } from '../testing/native-part-id-fixture'
import { parseMusicXmlWithReport, serializeMusicXml, serializeMusicXmlWithReport } from './index'
import { expandScoreRepeatsForMusicXml } from './expand-repeats'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { readTestMidiEvents } from '../testing/midi-events'

const seed = serializeMusicXml(createNativePartIdFixture(['P1', 'P2']))
const fields = ['name', 'abbreviation'] as const
const cases = [
  ['CDATA', 'Piano <![CDATA[One]]>', 'Piano One'],
  ['PI', 'Piano <?test ok?> One', 'Piano  One'],
  ['PI quoted data', 'Piano <?test a="b"?>One', 'Piano One'],
  ['comment', 'Piano <!--x--> One', 'Piano  One'],
  ['literal and NCR', 'Piano <![CDATA[&#0;]]> &#x1F3B5; One', 'Piano &#0; 🎵 One'],
  ['outer trim', '  Piano One  ', 'Piano One']
]
function source(field: typeof fields[number], text: string): string {
  return field === 'name' ? seed.replace('<part-name>Piano 1</part-name>', '<part-name>' + text + '</part-name>')
    : seed.replace('<part-name>Piano 1</part-name>', '<part-name>Piano 1</part-name><part-abbreviation>' + text + '</part-abbreviation>')
}
it.each(fields.flatMap(field => cases.map(([kind, text, expected]) => ({ field, kind, text: text!, expected: expected! }))))('keeps $field $kind and all neighboring musical data', ({ field, text, expected }) => {
  const xml = source(field, text), control = source(field, expected.replaceAll('&', '&amp;'))
  const parsed = parseMusicXmlWithReport(xml), scalar = parseMusicXmlWithReport(control)
  expect(parsed.score.parts[0]![field]).toBe(expected)
  expect(parsed).toEqual(scalar)
  expect(parsed.score.parts.map(part => part.id)).toEqual(['P1', 'P2'])
  const native = encodeNativeProject(createNativeProject(parsed.score))
  expect(decodeNativeProject(native).score).toEqual(JSON.parse(JSON.stringify(parsed.score)))
  for (const mode of ['preserve', 'expanded'] as const) {
    const copy = mode === 'preserve' ? serializeMusicXml(parsed.score) : serializeMusicXmlWithReport(expandScoreRepeatsForMusicXml(parsed.score)).contents
    expect(parseMusicXmlWithReport(copy).score).toEqual(scalar.score)
  }
  expect(serializeMidi(parsed.score)).toEqual(serializeMidi(scalar.score))
  expect(readTestMidiEvents(serializeMidi(parsed.score))).toEqual(readTestMidiEvents(serializeMidi(parseMusicXmlWithReport(seed).score)))
})
it.each(['', '  '])('keeps existing Native empty abbreviation and XML omission policy for %j', text => {
  const score = parseMusicXmlWithReport(source('abbreviation', text)).score
  expect(score.parts[0]!.abbreviation).toBe('')
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score.parts[0]!.abbreviation).toBe('')
  expect(parseMusicXmlWithReport(serializeMusicXml(score)).score.parts[0]!.abbreviation).toBeUndefined()
})
it('does not introduce an abbreviation when the source omits it', () => {
  expect(parseMusicXmlWithReport(seed).score.parts[0]!.abbreviation).toBeUndefined()
})
it('matches header labels by existing part IDs even with different header/body ordering', () => {
  const edited = seed.replace('Piano 1', 'Piano <![CDATA[One]]>').replace('Piano 2', 'Piano <?test a="b"?>Two')
  const headers = edited.match(/<score-part id="[^"]+">[\s\S]*?<\/score-part>/g)!
  expect(headers).toHaveLength(2)
  const xml = edited.replace(headers[0]!, '__SECOND_HEADER__').replace(headers[1]!, headers[0]!).replace('__SECOND_HEADER__', headers[1]!)
  expect(xml.indexOf('<score-part id="P2">')).toBeLessThan(xml.indexOf('<score-part id="P1">'))
  expect(xml.indexOf('<part id="P1">')).toBeLessThan(xml.indexOf('<part id="P2">'))
  const score = parseMusicXmlWithReport(xml).score
  expect(score.parts.map(part => [part.id, part.name])).toEqual([['P1', 'Piano One'], ['P2', 'Piano Two']])
})
