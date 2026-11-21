import { expect, it } from 'vitest'
import { createNotationContainerFixture as fixture } from '../testing/notation-container-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { createPianoCommands } from '../renderer/src/playback/piano-transport'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'

const mark = (n: number) => `<tremolo type="single">${n}</tremolo>`
const orn = (s: string) => `<ornaments>${s}</ornaments>`
const base = 'part[1].measure[1].note[1].notations'

it.each([
  { groups: [orn(mark(1)), orn(mark(3))], paths: [`${base}[1].ornaments.tremolo`, `${base}[2].ornaments.tremolo`] },
  { groups: [orn(mark(1)) + orn('<tremolo>3</tremolo>')], paths: [`${base}.ornaments[1].tremolo`, `${base}.ornaments[2].tremolo`] },
  { groups: [orn(mark(1) + mark(3))], paths: [`${base}.ornaments.tremolo[1]`, `${base}.ornaments.tremolo[2]`] },
  { groups: [orn(mark(1)), orn(mark(1))], paths: [`${base}[1].ornaments.tremolo`, `${base}[2].ornaments.tremolo`] },
  { groups: ['', '<ornaments/>' + orn(mark(1)) + orn(mark(3))], paths: [`${base}[2].ornaments[2].tremolo`, `${base}[2].ornaments[3].tremolo`] }
])('reports every unrepresented instruction at its source address without choosing or merging: $paths', ({ groups, paths }) => {
  const actual = parseMusicXmlWithReport(fixture(groups)), control = parseMusicXmlWithReport(fixture(['']))
  expect(actual.report.warnings.map(w => w.path)).toEqual(paths)
  expect(actual.report.warnings.every(w => w.code === 'unsupported-notation' && w.message.includes('count=2'))).toBe(true)
  expect(actual.score).toEqual(control.score)
  expect(encodeNativeProject(createNativeProject(actual.score))).toBe(encodeNativeProject(createNativeProject(control.score)))
  expect(serializeMusicXml(actual.score)).toBe(serializeMusicXml(control.score))
  expect(serializeMidi(actual.score)).toEqual(serializeMidi(control.score))
  expect(createPianoCommands(createPlaybackTimeline(actual.score), 0, 120, {}))
    .toEqual(createPianoCommands(createPlaybackTimeline(control.score), 0, 120, {}))
})

it('keeps the rest owner and its existing musical projection', () => {
  const rest = (groups: string[]) => fixture(groups).replace('<pitch><step>C</step><octave>4</octave></pitch>', '<rest/>')
  const actual = parseMusicXmlWithReport(rest([orn(mark(1) + mark(3))]))
  expect(actual.report.warnings.map(w => w.path)).toEqual([`${base}.ornaments.tremolo[1]`, `${base}.ornaments.tremolo[2]`])
  expect(actual.score).toEqual(parseMusicXmlWithReport(rest([''])).score)
})

it('does not warn for exactly one supported default-type instruction among empty groups', () => {
  const actual = parseMusicXmlWithReport(fixture(['', '<ornaments/>' + orn('<tremolo>2</tremolo>')]))
  expect(actual.report.warnings).toEqual([])
  expect(actual.score.parts[0].staves[0].measures[0].voices[0].events[0]).toMatchObject({ tremolo: { type: 'single', marks: 2 } })
})

it('does not invent a diagnostic for unrelated or empty ornament groups', () => {
  expect(parseMusicXmlWithReport(fixture(['', '<ornaments/>', orn('<turn/>')])).report.warnings).toEqual([])
})
