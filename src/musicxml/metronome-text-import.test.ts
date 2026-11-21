import { expect, it } from 'vitest'
import { createMetronomeTextFixture, type MetronomeTextOptions } from '../testing/metronome-text-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { TICKS_PER_QUARTER as q } from '../score-core'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const cases = [
  { id:'range', text:'90–100', bpm:90, label:'♩ = 90–100' },
  { id:'suffix', text:'90 circa', bpm:90, label:'♩ = 90 circa' },
  { id:'range-sound', text:'90–100', soundQuarter:95, bpm:95, label:'♩ = 90–100' },
  { id:'approx-sound', text:'ca. 90', soundQuarter:90, bpm:90, label:'♩ = ca. 90' },
  { id:'approx-half', text:'ca. 45', soundQuarter:90, beatUnit:'half', bpm:45, label:'𝅗𝅥 = ca. 45' },
  { id:'approx-dotted-half', text:'ca. 20', soundQuarter:60, beatUnit:'half', dots:1, bpm:20, label:'𝅗𝅥. = ca. 20' },
  { id:'approx-sixteenth', text:'ca. 360', soundQuarter:90, beatUnit:'16th', bpm:360, label:'𝅘𝅥𝅯 = ca. 360' },
  { id:'hidden', text:'ca. 90', soundQuarter:90, hidden:true, bpm:90, label:'♩ = ca. 90' },
  { id:'position', text:'90–100', soundQuarter:95, position:true, bpm:95, label:'♩ = 90–100' }
] as const
const getMark = (score: ReturnType<typeof parseMusicXmlWithReport>['score'], position?: boolean) => position ? score.tempoEvents?.[0] : score.tempo
it.each(cases)('preserves $id text and authoritative numeric playback in existing fields', options => {
  const xml = createMetronomeTextFixture(options)
  expect(xml).toContain('<per-minute>' + options.text + '</per-minute>')
  const actual = parseMusicXmlWithReport(xml)
  const control = parseMusicXmlWithReport(createMetronomeTextFixture({ ...options, text:String(options.bpm) }))
  const expected = structuredClone(control.score)
  const mark = getMark(expected, 'position' in options)
  if (!mark) throw Error('Expected control tempo missing')
  mark.text = options.label
  expect(getMark(actual.score, 'position' in options)).toMatchObject({ bpm:options.bpm, text:options.label })
  if ('hidden' in options) expect(actual.score.tempo?.transparent).toBe(true)
  if ('position' in options) expect(actual.score.tempoEvents?.[0].tick).toBe(q / 2)
  expect(actual.score).toEqual(expected)
  expect(actual.report.warnings).toEqual([])
  expect(serializeMidi(actual.score)).toEqual(serializeMidi(expected))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(actual.score))).score).toEqual(expected)
  const copy = serializeMusicXml(actual.score)
  expect(parseMusicXmlWithReport(copy).score).toEqual(expected)
  expect(copy).toContain('print-object="no"')
})

it.each([39,90,90.5,360,1000])('leaves supported numeric %s unchanged', bpm => {
  const r = parseMusicXmlWithReport(createMetronomeTextFixture({ text:String(bpm) }))
  expect(r.score.tempo?.bpm).toBe(bpm); expect(r.report.warnings).toEqual([])
})
it.each(['90','ca. 90'])('does not let empty words mask %s or produce an invalid native label', text => {
  const r = parseMusicXmlWithReport(createMetronomeTextFixture({ text, soundQuarter:90,words:'' }))
  expect(r.score.tempo?.text).toBe(text === '90' ? '♩ = 90' : '♩ = ca. 90')
  expect(() => createNativeProject(r.score)).not.toThrow()
})

