import { expect, it } from 'vitest'
import { createXmlBodySyntaxFixture } from '../testing/xml-body-syntax-fixture'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const seed = createXmlBodySyntaxFixture('valid')
const fragments = [
  ['CDATA', '앞 <![CDATA[가운데]]> 뒤', '앞 가운데 뒤'],
  ['comment', '앞 <!--설명--> 뒤', '앞  뒤'],
  ['PI', '앞 <?test ok?> 뒤', '앞  뒤'],
  ['PI quoted data', '앞 <?test a="b"?> 뒤', '앞  뒤'],
  ['literal and NCR', '앞 <![CDATA[&#0;]]> &#x1F3B5; 뒤', '앞 &#0; 🎵 뒤']
]
const fields = ['title', 'composer'] as const
const source = (field: typeof fields[number], text: string) => field === 'title'
  ? seed.replace('Native part identifiers', text)
  : seed.replace('</work>', '</work><identification><creator type="composer">' + text + '</creator></identification>')
it.each(fields.flatMap(field => fragments.map(([kind, text, expected]) => ({ field, kind, text: text!, expected }))))('preserves $field $kind inner whitespace through model/native/XML/MIDI', ({ field, text, expected }) => {
  const xml = source(field, text), { score, report } = parseMusicXmlWithReport(xml)
  expect(score[field]).toBe(expected); expect(report.warnings).toEqual([])
  const native = encodeNativeProject(createNativeProject(score))
  expect(decodeNativeProject(native).score).toEqual(JSON.parse(JSON.stringify(score)))
  const copy = parseMusicXml(serializeMusicXml(score)); expect(copy[field]).toBe(expected)
  expect(serializeMidi(copy)).toEqual(serializeMidi(score))
})
it.each(fields.flatMap(field => ['  평문  ', '', '앞&#13;뒤'].map(text => ({ field, text }))))('keeps existing outer trim and empty/NCR policy for $field $text', ({ field, text }) => {
  const score = parseMusicXml(source(field, text))
  expect(score[field]).toBe(text === '' && field === 'composer' ? undefined : text === '앞&#13;뒤' ? '앞\r뒤' : text.trim())
})
it('keeps empty work-title precedence and restores the fallback movement-title only when work is absent', () => {
  const movement = '<movement-title>앞 <![CDATA[뒤]]></movement-title>'
  const emptyWork = seed.replace('Native part identifiers', '').replace('</work>', '</work>' + movement)
  expect(parseMusicXml(emptyWork).title).toBe('')
  const noWork = seed.replace(/<work>[\s\S]*?<\/work>/, movement)
  expect(parseMusicXml(noWork).title).toBe('앞 뒤')
})
