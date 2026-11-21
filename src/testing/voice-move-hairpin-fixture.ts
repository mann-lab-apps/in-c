import { createFullMeasureRest, createNote } from '../score-core'
import { createVoiceMoveFixture } from './voice-move-fixture'

export type VoiceMoveHairpinKind = 'leave-source' | 'enter-target' | 'other-part' | 'cross-voice' | 'before' | 'after'
export function createVoiceMoveHairpinFixture(kind: VoiceMoveHairpinKind = 'leave-source', type: 'crescendo' | 'diminuendo' = 'crescendo') {
  const score = createVoiceMoveFixture(kind !== 'enter-target')
  const bars = score.parts[0].staves[0].measures
  let selectedId = 'moving', startEventId = 'leading', endEventId = 'following'
  const whole = (id: string) => createNote({ id, pitch: { step: 'G', octave: 4 }, duration: { value: 'whole', dots: 0 } })
  if (kind === 'enter-target') {
    for (const index of [0, 2]) bars[index].voices.push({ id: 'voice-2', events: [whole('target-endpoint-' + index)] })
    bars[1].voices.push({ id: 'voice-2', events: [createFullMeasureRest({ id: 'middle-target-empty' })] })
    selectedId = 'upper-note-5'; startEventId = 'target-endpoint-0'; endEventId = 'target-endpoint-2'
  }
  if (kind === 'other-part') { startEventId = 'lower-note-0'; endEventId = 'lower-note-3' }
  if (kind === 'cross-voice') {
    bars[2].voices.push({ id: 'voice-3', events: [whole('cross-end')] })
    endEventId = 'cross-end'
  }
  if (kind === 'before') { selectedId = 'leading'; startEventId = 'moving' }
  if (kind === 'after') { selectedId = 'following'; endEventId = 'moving' }
  score.hairpins = [{ id: 'voice-scope-hairpin', type, startEventId, endEventId }]
  return { score, selectedId }
}
