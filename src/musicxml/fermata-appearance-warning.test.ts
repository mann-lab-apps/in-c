import { expect, it } from 'vitest'
import { createNotationContainerFixture as fixture } from '../testing/notation-container-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { expressPianoScore } from '../renderer/src/playback/piano-expression'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'

const prefix = 'Unrepresented fermata appearance '
const base = 'part[1].measure[1].note[1].notations'
function preservesCurrentHold(xml: string): void {
  const actual = parseMusicXmlWithReport(xml).score, control = parseMusicXmlWithReport(fixture(['<fermata/>'])).score
  expect(actual).toEqual(control)
  expect(encodeNativeProject(createNativeProject(actual))).toBe(encodeNativeProject(createNativeProject(control)))
  expect(serializeMusicXml(actual)).toBe(serializeMusicXml(control))
  expect(serializeMidi(actual)).toEqual(serializeMidi(control))
  expect(expressPianoScore(actual, createPlaybackTimeline(actual), false))
    .toEqual(expressPianoScore(control, createPlaybackTimeline(control), false))
  expect(createPlaybackTimeline(actual).totalBeats).toBe(6)
}

it.each([
  { groups: ['<fermata>angled</fermata>'], path: `${base}.fermata`, shape: 'angled', type: 'upright' },
  { groups: ['<fermata>square</fermata>'], path: `${base}.fermata`, shape: 'square', type: 'upright' },
  { groups: ['<fermata type="inverted"/>'], path: `${base}.fermata`, shape: 'normal', type: 'inverted' },
  { groups: ['', '<fermata type="inverted">normal</fermata>'], path: `${base}[2].fermata`, shape: 'normal', type: 'inverted' }
])('reports the unrepresented fermata at its source owner: $path $shape $type', ({ groups, path, shape, type }) => {
  const xml = fixture(groups), warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(1)
  expect(warnings[0]).toMatchObject({ code: 'unsupported-notation', path })
  expect(warnings[0].message).toContain(prefix)
  expect(warnings[0].message).toContain(`"shape":"${shape}"`)
  expect(warnings[0].message).toContain(`"type":"${type}"`)
  expect(warnings[0].message).toContain('"count":1')
  preservesCurrentHold(xml)
})

it('keeps raw lexical values in technical information while normalizing the shape/type comparison', () => {
  const xml = fixture(['<fermata type=" inverted "> angled </fermata>']), warning = parseMusicXmlWithReport(xml).report.warnings[0]
  expect(warning?.message).toContain('"source":{"#text":" angled ","@_type":" inverted "}')
  expect(warning?.message).toContain('"shape":"angled","type":"inverted"')
  preservesCurrentHold(xml)
})

it.each([
  { groups: ['<fermata/><fermata type="inverted"/>'], paths: [`${base}.fermata[1]`, `${base}.fermata[2]`] },
  { groups: ['<fermata/>', '<fermata/>'], paths: [`${base}[1].fermata`, `${base}[2].fermata`] }
])('reports individually owned marks collapsed to one Boolean hold: $paths', ({ groups, paths }) => {
  const xml = fixture(groups), warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings.map(w => w.path)).toEqual(paths)
  for (const warning of warnings) {
    expect(warning.message).toContain(prefix)
    expect(warning.message).toContain('"count":2')
  }
  preservesCurrentHold(xml)
})

it('retains second-part ownership without making normal marks in the first part warn', () => {
  const first = fixture(['<fermata/>']), target = fixture(['<fermata>square</fermata>']).match(/<part id="P1">[\s\S]*?<\/part>/)![0].replace('id="P1"', 'id="P2"')
  const xml = first.replace('</part-list>', '<score-part id="P2"><part-name>Piano Two</part-name></score-part></part-list>')
    .replace('</score-partwise>', target + '</score-partwise>')
  expect(parseMusicXmlWithReport(xml).report.warnings.map(w => w.path))
    .toEqual(['part[2].measure[1].note[1].notations.fermata'])
  expect(parseMusicXmlWithReport(xml).score).toEqual(parseMusicXmlWithReport(xml.replace('>square</fermata>', '></fermata>')).score)
})

it.each(['<fermata/>', '<fermata>normal</fermata>', '<fermata type="upright">normal</fermata>', '<fermata type=" upright "> normal </fermata>'])('keeps a single normal upright control quiet: %s', mark => {
  const xml = fixture([mark])
  expect(parseMusicXmlWithReport(xml).report.warnings).toEqual([])
  preservesCurrentHold(xml)
})

it('does not add a warning or hold when no fermata exists', () => {
  const actual = parseMusicXmlWithReport(fixture(['']))
  expect(actual.report.warnings).toEqual([])
  expect(createPlaybackTimeline(actual.score).totalBeats).toBe(4)
})
