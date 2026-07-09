import {
  durationToTicks,
  measureDurationTicks,
  sortVoiceEvents,
  voiceEventDurationTicks,
  type Duration,
  type Measure,
  type Score,
  type VoiceEvent
} from '../../../score-core'
import type { EditorSelection } from './editor-state'
import { locateEvent } from './editor-state'

export function describeTupletToggleFailure(
  score: Score,
  selection: EditorSelection,
  actualNotes = 3,
  normalNotes = 2
): string {
  if (selection.type !== 'event') {
    return '셋잇단음표를 만들거나 해제할 음표 또는 쉼표를 선택해 주세요.'
  }

  const location = locateEvent(score, selection.eventId)

  if (!location) {
    return '선택한 이벤트를 찾을 수 없습니다.'
  }

  const voice = location.measure.voices.find(
    (candidate) => candidate.id === location.address.voiceId
  )

  if (!voice) {
    return '선택한 성부를 찾을 수 없습니다.'
  }

  const existingGroup = voice.tuplets?.find((group) =>
    group.eventIds.includes(selection.eventId)
  )

  if (existingGroup) {
    return describeUntupletFailure(location.measure, sortVoiceEvents(voice.events), existingGroup)
  }

  if (
    location.event.type === 'note' &&
    (location.event.ties?.start || location.event.ties?.stop)
  ) {
    return '타이로 연결된 음표는 먼저 타이를 해제한 뒤 셋잇단음표로 바꿔 주세요.'
  }

  if (location.event.duration.tuplet) {
    return '선택한 잇단음표의 그룹 정보를 찾을 수 없습니다. 잇단음표 그룹 전체를 다시 선택해 주세요.'
  }

  if (location.event.duration.dots > 0) {
    return '점음표는 아직 셋잇단음표로 바로 바꿀 수 없습니다.'
  }

  const tupletDuration: Duration = {
    ...location.event.duration,
    tuplet: { actualNotes, normalNotes }
  }
  const startTick = location.event.position.tick
  const endTick = startTick + durationToTicks(tupletDuration) * actualNotes

  if (endTick > measureDurationTicks(location.measure)) {
    return '셋잇단음표가 현재 마디를 넘어갑니다.'
  }

  const overlapping = sortVoiceEvents(voice.events).filter(
    (event) =>
      event.position.tick < endTick &&
      event.position.tick + voiceEventDurationTicks(event, location.measure) >
        startTick
  )

  if (overlapping.some((event) => event.duration.tuplet)) {
    return '기존 잇단음표가 포함된 구간은 먼저 해제한 뒤 다시 셋잇단음표로 바꿔 주세요.'
  }

  if (
    overlapping.some(
      (event) => event.type === 'note' && (event.ties?.start || event.ties?.stop)
    )
  ) {
    return '타이로 연결된 음표가 포함된 구간은 먼저 타이를 해제해 주세요.'
  }

  if (
    overlapping.some(
      (event) =>
        event.duration.value !== location.event.duration.value ||
        event.duration.dots !== location.event.duration.dots
    )
  ) {
    return '셋잇단음표로 바꿀 구간에는 같은 음가의 이벤트만 포함할 수 있습니다.'
  }

  return '셋잇단음표를 만들려면 선택한 이벤트 뒤에 마디 안의 충분한 연속 시간이 필요합니다.'
}

function describeUntupletFailure(
  measure: Measure,
  events: VoiceEvent[],
  group: NonNullable<Measure['voices'][number]['tuplets']>[number]
): string {
  const members = group.eventIds
    .map((eventId) => events.find((event) => event.id === eventId))
    .filter((event): event is VoiceEvent => Boolean(event))

  if (members.length !== group.actualNotes) {
    return '셋잇단음표 그룹 구성음이 완전하지 않아 해제할 수 없습니다.'
  }

  if (
    members.some(
      (event) => event.type === 'note' && (event.ties?.start || event.ties?.stop)
    )
  ) {
    return '타이가 포함된 셋잇단음표는 먼저 타이를 해제한 뒤 수정해 주세요.'
  }

  const firstMember = members[0]
  const tupletDuration = firstMember.duration

  if (!tupletDuration.tuplet || tupletDuration.dots > 0) {
    return '셋잇단음표 그룹의 음가 정보가 일관되지 않아 해제할 수 없습니다.'
  }

  const baseDuration: Duration = {
    ...tupletDuration,
    tuplet: undefined
  }
  const expandedEndTick =
    firstMember.position.tick + durationToTicks(baseDuration) * group.actualNotes

  if (expandedEndTick > measureDurationTicks(measure)) {
    return '일반 음가로 해제하면 마디를 넘어가므로 해제할 수 없습니다.'
  }

  return '셋잇단음표 그룹을 해제하려면 뒤에 충분한 쉼표 공간이 있거나 그룹을 현재 구간 안에서 정리할 수 있어야 합니다.'
}
