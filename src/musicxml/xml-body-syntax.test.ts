import { expect, it } from 'vitest'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createXmlBodySyntaxFixture, malformedXmlKinds } from '../testing/xml-body-syntax-fixture'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'

it.each(malformedXmlKinds)('rejects malformed whole-score XML: %s in both import APIs', kind => {
  const xml = createXmlBodySyntaxFixture(kind)
  expect(() => parseMusicXml(xml)).toThrow(/MusicXML 문서를 읽을 수 없습니다/)
  expect(() => parseMusicXmlWithReport(xml)).toThrow(/MusicXML 문서를 읽을 수 없습니다/)
})

const valid = createXmlBodySyntaxFixture('valid')
const noDeclaration = valid.replace(/^<\?xml[^>]*>\s*/, '')
const controls = [
  ['ordinary', valid, 'Native part identifiers'],
  ['whitespace', ' \n' + noDeclaration + '\n ', 'Native part identifiers'],
  ['PI and comments', valid.replace('<score-partwise', '<?example mode="ok"?><!--before--><score-partwise') + '<!--after-->', 'Native part identifiers'],
  ['CDATA inside root', valid.replace(/<work-title>[^<]*<\/work-title>/, '<work-title><![CDATA[<&amp;]]></work-title>'), '<&amp;'],
  ['numeric references', valid.replace('Native part identifiers', '앞&#xD;&#x1F3B5;뒤'), '앞\r🎵뒤'],
  ['internal declared entity', '<!DOCTYPE score-partwise [<!ENTITY title "원문">]>' + noDeclaration.replace('Native part identifiers', '&title;'), '원문']
]
it.each(controls)('keeps valid %s and musical/Native round trips intact', (_kind, xml, title) => {
  const { score, report } = parseMusicXmlWithReport(xml!)
  expect(score.title).toBe(title)
  expect(report.warnings).toEqual([])
  expect(parseMusicXml(xml!)).toEqual(score)
  const native = encodeNativeProject(createNativeProject(score))
  expect(decodeNativeProject(native).score).toEqual(JSON.parse(JSON.stringify(score)))
  expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score))
})
