import { expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createAccidentalAppearanceFixture, createRepeatedAccidentalAppearanceFixture, type AccidentalAppearanceStyle } from '../testing/accidental-appearance-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const prefix = 'Unrepresented accidental appearance '
const styles = ['parentheses', 'bracket', 'editorial', 'cautionary', 'cue-size', 'grace-cue-size', 'large-size', 'combined'] as const

it.each([
  ['natural-up', '<accidental>natural-up</accidental>', '"value":"natural-up"'],
  ['variant glyph', '<accidental smufl="accidentalNaturalOneArrowUp">other</accidental>', '"smufl":"accidentalNaturalOneArrowUp"']
])('reports loss of %s while keeping the imported pitches and outputs', (_name, mark, diagnostic) => {
  const control = createAccidentalAppearanceFixture({ style: 'plain', partCount: 2, targetPart: 2, targetMeasure: 2 })
    .replace(/(<note print-object="yes">[\s\S]*?<\/step>)(<octave>)/, '$1<alter>0</alter>$2')
  const xml = control.replace('<accidental>natural</accidental>', mark)
  const current = parseMusicXmlWithReport(xml)
  const expected = parseMusicXmlWithReport(control)

  expect(current.report.warnings).toEqual([expect.objectContaining({
    code: 'unsupported-notation',
    partNumber: 2,
    measureNumber: 2,
    eventIndex: 1,
    path: 'part[2].measure[2].note[1].accidental',
    message: expect.stringContaining(diagnostic)
  })])
  expect(current.score).toEqual(expected.score)
  expect(serializeMidi(current.score)).toEqual(serializeMidi(expected.score))
  expect(serializeMusicXml(current.score)).toBe(serializeMusicXml(expected.score))
})

it.each([
  ['+1.0', 'natural', 'sharp', '"pitchAlter":"+1.0"'],
  [null, 'sharp', 'natural', '"pitchAlter":null']
])('reports actual pitch vs. printed accidental for an alteration of %s', (alter, mismatched, matching, diagnostic) => {
  const note = '<note><pitch><step>E</step>' + (alter === null ? '' : '<alter>' + alter + '</alter>') +
    '<octave>4</octave></pitch><duration>4</duration><type>whole</type><accidental>' + mismatched + '</accidental></note>'
  const current = parseMusicXmlWithReport(naturalImportScore(note))
  const control = parseMusicXmlWithReport(naturalImportScore(note.replace('>' + mismatched + '<', '>' + matching + '<')))
  expect(current.report.warnings).toEqual([expect.objectContaining({
    path: 'part[1].measure[1].note[1].accidental',
    message: expect.stringContaining(diagnostic)
  })])
  expect(control.report.warnings).toEqual([])
  expect(current.score).toEqual(control.score)
  expect(serializeMusicXml(current.score)).toBe(serializeMusicXml(control.score))
  expect(serializeMidi(current.score)).toEqual(serializeMidi(control.score))
})

it('keeps a matching standard SMuFL glyph quiet', () => {
  const control = createAccidentalAppearanceFixture({ style: 'plain' })
  const xml = control.replace('<accidental>natural</accidental>', '<accidental smufl="accidentalNatural">natural</accidental>')
  expect(parseMusicXmlWithReport(xml)).toEqual(parseMusicXmlWithReport(control))
})

it.each(styles)('reports %s explicit accidental presentation once without rewriting pitch or playback', style => {
  const options = { style, partCount: 2, targetPart: 2, targetMeasure: 2 }
  const result = parseMusicXmlWithReport(createAccidentalAppearanceFixture(options))
  const control = parseMusicXmlWithReport(createAccidentalAppearanceFixture({ ...options, style: 'plain' }))
  const warnings = result.report.warnings.filter(w => w.message.startsWith(prefix))
  expect(warnings).toEqual([expect.objectContaining({ code: 'unsupported-notation', partNumber: 2, measureNumber: 2, eventIndex: 1,
    path: 'part[2].measure[2].note[1].accidental', message: expect.stringContaining('"value":"natural"') })])
  if (style.endsWith('-size')) expect(warnings[0].message).toContain(`"size":"${style.replace('-size', '')}"`)
  else if (style === 'combined') for (const key of ['parentheses','bracket','editorial','cautionary']) expect(warnings[0].message).toContain(`"${key}":"yes"`)
  else expect(warnings[0].message).toContain(`"${style}":"yes"`)
  expect(result.score).toEqual(control.score)
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(control.score)
  expect(serializeMidi(result.score)).toEqual(serializeMidi(control.score))
  const copy = serializeMusicXml(result.score)
  expect(copy).toBe(serializeMusicXml(control.score))
  expect(parseMusicXmlWithReport(copy).score).toEqual(control.score)
  expect(result.report.warnings.some(w => w.message.startsWith('Unrepresented cue note kind '))).toBe(false)
})

