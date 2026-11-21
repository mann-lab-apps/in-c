import { createSwingPlaybackFixture } from './swing-playback-fixture'

export type PartSwingExportFixtureKind = 'unaligned' | 'aligned' | 'off' | 'off-unaligned'
export function createPartSwingExportFixture(kind: PartSwingExportFixtureKind = 'unaligned') {
  const score = createSwingPlaybackFixture('eighth', '3:2')
  score.title = 'Generated part swing export QA'
  score.parts[0].id = 'primary'; score.parts[0].name = 'Primary'
  score.parts[0].staves[0].id = 'primary-staff'
  const other = structuredClone(score.parts[0])
  other.id = 'other'; other.name = 'Other'; other.staves[0].id = 'other-staff'
  other.staves[0].measures[0].id = 'other-bar'
  if (kind === 'unaligned' || kind === 'off-unaligned') other.staves[0].measures[0].timeSignature = { beats: 8, beatType: 8 }
  for (const event of other.staves[0].measures[0].voices[0].events) event.id = 'other-' + event.id
  score.parts.push(other)
  if (kind === 'off' || kind === 'off-unaligned') delete score.swingPlayback
  return score
}
