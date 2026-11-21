import { expect, it } from 'vitest'
import { createBarlineFermataFixture as fixture } from '../testing/barline-fermata-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { expressPianoScore } from '../renderer/src/playback/piano-expression'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'

const prefix = 'Unrepresented barline editorial '
const base = 'part[1].measure[1].barline[1]'
function preservesProjection(xml: string, control: string): void {
  const actual = parseMusicXmlWithReport(xml).score, expected = parseMusicXmlWithReport(control).score
  expect(actual).toEqual(expected)
  expect(encodeNativeProject(createNativeProject(actual))).toBe(encodeNativeProject(createNativeProject(expected)))
  expect(serializeMusicXml(actual)).toBe(serializeMusicXml(expected))
  expect(serializeMidi(actual)).toEqual(serializeMidi(expected))
  expect(expressPianoScore(actual, createPlaybackTimeline(actual), false))
    .toEqual(expressPianoScore(expected, createPlaybackTimeline(expected), false))
}

it.each([
  { source: '<footnote font-style="italic">편집자 주석</footnote>', kind: 'footnote', payload: { '#text': '편집자 주석', '@_font-style': 'italic' } },
  { source: '<level>0</level>', kind: 'level', payload: '0' },
  { source: '<level bracket="yes"/>', kind: 'level', payload: { '@_bracket': 'yes' } },
  { source: '<footnote xml:space="preserve">  원문  </footnote>', kind: 'footnote', payload: { '#text': '  원문  ', '@_xml:space': 'preserve' } }
])('retains barline-owned $kind source and address without changing current music: $source', ({ source, kind, payload }) => {
  const xml = fixture(source), warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(1)
  expect(warnings[0]).toMatchObject({ code: 'unsupported-notation', partNumber: 1, measureNumber: 1, path: `${base}.${kind}` })
  expect(warnings[0].eventIndex).toBeUndefined()
  expect(warnings[0].message).toContain(prefix)
  expect(warnings[0].message).toContain(JSON.stringify({ kind, source: payload }))
  preservesProjection(xml, fixture(''))
})

it('distinguishes reference-only barline information without deleting a note-owned fermata or changing its hold', () => {
  const xml = fixture('<level reference="yes">Original</level>', 'right', true)
  const warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(1)
  expect(warnings[0].message).toContain('Unrepresented barline editorial reference ')
  expect(warnings[0].path).toBe(`${base}.level`)
  expect(warnings[0].eventIndex).toBeUndefined()
  preservesProjection(xml, fixture('', 'right', true))
})

it('keeps a left barline as the owner of both source fields', () => {
  const xml = fixture('<footnote>Left</footnote><level>Critical</level>', 'left')
  expect(parseMusicXmlWithReport(xml).report.warnings.map(w => w.path)).toEqual([`${base}.footnote`, `${base}.level`])
  preservesProjection(xml, fixture('', 'left'))
})

it('retains the second barline and second part without inventing a note address', () => {
  const first = fixture(''), second = fixture('<level>0</level>').replace('<attributes>', '<barline location="left"/><attributes>')
    .match(/<part id="P1">[\s\S]*?<\/part>/)![0].replace('id="P1"', 'id="P2"')
  const xml = first.replace('</part-list>', '<score-part id="P2"><part-name>Second</part-name></score-part></part-list>')
    .replace('</score-partwise>', second + '</score-partwise>')
  const warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(1)
  expect(warnings[0]).toMatchObject({ partNumber: 2, path: 'part[2].measure[1].barline[2].level' })
  expect(warnings[0].eventIndex).toBeUndefined()
  preservesProjection(xml, xml.replace('<level>0</level>', ''))
})

it('retains independent note editorial, style, navigation and fermata diagnostics', () => {
  const xml = fixture('<bar-style>light-light</bar-style><footnote>Bar</footnote><level reference="yes">Original</level><segno/><fermata/>')
    .replace('<notations></notations>', '<notations><footnote>Note</footnote></notations>')
  const warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(6)
  expect(warnings.filter(w => w.message.startsWith(prefix)).map(w => w.path)).toEqual([`${base}.footnote`, `${base}.level`])
  expect(warnings.some(w => w.path === 'part[1].measure[1].note[1].notations.footnote')).toBe(true)
  for (const ending of ['.segno', '.fermata', '.bar-style']) expect(warnings.some(w => w.path.endsWith(ending))).toBe(true)
  preservesProjection(xml, xml.replace('<footnote>Bar</footnote><level reference="yes">Original</level>', ''))
})

it.each([
  fixture(''), fixture('<footnote/><level/>'), fixture('<level reference="no" type="single"/>'),
  fixture('<bar-style>regular</bar-style>'), fixture('<repeat direction="backward"/>'), fixture('', 'right', true)
])('keeps absent/default editorial, normal style/repeat and note-fermata controls quiet', xml => {
  expect(parseMusicXmlWithReport(xml).report.warnings).toEqual([])
})
