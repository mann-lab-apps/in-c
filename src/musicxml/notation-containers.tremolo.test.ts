import { expect, it } from 'vitest'
import { createNotationContainerFixture as fixture } from '../testing/notation-container-fixture'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { createPianoCommands } from '../renderer/src/playback/piano-transport'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'

const ornaments = (children: string) => `<ornaments>${children}</ornaments>`
const mark = (marks: number) => `<tremolo type="single">${marks}</tremolo>`
const note = (result: ReturnType<typeof parseMusicXmlWithReport>) => result.score.parts[0].staves[0].measures[0].voices[0].events[0]

function matchesExistingSingle(groups: string[], marks: number): void {
  const actual = parseMusicXmlWithReport(fixture(groups))
  const control = parseMusicXmlWithReport(fixture([ornaments(mark(marks))]))
  expect(note(actual)).toMatchObject({ tremolo: { type: 'single', marks } })
  expect(actual.score).toEqual(control.score)
  expect(actual.report.warnings).toEqual([])
  const native = encodeNativeProject(createNativeProject(actual.score))
  expect(native).toBe(encodeNativeProject(createNativeProject(control.score)))
  expect(decodeNativeProject(native).score).toEqual(control.score)
  expect(serializeMusicXml(actual.score)).toBe(serializeMusicXml(control.score))
  expect(parseMusicXmlWithReport(serializeMusicXml(actual.score)).score).toEqual(control.score)
  const commands = createPianoCommands(createPlaybackTimeline(actual.score), 0, 120, {})
  expect(commands).toEqual(createPianoCommands(createPlaybackTimeline(control.score), 0, 120, {}))
  expect(commands.filter(command => command.type === 'on')).toHaveLength(4 * 2 ** marks)
  // MIDI remains the existing serializer projection; command equivalence above
  // verifies sampler scheduling separately from these unchanged file bytes.
  expect(serializeMidi(actual.score)).toEqual(serializeMidi(control.score))
}

it.each([1, 2, 3])('uses the MusicXML default single type for %i strokes', marks => {
  matchesExistingSingle([ornaments(`<tremolo>${marks}</tremolo>`)], marks)
})

it.each([
  [ornaments(mark(2)), ''],
  ['', ornaments(mark(2))],
  [ornaments(mark(2)) + '<ornaments/>'],
  ['<ornaments/>' + ornaments(mark(2))],
  [ornaments(mark(2))]
])('retains exactly one existing tremolo across container boundaries: %j', (...groups) => {
  matchesExistingSingle(groups, 2)
})

it.each([0, 4, 8])('keeps the existing unsupported-stroke rejection for default type %i', marks => {
  expect(() => parseMusicXmlWithReport(fixture([ornaments(`<tremolo>${marks}</tremolo>`)])))
    .toThrow(`지원하지 않는 tremolo 표시입니다: single ${marks}`)
})

it.each([0, 4, 8])('preserves explicit unsupported-stroke rejection for %i', marks => {
  expect(() => parseMusicXmlWithReport(fixture([ornaments(mark(marks))])))
    .toThrow(`지원하지 않는 tremolo 표시입니다: single ${marks}`)
})

it.each(['start', 'stop', 'unmeasured'])('does not add the unsupported %s tremolo model', type => {
  expect(() => parseMusicXmlWithReport(fixture([ornaments(`<tremolo type="${type}">1</tremolo>`)])))
    .toThrow(`지원하지 않는 tremolo 표시입니다: ${type} 1`)
})

it('does not invent a tremolo from empty or unrelated groups', () => {
  const actual = parseMusicXmlWithReport(fixture(['', '<ornaments/>', ornaments('<turn/>')]))
  expect(note(actual)).toMatchObject({ ornaments: ['turn'] })
  expect(note(actual)).not.toHaveProperty('tremolo', expect.anything())
})
