import { createVoiceMoveFixture } from './voice-move-fixture'
export function createVoiceTargetAnchorFixture(kind: 'start' | 'end') {
  const score = createVoiceMoveFixture(true)
  score.title = '빈 성부 이동 검증 · 대상 쉼표 연결'
  if (kind === 'end') {
    const measures = score.parts[0].staves[0].measures
    ;[measures[0].voices, measures[1].voices] = [measures[1].voices, measures[0].voices]
  }
  score.hairpins = [{ id: 'target-rest-hairpin', type: 'crescendo',
    startEventId: kind === 'start' ? 'empty-target' : 'upper-note-4',
    endEventId: kind === 'start' ? 'following' : 'empty-target',
    engraving: { placement: 'above', offsetY: 0, height: 4 } }]
  return score
}
