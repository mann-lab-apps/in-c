import { expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createNote, createScore, type Articulation } from '../score-core'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'

function score(articulations: Articulation[]) {
  const value = createScore()
  value.parts[0].staves[0].measures[0].voices[0].events = [createNote({
    id: 'accented', pitch: { step: 'C', octave: 4 }, duration: { value: 'whole', dots: 0 }, articulations
  })]
  return value
}
const event = (value: ReturnType<typeof score>) => value.parts[0].staves[0].measures[0].voices[0].events[0]
const source = (tags: string) => serializeMusicXml(score([])).replace('</note>', `<notations><articulations>${tags}</articulations></notations></note>`)

it('exports model marcato as a standard upward strong accent without mutating native music', () => {
  const value = score(['staccato', 'marcato', 'tenuto']), before = structuredClone(value)
  const native = encodeNativeProject(createNativeProject(value)), midi = serializeMidi(value)
  const xml = serializeMusicXml(value)
  expect(xml).toContain('<strong-accent type="up"/>')
  expect(xml).not.toContain('<marcato')
  expect(event(parseMusicXml(xml))).toMatchObject({ articulations: ['staccato', 'marcato', 'tenuto'] })
  expect(serializeMidi(parseMusicXml(xml))).toEqual(midi)
  expect(encodeNativeProject(createNativeProject(value))).toBe(native)
  expect(value).toEqual(before)
})
it.each(['', ' type="up"'])('imports standard strong-accent%s in its source stack order', attributes => {
  const { score: value, report } = parseMusicXmlWithReport(source(`<staccato/><strong-accent${attributes}/><tenuto/>`))
  expect(event(value)).toMatchObject({ articulations: ['staccato', 'marcato', 'tenuto'] })
  expect(report.warnings.some(w => w.path.includes('strong-accent'))).toBe(false)
  expect(serializeMidi(value)).toEqual(serializeMidi(score(['staccato', 'marcato', 'tenuto'])))
})
it('keeps unsupported downward direction visible as a warning instead of turning it upward', () => {
  const { score: value, report } = parseMusicXmlWithReport(source('<strong-accent type="down"/>'))
  expect(event(value)).toMatchObject({ type: 'note', pitch: { step: 'C', octave: 4 } })
  expect(event(value)).toHaveProperty('articulations', undefined)
  expect(report.warnings).toContainEqual(expect.objectContaining({
    code: 'unsupported-notation', message: expect.stringContaining('downward strong-accent'),
    path: expect.stringContaining('articulations.strong-accent')
  }))
  expect(serializeMidi(value)).toEqual(serializeMidi(score([])))
})
it('imports a supported upward mark while retaining a sibling downward warning', () => {
  const { score: value, report } = parseMusicXmlWithReport(source('<strong-accent type="down"/><strong-accent/><accent/>'))
  expect(event(value)).toMatchObject({ articulations: ['marcato', 'accent'] })
  expect(report.warnings.filter(w => w.message.includes('downward strong-accent'))).toHaveLength(1)
})
it('keeps legacy marcato input readable and exports it canonically', () => {
  const value = parseMusicXml(source('<accent/><marcato/><staccato/>'))
  expect(event(value)).toMatchObject({ articulations: ['accent', 'marcato', 'staccato'] })
  const xml = serializeMusicXml(value)
  expect(xml).toContain('<strong-accent type="up"/>')
  expect(xml).not.toContain('<marcato')
  expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(value))
})
it('does not create duplicate model marks from standard and legacy aliases', () => {
  expect(event(parseMusicXml(source('<strong-accent/><marcato/><tenuto/>')))).toMatchObject({ articulations: ['marcato', 'tenuto'] })
})
it('imports the supported symbol while warning about explicit below-staff placement', () => {
  const { score: value, report } = parseMusicXmlWithReport(source('<strong-accent type="up" placement="below"/>'))
  expect(event(value)).toMatchObject({ articulations: ['marcato'] })
  expect(report.warnings).toContainEqual(expect.objectContaining({ code: 'unsupported-notation', message: expect.stringContaining('below-staff strong-accent') }))
})
it.each(['0', '-12'])('does not silently discard explicit strong-accent position %s', offset => {
  const { score: value, report } = parseMusicXmlWithReport(source(`<strong-accent relative-y="${offset}"/>`))
  expect(event(value)).toMatchObject({ articulations: ['marcato'] })
  expect(report.warnings).toContainEqual(expect.objectContaining({ code: 'unsupported-notation', message: expect.stringContaining('strong-accent manual position') }))
})
it.each(['rest', 'chord-member', 'grace'] as const)('retains unsupported strong-accent owner warning for %s', owner => {
  let xml = source('<strong-accent/>')
  if (owner === 'rest') xml = xml.replace(/<pitch>[\s\S]*?<\/pitch>/, '<rest/>')
  else {
    const base = serializeMusicXml(score([]))
    const duration = base.match(/<duration>(\d+)<\/duration>/)![1]
    const marked = `<note>${owner === 'grace' ? '<grace/>' : '<chord/>'}<pitch><step>E</step><octave>4</octave></pitch>${owner === 'grace' ? '' : `<duration>${duration}</duration>`}<type>${owner === 'grace' ? 'eighth' : 'whole'}</type><notations><articulations><strong-accent/></articulations></notations></note>`
    xml = owner === 'grace' ? base.replace('<note>', marked + '<note>') : base.replace('</note>', '</note>' + marked)
  }
  const { score: value, report } = parseMusicXmlWithReport(xml)
  expect(report.warnings).toContainEqual(expect.objectContaining({ code: 'unsupported-notation', message: expect.stringContaining('strong-accent on') }))
  if (owner === 'rest') expect(event(value)).toMatchObject({ type: 'rest', duration: { value: 'whole' } })
  else {
    expect(event(value)).toHaveProperty('articulations', undefined)
    if (owner === 'chord-member') expect(event(value)).toMatchObject({ pitches: [{ step: 'C', octave: 4 }, { step: 'E', octave: 4 }] })
    else expect(event(value)).toMatchObject({ graceNotes: [{ pitch: { step: 'E', octave: 4 } }] })
  }
})

const schema = resolve('src/musicxml/schema/musicxml-4.0')
const available = spawnSync('xmllint', ['--version']).status === 0
it.skipIf(!available).each<Articulation[]>([['marcato'], ['staccato', 'accent', 'tenuto', 'marcato']])('validates generated articulation XML against pinned complete XSD: %j', (...marks) => {
  const provenance = JSON.parse(readFileSync(join(schema, 'SOURCE.json'), 'utf8'))
  for (const file of provenance.files) expect(createHash('sha256').update(readFileSync(join(schema, file.file))).digest('hex')).toBe(file.sha256)
  const dir = mkdtempSync(join(tmpdir(), 'studio-strong-accent-')), file = join(dir, 'score.musicxml')
  try {
    writeFileSync(file, serializeMusicXml(score(marks)))
    const result = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], {
      encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') }
    })
    expect(result.status, result.stderr).toBe(0)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