it.each(['chord','grace'] as const)('retains the original %s member source location', owner => {
  const { score, report } = parseMusicXmlWithReport(createAccidentalAppearanceFixture({ owner }))
  const index = owner === 'chord' ? 2 : 1
  expect(report.warnings.filter(w => w.message.startsWith(prefix))).toEqual([expect.objectContaining({ eventIndex: index, path: `part[1].measure[1].note[${index}].accidental` })])
  expect(score).toEqual(parseMusicXmlWithReport(createAccidentalAppearanceFixture({ owner, style:'plain' })).score)
})

it.each(['plain','explicit-defaults','none'] as AccidentalAppearanceStyle[])('keeps %s accidental controls quiet', style => {
  expect(parseMusicXmlWithReport(createAccidentalAppearanceFixture({ style })).report.warnings.filter(w => w.message.startsWith(prefix))).toEqual([])
})

it('keeps visibility and accidental appearance losses distinct', () => {
  const warnings = parseMusicXmlWithReport(createAccidentalAppearanceFixture({ printObject:'no' })).report.warnings
  expect(warnings.filter(w => w.message.startsWith('Unrepresented note visibility '))).toHaveLength(1)
  expect(warnings.filter(w => w.message.startsWith(prefix))).toHaveLength(1)
})

it('retains all repeated and mixed original source rows', () => {
  const xml = createRepeatedAccidentalAppearanceFixture()
  const warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(30)
  expect(warnings.every(w => w.message.startsWith(prefix))).toBe(true)
  expect(new Set(warnings.map(w => w.path)).size).toBe(30)
  const mixed = parseMusicXmlWithReport(xml.replace('</accidental>', '</accidental><notehead>none</notehead>')).report.warnings
  expect(mixed).toHaveLength(31)
  expect(mixed.filter(w => w.message.startsWith('Explicit notehead appearance '))).toHaveLength(1)
})

const schema = resolve('src/musicxml/schema/musicxml-4.0')
const available = spawnSync('xmllint', ['--version'], { encoding: 'utf8' }).status === 0
const xsdCases = [...styles.map(style => ({ id:style, xml:createAccidentalAppearanceFixture({ style }) })),
  ...(['chord','grace'] as const).map(owner => ({ id:owner, xml:createAccidentalAppearanceFixture({ owner }) })),
  { id:'defaults', xml:createAccidentalAppearanceFixture({ style:'explicit-defaults' }) },
  { id:'mixed', xml:createRepeatedAccidentalAppearanceFixture().replace('</accidental>', '</accidental><notehead>none</notehead>') }]
it.skipIf(!available).each(xsdCases)('validates $id source and copy using complete offline XSD', ({ xml }) => {
  const directory = mkdtempSync(join(tmpdir(), 'studio-accidental-style-xsd-'))
  try {
    for (const [name, contents] of [['source', xml], ['copy', serializeMusicXml(parseMusicXmlWithReport(xml).score)]]) {
      const file = join(directory, name + '.musicxml'); writeFileSync(file, contents)
      const result = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], {
        encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') }
      })
      expect(result.status, result.stderr).toBe(0)
    }
  } finally { rmSync(directory, { recursive:true, force:true }) }
})

function naturalImportScore(notes: string) {
  return `<score-partwise version="4.0">
    <part-list><score-part id="P1"><part-name>Clarinet</part-name></score-part></part-list>
    <part id="P1"><measure number="1">
      <attributes><divisions>1</divisions><key><fifths>-2</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>${notes}
    </measure></part>
  </score-partwise>`
}