it('preserves strict numeric precedence and independent sound mismatch', () => {
  const r = parseMusicXmlWithReport(createMetronomeTextFixture({ text:'90', soundQuarter:95 }))
  expect(r.score.tempo?.bpm).toBe(90)
  expect(r.report.warnings).toEqual([expect.objectContaining({ message:expect.stringContaining('Independent sound tempo') })])
})
it('retains explicit words and reports separately lost visible metronome text', () => {
  const r = parseMusicXmlWithReport(createMetronomeTextFixture({ text:'90–100', soundQuarter:95, words:'Allegro' }))
  expect(r.score.tempo).toMatchObject({ bpm:95,text:'Allegro' })
  expect(r.report.warnings).toEqual([expect.objectContaining({ path:'part[1].measure[1].direction[1].direction-type[2].metronome.per-minute',message:expect.stringContaining('Unrepresented metronome tempo text ') })])
})
it('keeps a hidden metronome quiet when explicit words own the visible label', () => {
  const r = parseMusicXmlWithReport(createMetronomeTextFixture({ text:'90–100',soundQuarter:95,words:'Allegro',hidden:true }))
  expect(r.score.tempo).toMatchObject({ bpm:95,text:'Allegro' }); expect(r.report.warnings).toEqual([])
})
it('does not discard independent timing offsets after recovering formatted text', () => {
  const r = parseMusicXmlWithReport(createMetronomeTextFixture({ text:'ca. 90',soundQuarter:90,soundOffset:2 }))
  expect(r.score.tempo).toMatchObject({ bpm:90,text:'♩ = ca. 90' })
  expect(r.report.warnings).toEqual([expect.objectContaining({ message:expect.stringContaining('Independent tempo offset') })])
})
it('does not apply a secondary formatted marking as the global clock', () => {
  const r = parseMusicXmlWithReport(createMetronomeTextFixture({ text:'ca. 90',soundQuarter:90,secondary:true }))
  expect(r.score.tempo).toBeUndefined(); expect(r.score.tempoEvents).toBeUndefined()
  expect(r.report.warnings).toEqual([expect.objectContaining({ partNumber:2,message:expect.stringContaining('Unrepresented metronome tempo text ') })])
})
it.each([undefined,0,2000])('does not invent a tempo for unsupported text/sound=%s', soundQuarter => {
  expect(() => parseMusicXmlWithReport(createMetronomeTextFixture({ text:'ca. 90',soundQuarter }))).toThrow('per-minute')
})

const schema=resolve('src/musicxml/schema/musicxml-4.0')
const available=spawnSync('xmllint',['--version'],{encoding:'utf8'}).status===0
it.skipIf(!available).each(cases)('validates $id source and normalized copy with full offline XSD', options => {
  const dir=mkdtempSync(join(tmpdir(),'studio-metronome-text-'))
  try {
    const xml=createMetronomeTextFixture(options)
    // A source can be valid even before its previously rejected import is fixed.
    const source=join(dir,'source.musicxml');writeFileSync(source,xml)
    const check=(file:string)=>spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),file],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}})
    const before=check(source);expect(before.status,before.stderr).toBe(0)
    const copy=join(dir,'copy.musicxml');writeFileSync(copy,serializeMusicXml(parseMusicXmlWithReport(xml).score))
    const after=check(copy);expect(after.status,after.stderr).toBe(0)
  }finally{rmSync(dir,{recursive:true,force:true})}
})

it('does not confuse a paired sixteenth tempo label with independent legacy swing words', () => {
  const source = createMetronomeTextFixture({ text:'ca. 360', soundQuarter:90, beatUnit:'16th' })
    .replace('</attributes>', '</attributes><direction><direction-type><words>Swing</words></direction-type></direction>')
  const parsed = parseMusicXmlWithReport(source).score
  expect(parsed.rhythmFeel).toEqual({ unit:'eighth' })
  expect(parsed.tempo?.text).toBe('𝅘𝅥𝅯 = ca. 360')
  expect(parseMusicXmlWithReport(serializeMusicXml(parsed)).score.rhythmFeel).toEqual(parsed.rhythmFeel)
})
