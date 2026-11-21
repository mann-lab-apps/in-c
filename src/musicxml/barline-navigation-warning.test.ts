import { expect, it } from 'vitest'
import { createBarlineFermataFixture as barline } from '../testing/barline-fermata-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { expressPianoScore } from '../renderer/src/playback/piano-expression'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'

const prefix = 'Unrepresented barline navigation marker '
const owner = 'part[1].measure[1].barline[1]'
function preservesCurrentProjection(xml: string, control: string): void {
  const actual = parseMusicXmlWithReport(xml).score, expected = parseMusicXmlWithReport(control).score
  expect(actual).toEqual(expected)
  expect(encodeNativeProject(createNativeProject(actual))).toBe(encodeNativeProject(createNativeProject(expected)))
  expect(serializeMusicXml(actual)).toBe(serializeMusicXml(expected))
  expect(serializeMidi(actual)).toEqual(serializeMidi(expected))
  expect(expressPianoScore(actual, createPlaybackTimeline(actual), false))
    .toEqual(expressPianoScore(expected, createPlaybackTimeline(expected), false))
}

it.each([
  { content: '<segno/>', location: 'right' as const, kinds: ['segno'] },
  { content: '<coda/>', location: 'right' as const, kinds: ['coda'] },
  { content: '<segno/><coda/>', location: 'right' as const, kinds: ['segno', 'coda'] },
  { content: '<segno/>', location: 'left' as const, kinds: ['segno'] },
  { content: '<coda/><repeat direction="backward"/>', location: 'right' as const, kinds: ['coda'] }
])('reports barline-owned target symbols without synthesizing a jump: $content $location', ({ content, location, kinds }) => {
  const xml = barline(content, location), warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings.map(w => w.path)).toEqual(kinds.map(kind => `${owner}.${kind}`))
  warnings.forEach((warning, index) => {
    expect(warning).toMatchObject({ code: 'unsupported-notation', partNumber: 1, measureNumber: 1 })
    expect(warning.eventIndex).toBeUndefined()
    expect(warning.message).toContain(prefix)
    expect(warning.message).toContain(`"kind":"${kinds[index]}"`)
    expect(warning.message).toContain(`"location":"${location}"`)
    expect(warning.message).toContain('No jump or target is synthesized.')
  })
  preservesCurrentProjection(xml, barline(content.replace(/<(?:segno|coda)\/>/g, ''), location))
})

it('retains paired labels, divisions and raw symbol attributes as diagnostics only', () => {
  const xml = barline('<segno color="#113355" default-x=" 0 "/>')
    .replace('location="right"', 'location="right" segno=" S " coda="inert" divisions="013440"')
  const warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(1)
  const payload = JSON.parse(warnings[0].message.slice(prefix.length).split(' is not retained')[0])
  expect(payload).toEqual({ kind: 'segno', location: 'right', label: ' S ', divisions: '013440', source: { '@_color': '#113355', '@_default-x': ' 0 ' } })
  preservesCurrentProjection(xml, xml.replace('<segno color="#113355" default-x=" 0 "/>', ''))
})

it('keeps the second barline and second part addresses distinct', () => {
  const first = barline(''), second = barline('<coda/>').replace('<attributes>', '<barline location="left"/><attributes>')
    .match(/<part id="P1">[\s\S]*?<\/part>/)![0].replace('id="P1"', 'id="P2"')
  const xml = first.replace('</part-list>', '<score-part id="P2"><part-name>Second</part-name></score-part></part-list>')
    .replace('</score-partwise>', second + '</score-partwise>')
  const warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(1)
  expect(warnings[0]).toMatchObject({ partNumber: 2, measureNumber: 1, path: 'part[2].measure[1].barline[2].coda' })
  expect(warnings[0].eventIndex).toBeUndefined()
  preservesCurrentProjection(xml, xml.replace('<coda/>', ''))
})

it('retains independent fermata, style and sound-jump loss warnings', () => {
  const xml = barline('<bar-style>light-light</bar-style><segno/><fermata/>')
    .replace('<note>', '<sound dalsegno="S"/><note>')
  const warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(4)
  expect(warnings.filter(w => w.message.startsWith(prefix))).toHaveLength(1)
  expect(warnings.some(w => w.path.endsWith('.fermata'))).toBe(true)
  expect(warnings.some(w => w.path.endsWith('.bar-style'))).toBe(true)
  expect(warnings.some(w => w.path.endsWith('sound[1].dalsegno'))).toBe(true)
  preservesCurrentProjection(xml, xml.replace('<segno/>', ''))
})

it.each([
  barline(''),
  barline('').replace('location="right"', 'location="right" segno="S" coda="C"'),
  barline('', 'right', true),
  barline('<repeat direction="backward"/>')
])('keeps absent symbols, inert labels, note fermata and ordinary repeat controls quiet', xml => {
  expect(parseMusicXmlWithReport(xml).report.warnings).toEqual([])
})
