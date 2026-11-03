import { readFileSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
import { musicXmlOrderFixture, xmlOrderKinds } from '../testing/musicxml-order-fixture'
import { parseMusicXml, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const schema = resolve('src/musicxml/schema/musicxml-4.0')
const xmllintAvailable = spawnSync('xmllint', ['--version'], { encoding: 'utf8' }).status === 0
const ordered = new XMLParser({ preserveOrder: true, ignoreAttributes: false })
const parser = new XMLParser({ ignoreAttributes: false })
const noteOrder = ['grace','cue','chord','pitch','unpitched','rest','duration','tie','instrument','footnote','level','voice','type','dot','accidental','time-modification','stem','notehead','notehead-text','staff','beam','notations','lyric','play','listen']
function notes(xml: string): Record<string, unknown>[][] {
  const root = ordered.parse(xml).find((node: Record<string, unknown>) => node['score-partwise'])['score-partwise']
  return root.filter((node: Record<string, unknown>) => node.part).flatMap((node: {part: Record<string, unknown>[]}) =>
    node.part.filter(node => node.measure).flatMap(node => (node.measure as Record<string, unknown>[]).filter(node => node.note).map(node => node.note as Record<string, unknown>[])))
}
function material(kind: typeof xmlOrderKinds[number]) {
  const score = musicXmlOrderFixture(kind), before = structuredClone(score), xml = serializeMusicXml(score)
  const out = process.env.DDIRORI_XML_ORDER_QA_DIR
  if (out) { const dir = join(out, kind); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score))); writeFileSync(join(dir, 'source.musicxml'), xml); writeFileSync(join(dir, 'source.mid'), serializeMidi(score)) }
  expect(score).toEqual(before)
  return { score, xml }
}
describe('MusicXML element order and schema', () => {
  it('pins the unmodified W3C reference bytes independently of the external validator', () => {
    const source = JSON.parse(readFileSync(join(schema,'SOURCE.json'),'utf8'))
    expect(source.version).toBe('4.0'); expect(source.files).toHaveLength(3)
    for (const file of source.files) expect(createHash('sha256').update(readFileSync(join(schema,file.file))).digest('hex')).toBe(file.sha256)
  })
  it('keeps reading legacy Studio system text without writing its nonstandard value', () => {
    const {xml}=material('system-text')
    const parsed=parseMusicXml(xml.replace('system="only-top"','system="yes"'))
    expect(parsed.systemTexts?.map(t=>t.text)).toEqual(['System text'])
    expect(parsed.staffTexts).toBeUndefined()
  })
  it('reads legacy parent-hidden combined tempo while keeping new output standard', () => {
    const xml=`<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Solo</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><direction print-object="no"><direction-type><words>Legacy hidden label</words><metronome><beat-unit>quarter</beat-unit><per-minute>72</per-minute></metronome></direction-type><sound tempo="72"/></direction><note><rest measure="yes"/><duration>4</duration><type>whole</type></note></measure></part></score-partwise>`
    const score=parseMusicXml(xml)
    expect(score.tempo).toEqual({bpm:72,beatUnit:'quarter',dots:0,text:'Legacy hidden label',transparent:true})
    expect(score.staffTexts).toBeUndefined()
    const next=serializeMusicXml(score)
    expect(next).not.toContain('<direction print-object=')
    expect(parseMusicXml(next).tempo).toEqual(score.tempo)
  })
  for (const kind of xmlOrderKinds) {
    it(`emits schema note-child order for ${kind}`, () => {
      for (const children of notes(material(kind).xml)) {
        const keys = children.flatMap(child => Object.keys(child).filter(key => key !== ':@'))
        const ranks = keys.map(key => noteOrder.indexOf(key))
        expect(ranks.every(rank => rank >= 0)).toBe(true)
        expect(ranks).toEqual([...ranks].sort((a,b) => a-b))
      }
    })
    it(`preserves native source and tempo/MIDI without duplicate words for ${kind}`, () => {
      const {score,xml} = material(kind), reopened = parseMusicXml(xml)
      expect(reopened.tempo).toEqual(score.tempo)
      expect(serializeMidi(reopened)).toEqual(serializeMidi(score))
      expect(reopened.staffTexts?.map(text => text.text)).toEqual(score.staffTexts?.map(text => text.text))
      if (kind === 'lower-grace') expect(reopened.parts[0].staves[1].measures[0].voices[0].events[0]).toMatchObject({ type:'note', graceNotes: [{pitch:{step:'D',alter:1,octave:3},slash:true}] })
      if (kind === 'upper-grace') {
        const original=score.parts[0].staves[0].measures[0].voices[0].events[0]
        const imported=reopened.parts[0].staves[0].measures[0].voices[0].events[0]
        expect(original.type).toBe('note');expect(imported.type).toBe('note')
        // The existing XML reader uses undefined for an absent slash; both
        // undefined and explicit false mean an unslashed grace in this model.
        if(original.type==='note'&&imported.type==='note')expect(imported.graceNotes?.map(n=>({...n,slash:Boolean(n.slash)})))
          .toEqual(original.graceNotes?.map(n=>({...n,slash:Boolean(n.slash)})))
      }
      const root = parser.parse(xml)['score-partwise']
      for (const part of [root.part].flat()) for (const measure of [part.measure].flat()) for (const direction of [measure.direction ?? []].flat()) {
        for (const type of [direction['direction-type']].flat()) if (type.metronome) expect(type.words).toBeUndefined()
        if (direction['@_system']) expect(direction['@_system']).toBe('only-top')
        expect(direction['@_print-object']).toBeUndefined()
      }
    })
    it.skipIf(!xmllintAvailable)(`validates generated ${kind} against the complete offline W3C4 XSD`, () => {
      const dir = mkdtempSync(join(tmpdir(),'studio-xml-order-')), file = join(dir,'score.musicxml')
      try {
        writeFileSync(file,material(kind).xml)
        const result = spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),file],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}})
        expect(result.status,result.stderr).toBe(0)
      } finally { rmSync(dir,{recursive:true,force:true}) }
    })
  }
})
