import { expect, it } from 'vitest'
import { createXmlBodySyntaxFixture } from '../testing/xml-body-syntax-fixture'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const seed = createXmlBodySyntaxFixture('valid')
const title = (value: string) => seed.replace('Native part identifiers', value)
const invalid = ['앞\0뒤', '앞\u0001뒤', '앞\uFFFE뒤', '앞\uD800뒤',
  '앞&#0;뒤', '앞&#1;뒤', '앞&#xD800;뒤', '앞&#xFFFE;뒤', '앞&#1114112;뒤']
it.each(invalid)('rejects illegal XML 1.0 source characters or direct references: %j', value => {
  expect(() => parseMusicXml(title(value))).toThrow(/MusicXML 문서를 읽을 수 없습니다/)
  expect(() => parseMusicXmlWithReport(title(value))).toThrow(/MusicXML 문서를 읽을 수 없습니다/)
})
it.each(['composer', 'part name', 'lyric', 'attribute'] as const)('checks direct references in %s too', field => {
  const xml = field === 'composer' ? seed.replace('</work>', '</work><identification><creator type="composer">앞&#0;뒤</creator></identification>')
    : field === 'part name' ? seed.replace('Piano 1', '앞&#0;뒤')
    : field === 'lyric' ? seed.replace('</note>', '<lyric><text>앞&#0;뒤</text></lyric></note>')
    : seed.replace('<part-name>', '<part-name font-family="앞&#0;뒤">')
  expect(() => parseMusicXml(xml)).toThrow(/MusicXML 문서를 읽을 수 없습니다/)
})
const controls = [
  ['tab', '앞\t뒤', '앞\t뒤'], ['numeric emoji', '앞&#x1F3B5;뒤', '앞🎵뒤'],
  ['CR reference', '앞&#13;뒤', '앞\r뒤'], ['discouraged valid FDD0', '앞&#xFDD0;뒤', '앞\uFDD0뒤'],
  ['escaped literal', '앞&amp;#0;뒤', '앞&#0;뒤'],
  ['CDATA literal', '<![CDATA[앞&#0;뒤]]>', '앞&#0;뒤'],
  ['comment literal', '앞<!--&#0;-->뒤', '앞뒤']
]
it.each(controls)('keeps valid %s without turning literal text into references', (_kind, source, expected) => {
  const { score, report } = parseMusicXmlWithReport(title(source!))
  expect(score.title).toBe(expected); expect(report.warnings).toEqual([])
  const native = encodeNativeProject(createNativeProject(score))
  expect(decodeNativeProject(native).score).toEqual(JSON.parse(JSON.stringify(score)))
  const copy = parseMusicXml(serializeMusicXml(score))
  expect(copy.title).toBe(expected); expect(serializeMidi(copy)).toEqual(serializeMidi(score))
})
it('checks forbidden literal characters even inside CDATA and comments', () => {
  expect(() => parseMusicXml(title('<![CDATA[앞\0뒤]]>'))).toThrow(/MusicXML 문서를 읽을 수 없습니다/)
  expect(() => parseMusicXml(title('앞<!--\0-->뒤'))).toThrow(/MusicXML 문서를 읽을 수 없습니다/)
})
it('retains internal plain entities and does not change the next document', () => {
  const xml = seed.replace('<score-partwise', '<!DOCTYPE score-partwise [<!ENTITY word "원문">]><score-partwise').replace('Native part identifiers', '&word;')
  expect(parseMusicXml(xml).title).toBe('원문')
  expect(parseMusicXml(seed).title).toBe('Native part identifiers')
})
it('does not claim a new XML 1.1 policy by changing its existing NCR behavior', () => {
  const xml = title('앞&#1;뒤').replace('version="1.0"', 'version="1.1"')
  expect(parseMusicXml(xml).title).toBe('앞\u0001뒤')
})
