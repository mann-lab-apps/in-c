import { expect, it } from 'vitest'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { createSwingPlaybackFixture } from '../../../testing/swing-playback-fixture'
import { serializeMidiWithReport } from './serialize-midi'

function unavailableSwingScore() {
  const score = createSwingPlaybackFixture('eighth', '3:2')
  const other = structuredClone(score.parts[0])
  other.id = 'other'; other.staves[0].id = 'other-staff'
  other.staves[0].measures[0].id = 'other-bar'
  other.staves[0].measures[0].timeSignature = { beats: 8, beatType: 8 }
  for (const event of other.staves[0].measures[0].voices[0].events) event.id = 'other-' + event.id
  score.parts.push(other)
  return score
}

it('warns once when a saved global swing cannot apply, preserving straight MIDI and native settings', () => {
  const score = unavailableSwingScore(), before = encodeNativeProject(createNativeProject(score))
  const report = serializeMidiWithReport(score)
  expect(report.warnings).toEqual([{
    code: 'unsupported-midi-swing', path: 'score.swingPlayback',
    message: 'Stored global swing playback (eighth, 3:2) cannot apply to unaligned staff timing; MIDI retains straight rhythm.'
  }])
  expect(report.bytes).toEqual(serializeMidiWithReport({ ...score, swingPlayback: undefined }).bytes)
  expect(encodeNativeProject(createNativeProject(score))).toBe(before)
})

it('does not report unavailable swing for off or supported settings', () => {
  expect(serializeMidiWithReport({ ...unavailableSwingScore(), swingPlayback: undefined }).warnings).toEqual([])
  expect(serializeMidiWithReport(createSwingPlaybackFixture('eighth', '3:2')).warnings).toEqual([])
})
it('explains empty sources without calling them mismatched meters', () => {
  const score = { ...createSwingPlaybackFixture(), parts: [] }
  const report = serializeMidiWithReport(score)
  expect(report.warnings).toHaveLength(1)
  expect(report.warnings[0]).toMatchObject({ code: 'unsupported-midi-swing', path: 'score.swingPlayback' })
  expect(report.warnings[0].message).toContain('an empty score')
  expect(report.bytes).toEqual(serializeMidiWithReport({ ...score, swingPlayback: undefined }).bytes)
})
