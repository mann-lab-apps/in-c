import { expect, it } from 'vitest'
import { createBarlineFermataFixture as fixture } from '../testing/barline-fermata-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { expressPianoScore } from '../renderer/src/playback/piano-expression'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'

const prefix = 'Unrepresented barline fermata '
const base = 'part[1].measure[1].barline[1].fermata'
function preservesProjection(xml: string, control: string): void {
  const actual = parseMusicXmlWithReport(xml).score, reference = parseMusicXmlWithReport(control).score
  expect(actual).toEqual(reference)
  expect(encodeNativeProject(createNativeProject(actual))).toBe(encodeNativeProject(createNativeProject(reference)))
  expect(serializeMusicXml(actual)).toBe(serializeMusicXml(reference))
  expect(serializeMidi(actual)).toEqual(serializeMidi(reference))
  expect(expressPianoScore(actual, createPlaybackTimeline(actual), false))
    .toEqual(expressPianoScore(reference, createPlaybackTimeline(reference), false))
}

it.each([
  { content: '<fermata/>', location: 'right' as const, note: false, paths: [base], beats: 4 },
  { content: '<fermata type="inverted"/>', location: 'right' as const, note: false, paths: [base], beats: 4 },
  { content: '<fermata/><fermata type="inverted"/>', location: 'right' as const, note: false, paths: [`${base}[1]`, `${base}[2]`], beats: 4 },
  { content: '<fermata/>', location: 'left' as const, note: false, paths: [base], beats: 4 },
  { content: '<fermata/>', location: 'right' as const, note: true, paths: [base], beats: 6 },
  { content: '<fermata/><repeat direction="backward"/>', location: 'right' as const, note: false, paths: [base], beats: 8 }
])('diagnoses separately owned barline marks without moving them to a note: $location $content note=$note', ({ content, location, note, paths, beats }) => {
  const xml = fixture(content, location, note), warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings.map(w => w.path)).toEqual(paths)
  for (const warning of warnings) {
    expect(warning).toMatchObject({ code: 'unsupported-notation', partNumber: 1, measureNumber: 1 })
    expect(warning.eventIndex).toBeUndefined()
    expect(warning.message).toContain(prefix)
    expect(warning.message).toContain(`"location":"${location}"`)
    expect(warning.message).toContain('"source":')
  }
  preservesProjection(xml, fixture(content.replace(/<fermata(?:\s[^>]*)?\/>/g, ''), location, note))
  expect(createPlaybackTimeline(parseMusicXmlWithReport(xml).score).totalBeats).toBe(beats)
})

it('retains lexical source text and attributes in technical information', () => {
  const xml = fixture('<fermata type=" inverted "> angled </fermata>')
  expect(parseMusicXmlWithReport(xml).report.warnings[0]?.message)
    .toContain('"source":{"#text":" angled ","@_type":" inverted "}')
  preservesProjection(xml, fixture(''))
})

it('uses the second barline address after an ordinary left barline', () => {
  const xml = fixture().replace('<attributes>', '<barline location="left"/><attributes>')
  expect(parseMusicXmlWithReport(xml).report.warnings.map(w => w.path))
    .toEqual(['part[1].measure[1].barline[2].fermata'])
  preservesProjection(xml, xml.replace('<fermata/>', ''))
})

it('retains a second-part owner without inventing a note address', () => {
  const first = fixture(''), part = fixture().match(/<part id="P1">[\s\S]*?<\/part>/)![0].replace('id="P1"', 'id="P2"')
  const xml = first.replace('</part-list>', '<score-part id="P2"><part-name>Piano Two</part-name></score-part></part-list>')
    .replace('</score-partwise>', part + '</score-partwise>')
  const warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(1)
  expect(warnings[0]).toMatchObject({ partNumber: 2, path: 'part[2].measure[1].barline[1].fermata' })
  expect(warnings[0].eventIndex).toBeUndefined()
  preservesProjection(xml, xml.replace('<fermata/>', ''))
})

it('keeps barline style loss independent from the omitted fermata', () => {
  const xml = fixture('<bar-style>light-light</bar-style><fermata/>'), warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(2)
  expect(warnings.some(w => w.message.startsWith(prefix))).toBe(true)
  expect(warnings.some(w => w.path.endsWith('.bar-style'))).toBe(true)
  preservesProjection(xml, xml.replace('<fermata/>', ''))
})

it.each([
  fixture(''), fixture('', 'right', true), fixture('<repeat direction="backward"/>'), fixture('<bar-style>regular</bar-style>')
])('keeps no-mark, normal note-only and repeat/style controls quiet', xml => {
  expect(parseMusicXmlWithReport(xml).report.warnings).toEqual([])
})