it('performs explicit naturals with omitted pitch alteration against a key and a preceding flat', () => {
  const xml = naturalImportScore(`
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><accidental>natural</accidental></note>
    <note><pitch><step>A</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type><accidental>flat</accidental></note>
    <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><accidental>natural</accidental></note>
    <note><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  `)
  const { score, report } = parseMusicXmlWithReport(xml)
  expect(report.warnings).toEqual([])
  const control = xml.replace('<step>E</step>', '<step>E</step><alter>0</alter>')
    .replace('<step>A</step><octave>4', '<step>A</step><alter>0</alter><octave>4')
  const explicit = parseMusicXmlWithReport(control).score
  expect(score).toEqual(explicit)
  expect(serializeMidi(score)).toEqual(serializeMidi(explicit))
  const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
  expect(native).toEqual(score)
  const copy = serializeMusicXml(native)
  expect(copy.match(/<accidental>natural<\/accidental>/g)).toHaveLength(2)
  expect(parseMusicXmlWithReport(copy).score).toEqual(score)
})

it('retains explicit naturals on grace notes and chord members without overriding a source pitch alteration', () => {
  const xml = naturalImportScore(`
    <note><grace slash="yes"/><pitch><step>E</step><octave>4</octave></pitch>
      <type>eighth</type><accidental editorial="yes">natural</accidental></note>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
    <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type><accidental>natural</accidental></note>
    <note><chord/><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch>
      <duration>4</duration><type>whole</type><accidental editorial="yes">natural</accidental></note>
  `)
  const { score, report } = parseMusicXmlWithReport(xml)
  const note = score.parts[0].staves[0].measures[0].voices[0].events[0]
  expect(note.type).toBe('note')
  if (note.type !== 'note') throw new Error('Expected the imported chord')
  expect(note.graceNotes?.[0].pitch.alter).toBe(0)
  expect(note.pitches?.map(pitch => pitch.alter)).toEqual([undefined, 0, -1])
  expect(report.warnings.filter(warning => warning.message.startsWith(prefix))).toHaveLength(2)
})

it('preserves sounding naturals with no alter or accidental while keeping matching inherited pitch implicit', () => {
  const xml = naturalImportScore(`
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><pitch><step>A</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type><accidental>flat</accidental></note>
    <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  `)
  const control = xml.replace('<step>E</step>', '<step>E</step><alter>0</alter>')
    .replace('<step>A</step><octave>4', '<step>A</step><alter>0</alter><octave>4')
  const { score, report } = parseMusicXmlWithReport(xml)
  const expected = parseMusicXmlWithReport(control).score
  expect(report.warnings).toEqual([])
  expect(score).toEqual(expected)
  expect(serializeMidi(score)).toEqual(serializeMidi(expected))
  const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
  const copy = serializeMusicXml(native)
  expect(copy.match(/<accidental>natural<\/accidental>/g)).toHaveLength(2)
  expect(parseMusicXmlWithReport(copy).score).toEqual(expected)
})

it('resolves omitted chord and grace pitches against earlier events without carrying a grace accidental', () => {
  const xml = naturalImportScore(`
    <note><pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><grace slash="yes"/><pitch><step>E</step><octave>4</octave></pitch><type>eighth</type></note>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><chord/><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  `)
  const { score } = parseMusicXmlWithReport(xml)
  const [first, withGrace, afterGrace, chord] = score.parts[0].staves[0].measures[0].voices[0].events
  expect(first.type === 'note' && first.pitch.alter).toBe(-1)
  expect(withGrace.type === 'note' && withGrace.graceNotes?.[0].pitch.alter).toBe(0)
  expect(afterGrace.type === 'note' && afterGrace.pitch.alter).toBe(0)
  expect(chord.type === 'note' && chord.pitches?.map(pitch => pitch.alter)).toEqual([undefined, 0])
})

it('serializes the shown pitch of a legacy Native grace note with an inherited accidental', () => {
  const { score } = parseMusicXmlWithReport(naturalImportScore(`
    <note><grace/><pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch><type>eighth</type></note>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
  `))
  const event = score.parts[0].staves[0].measures[0].voices[0].events[0]
  if (event.type !== 'note' || !event.graceNotes) throw new Error('Expected grace fixture')
  event.graceNotes[0].pitch.alter = undefined
  const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
  expect(native).toEqual(score)
  const reparsed = parseMusicXmlWithReport(serializeMusicXml(native)).score
  const note = reparsed.parts[0].staves[0].measures[0].voices[0].events[0]
  expect(note.type === 'note' && note.graceNotes?.[0].pitch.alter).toBe(-1)
  expect(event.graceNotes[0].pitch.alter).toBeUndefined()
})
