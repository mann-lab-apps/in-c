import { expect, it, vi } from 'vitest'
import { createVoiceMoveHairpinFixture } from '../../../testing/voice-move-hairpin-fixture'
import { applyScoreCommand } from '../../../score-core'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { serializeMidi } from '../midi/serialize-midi'
import { createPlaybackTimeline } from '../playback/timeline'
import { locateEvent } from './editor-state'
import { buildEmptyVoiceMove } from './empty-voice-move'

it.each(['crescendo', 'diminuendo'] as const)('refuses leaving the interior of a %s before allocating IDs or changing MIDI', type => {
  const { score, selectedId } = createVoiceMoveHairpinFixture('leave-source', type), before = structuredClone(score)
  const native = encodeNativeProject(createNativeProject(score)), midi = serializeMidi(score)
  let allocated = 0; const allocate = vi.fn(() => 'rejected-rest-' + (++allocated))
  const plan = buildEmptyVoiceMove(score, locateEvent(score, selectedId), 'voice-2', allocate)
  expect(plan.command).toBeUndefined(); expect(allocate).not.toHaveBeenCalled(); expect(plan.reason).toContain('헤어핀 적용')
  expect(score).toEqual(before); expect(encodeNativeProject(createNativeProject(score))).toBe(native); expect(serializeMidi(score)).toEqual(midi)
})
it('refuses entering a target voice hairpin that spans an otherwise empty middle bar', () => {
  const { score, selectedId } = createVoiceMoveHairpinFixture('enter-target'), before = structuredClone(score)
  let allocated = 0; const allocate = vi.fn(() => 'rejected-rest-' + (++allocated))
  const plan = buildEmptyVoiceMove(score, locateEvent(score, selectedId), 'voice-2', allocate)
  expect(plan.command).toBeUndefined(); expect(allocate).not.toHaveBeenCalled(); expect(plan.reason).toContain('헤어핀 적용'); expect(score).toEqual(before)
})
it.each(['other-part', 'cross-voice', 'before', 'after'] as const)('preserves allowed %s scope and exact MIDI/undo', kind => {
  const { score, selectedId } = createVoiceMoveHairpinFixture(kind), before = structuredClone(score)
  let id = 0
  const plan = buildEmptyVoiceMove(score, locateEvent(score, selectedId), 'voice-2', () => 'scope-rest-' + (++id))
  expect(plan.reason).toBeUndefined(); expect(plan.command).toBeDefined()
  const after = applyScoreCommand(score, plan.command!)
  expect(serializeMidi(after.score)).toEqual(serializeMidi(before))
  const velocity = (s: typeof score) => createPlaybackTimeline(s).events.filter(e => e.eventId === selectedId)
    .map(e => ({ start: e.startBeat, duration: e.durationBeats, v0: e.velocityStart, v1: e.velocityEnd }))
  expect(velocity(after.score)).toEqual(velocity(before))
  expect(applyScoreCommand(after.score, after.undo).score).toEqual(before); expect(score).toEqual(before)
})
it('still allows a target whose hairpin application does not change', () => {
  const { score, selectedId } = createVoiceMoveHairpinFixture('enter-target'); let id = 0
  const plan = buildEmptyVoiceMove(score, locateEvent(score, selectedId), 'voice-3', () => 'safe-target-' + (++id))
  expect(plan.command).toBeDefined(); expect(plan.reason).toBeUndefined()
  expect(serializeMidi(applyScoreCommand(score, plan.command!).score)).toEqual(serializeMidi(score))
})
