import {expect, it} from 'vitest'
import {mkdirSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createArpeggioFixture, type ArpeggioFixtureKind} from '../testing/arpeggio-fixture'
import {parseMusicXml, parseMusicXmlWithReport} from './parse'
import {serializeMusicXml} from './serialize'
import {createNativeProject, encodeNativeProject, decodeNativeProject} from '../project/schema'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {createPlaybackTimeline} from '../renderer/src/playback/timeline'
const warnings = (xml: string) => parseMusicXmlWithReport(xml).report.warnings.filter(w => w.message.startsWith('Unrepresented additional notation '))
it.each(['arpeggiate', 'arpeggiate-down', 'non-arpeggiate', 'glissando', 'slide'] as ArpeggioFixtureKind[])('reports lost %s at each original note while preserving normalized music', kind => {
  const xml = createArpeggioFixture(kind), plain = xml.replace(/<notations>.*?<\/notations>/g, ''), score = parseMusicXml(xml), marks = warnings(xml), type = kind === 'arpeggiate-down' ? 'arpeggiate' : kind
  const indices = kind.startsWith('arpeggiate') ? [1, 2, 3] : kind === 'non-arpeggiate' ? [1, 3] : [1, 4]
  expect(marks).toHaveLength(indices.length)
  expect(marks.map(w => ({part: w.partNumber, bar: w.measureNumber, event: w.eventIndex, path: w.path}))).toEqual(indices.map(n => ({part: 2, bar: 2, event: n, path: `part[2].measure[2].note[${n}].notations[1].${type}[1]`})))
  expect(marks[0].message).toContain(type); if (kind === 'arpeggiate-down') expect(marks[0].message).toContain('down')
  expect(score).toEqual(parseMusicXml(plain)); expect(createPlaybackTimeline(score)).toEqual(createPlaybackTimeline(parseMusicXml(plain))); expect(serializeMidi(score)).toEqual(serializeMidi(parseMusicXml(plain)))
  const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))); expect(native.score).toEqual(score)
  const copy = serializeMusicXml(score); expect(copy).not.toMatch(/<(?:arpeggiate|non-arpeggiate|glissando|slide)(?:\s|>)/); expect(serializeMidi(parseMusicXml(copy))).toEqual(serializeMidi(score))
  const dir = process.env.STUDIO_ARPEGGIO_QA_DIR
  if (dir && ['arpeggiate-down', 'glissando'].includes(kind)) { mkdirSync(dir, {recursive: true}); writeFileSync(join(dir, kind + '.musicxml'), xml, {flag: 'wx'}); writeFileSync(join(dir, kind + '-expected.chromatics'), encodeNativeProject(native), {flag: 'wx'}) }
})
it('does not invent a warning for ordinary chords', () => expect(warnings(createArpeggioFixture('control'))).toEqual([]))
it('keeps supported staccato separate from missing additional notation', () => expect(warnings(createArpeggioFixture('control').replace('<type>quarter</type>', '<type>quarter</type><notations><articulations><staccato/></articulations></notations>'))).toEqual([]))
it('keeps repeated notation containers and source occurrences distinct', () => {
  const xml = createArpeggioFixture().replace('<notations><arpeggiate direction="up" number="1"/></notations>', '<notations><arpeggiate direction="up" number="1"/></notations><notations><arpeggiate direction="down" number="2"/></notations>')
  expect(warnings(xml)).toHaveLength(4); expect(warnings(xml)[1]).toMatchObject({partNumber: 2, measureNumber: 2, eventIndex: 1, path: 'part[2].measure[2].note[1].notations[2].arpeggiate[1]'})
})

it('reports attribute-free arpeggio signs rather than treating empty XML content as absence', () => {
  const xml = createArpeggioFixture().replaceAll(' direction="up" number="1"', '')
  expect(warnings(xml)).toHaveLength(3)
})
