import { expect, it } from 'vitest'
import { createXmlUnresolvedReferenceFixture as fixture } from '../testing/xml-unresolved-reference-fixture'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const notice = (xml: string) => parseMusicXmlWithReport(xml).report.warnings
  .filter(warning => warning.message.startsWith('Unresolved XML text reference '))
const declarations = [
  ['numeric', '<!ENTITY word "앞&#233;뒤">'],
  ['predefined', '<!ENTITY word "앞&amp;뒤">'],
  ['chain', '<!ENTITY base "원문"><!ENTITY word "&base;">'],
  ['markup', '<!ENTITY word "&lt;script&gt;원문&lt;/script&gt;">']
]
it.each(declarations)('notices the unresolved %s source reference without restoring or rewriting it', (_kind, declaration) => {
  const xml = fixture(declaration!, '&word;'), score = parseMusicXml(xml)
  expect(score.title).toBe('&word;')
  expect(notice(xml)).toEqual([expect.objectContaining({
    code: 'unsupported-notation', path: 'score-partwise.work[1].work-title[1]',
    message: expect.stringContaining('(name="word", count=1)')
  })])
  expect(parseMusicXmlWithReport(xml).score).toEqual(score)
  const native = decodeNativeProject(encodeNativeProject(createNativeProject(score)))
  expect(native.score).toEqual(JSON.parse(JSON.stringify(score)))
  expect(serializeMidi(native.score)).toEqual(serializeMidi(score))
  const copy = serializeMusicXml(score)
  expect(parseMusicXml(copy).title).toBe('&word;'); expect(notice(copy)).toEqual([])
})
it.each(['composer', 'part-name', 'lyric', 'attribute'] as const)('locates unresolved %s data without changing the model', field => {
  const xml = fixture('<!ENTITY word "caf&#233;">', '&word;', field), warnings = notice(xml)
  expect(warnings).toHaveLength(1)
  const paths = {
    composer: 'score-partwise.identification[1].creator[1]',
    'part-name': 'score-partwise.part-list[1].score-part[1].part-name[1]',
    lyric: 'score-partwise.part[1].measure[1].note[1].lyric[1].text[1]',
    attribute: 'score-partwise.part-list[1].score-part[1].part-name[1].@font-family'
  }
  expect(warnings[0]?.path).toBe(paths[field])
  if (field === 'lyric') expect(warnings[0]).toMatchObject({ partNumber: 1, measureNumber: 1 })
  expect(parseMusicXmlWithReport(xml).score).toEqual(parseMusicXml(xml))
})
it.each([
  ['escaped', '&amp;word;'], ['CDATA', '<![CDATA[&word;]]>'],
  ['numeric amp', '&#38;word;'], ['literal NCR', '<![CDATA[&#0;]]>'],
  ['predefined name shape', '&amp;amp; &amp;lt; &amp;gt; &amp;quot; &amp;apos;']
])('does not mistake %s literal text for a source reference', (_kind, text) => {
  expect(notice(fixture('<!ENTITY word "caf&#233;">', text!))).toEqual([])
})
it.each(['&amp;word;', '<![CDATA[&word;]]>', '&#38;word;'])('does not misdiagnose supported plain declaration plus same-name %s literal', literal => {
  const xml = fixture('<!ENTITY word "원문">', `&word; ${literal}`)
  expect(parseMusicXml(xml).title).toBe('원문 &word;'); expect(notice(xml)).toEqual([])
})
it.each(['&amp;word;', '<![CDATA[&word;]]>', '&#38;word;'])('counts only actual unresolved references beside same-name %s literal', literal => {
  const warnings = notice(fixture('<!ENTITY word "caf&#233;">', `&word; &word; ${literal}`))
  expect(warnings).toHaveLength(1)
  expect(warnings[0]?.message).toContain('(name="word", count=2)')
})
it('keeps names independent and ignores declarations, comments and PI without a source leaf reference', () => {
  const declarations = '<!ENTITY word "caf&#233;"><!ENTITY other "caf&#233;">'
  const xml = fixture(declarations, '&word; &other; &amp;word; <!--&word;--><?test a="&word;"?>')
  expect(notice(xml).map(w => w.message)).toEqual([
    expect.stringContaining('(name="word", count=1)'), expect.stringContaining('(name="other", count=1)')
  ])
  expect(notice(fixture(declarations, '그대로 <!--&word;--><?test a="&word;"?>'))).toEqual([])
})
it('reports the existing positive measure address instead of its source ordinal', () => {
  const xml = fixture('<!ENTITY word "caf&#233;">', '&word;', 'lyric').replace('measure number="1"', 'measure number="10"')
  expect(notice(xml)[0]).toMatchObject({ partNumber: 1, measureNumber: 10,
    path: 'score-partwise.part[1].measure[1].note[1].lyric[1].text[1]' })
})
