import { expect, it } from 'vitest'
import { createNotationContainerFixture as fixture } from '../testing/notation-container-fixture'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { createPianoCommands } from '../renderer/src/playback/piano-transport'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'

const ornaments = (children: string) => `<ornaments>${children}</ornaments>`
const note = (result: ReturnType<typeof parseMusicXmlWithReport>) => result.score.parts[0].staves[0].measures[0].voices[0].events[0]

it.each([
  { groups: [ornaments('<trill-mark/>'), ''], combined: '<trill-mark/>', order: ['trill'] },
  { groups: ['', ornaments('<trill-mark/>')], combined: '<trill-mark/>', order: ['trill'] },
  { groups: [ornaments('<trill-mark/>') + ornaments('<turn/>')], combined: '<trill-mark/><turn/>', order: ['trill', 'turn'] },
  { groups: [ornaments('<turn/>'), ornaments('<inverted-mordent/>'), ornaments('<mordent/><trill-mark/>')], combined: '<turn/><inverted-mordent/><mordent/><trill-mark/>', order: ['turn', 'inverted-mordent', 'mordent', 'trill'] },
  { groups: [ornaments('<turn/><trill-mark/>') + ornaments('<trill-mark/><mordent/>')], combined: '<turn/><trill-mark/><mordent/>', order: ['turn', 'trill', 'mordent'] },
  { groups: [ornaments('<trill-mark/><turn/>')], combined: '<trill-mark/><turn/>', order: ['trill', 'turn'] }
])('preserves existing supported ornament order and file/performance projection: $order', ({ groups, combined, order }) => {
  const actual = parseMusicXmlWithReport(fixture(groups)), control = parseMusicXmlWithReport(fixture([ornaments(combined)]))
  expect(note(actual)).toMatchObject({ ornaments: order })
  expect(actual.score).toEqual(control.score)
  expect(actual.report.warnings).toEqual([])
  const native = encodeNativeProject(createNativeProject(actual.score))
  expect(native).toBe(encodeNativeProject(createNativeProject(control.score)))
  expect(decodeNativeProject(native).score).toEqual(control.score)
  expect(serializeMusicXml(actual.score)).toBe(serializeMusicXml(control.score))
  expect(note(parseMusicXmlWithReport(serializeMusicXml(actual.score)))).toMatchObject({ ornaments: order })
  expect(createPianoCommands(createPlaybackTimeline(actual.score), 0, 120, {}))
    .toEqual(createPianoCommands(createPlaybackTimeline(control.score), 0, 120, {}))
  expect(serializeMidi(actual.score)).toEqual(serializeMidi(control.score))
})

it('retains the existing legacy trill alias without treating it as an XSD-valid source', () => {
  const actual = parseMusicXmlWithReport(fixture([ornaments('<trill/><turn/>'), ornaments('<trill-mark/>')]))
  expect(note(actual)).toMatchObject({ ornaments: ['trill', 'turn'] })
})

it('leaves the existing ordinary scalar tremolo reader and ornament combination unchanged', () => {
  const actual = parseMusicXmlWithReport(fixture([ornaments('<tremolo type="single">1</tremolo><turn/>')]))
  expect(note(actual)).toMatchObject({ tremolo: { type: 'single', marks: 1 }, ornaments: ['turn'] })
})

it('does not create ornament values from empty or unrelated containers', () => {
  expect(note(parseMusicXmlWithReport(fixture(['', '<articulations><staccato/></articulations>'])))).not.toHaveProperty('ornaments', expect.anything())
})
