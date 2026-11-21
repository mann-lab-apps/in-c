import { expect, it } from 'vitest'
import { createNotationContainerFixture as fixture } from '../testing/notation-container-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { expressPianoScore } from '../renderer/src/playback/piano-expression'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'

const mark = '<fermata/>'
const base = 'part[1].measure[1].note[1].notations'
const prefix = 'Unrepresented notation editorial '
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
  { source: '<footnote font-style="italic">임시 편집자 주석</footnote>', kind: 'footnote', payload: { '#text': '임시 편집자 주석', '@_font-style': 'italic' } },
  { source: '<level>0</level>', kind: 'level', payload: '0' },
  { source: '<level bracket="yes"/>', kind: 'level', payload: { '@_bracket': 'yes' } },
  { source: '<footnote xml:space="preserve">  원문  </footnote>', kind: 'footnote', payload: { '#text': '  원문  ', '@_xml:space': 'preserve' } }
])('reports meaningful $kind content and attributes without changing the existing projection: $source', ({ source, kind, payload }) => {
  const xml = fixture([source + mark]), warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(1)
  expect(warnings[0]).toMatchObject({ code: 'unsupported-notation', path: `${base}.${kind}` })
  expect(warnings[0].message).toContain(prefix)
  expect(warnings[0].message).toContain(JSON.stringify({ kind, source: payload }))
  preservesProjection(xml, fixture([mark]))
})

it('distinguishes lost reference-only editorial scope without silently changing the current fermata model', () => {
  const xml = fixture(['<level reference="yes" bracket="yes">Reference only</level>' + mark])
  const warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(1)
  expect(warnings[0].message).toContain('Unrepresented notation editorial reference ')
  expect(warnings[0].message).toContain('"@_reference":"yes"')
  expect(warnings[0].path).toBe(`${base}.level`)
  // This is current-model preservation, not approval of source playback semantics.
  preservesProjection(xml, fixture([mark]))
})

it('keeps later containers and both editorial elements independently addressable', () => {
  const xml = fixture(['', '<footnote>Later note</footnote><level>critical</level>' + mark])
  expect(parseMusicXmlWithReport(xml).report.warnings.map(w => w.path))
    .toEqual([`${base}[2].footnote`, `${base}[2].level`])
  preservesProjection(xml, fixture([mark]))
})

it('reports editorial-only containers without inventing a musical mark or visibility loss', () => {
  const xml = fixture(['<footnote>Editorial only</footnote><level>critical</level>']).replace('<notations>', '<notations print-object="no">')
  const warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(2)
  expect(warnings.every(w => w.message.startsWith(prefix))).toBe(true)
  preservesProjection(xml, fixture(['']))
})

it('keeps actual second-part ownership', () => {
  const first = fixture([mark]), target = fixture(['<level>0</level>' + mark]).match(/<part id="P1">[\s\S]*?<\/part>/)![0].replace('id="P1"', 'id="P2"')
  const xml = first.replace('</part-list>', '<score-part id="P2"><part-name>Piano Two</part-name></score-part></part-list>')
    .replace('</score-partwise>', target + '</score-partwise>')
  expect(parseMusicXmlWithReport(xml).report.warnings.map(w => w.path))
    .toEqual(['part[2].measure[1].note[1].notations.level'])
  preservesProjection(xml, xml.replace('<level>0</level>', ''))
})

it.each(['', '<footnote/><level/>', '<level reference="no" type="single"/>'])('keeps empty/default-only editorial controls quiet: %s', editorial => {
  const xml = fixture([editorial + mark])
  expect(parseMusicXmlWithReport(xml).report.warnings).toEqual([])
  preservesProjection(xml, fixture([mark]))
})
