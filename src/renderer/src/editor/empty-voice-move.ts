import { applyScoreCommand, createRest, decomposeDurationTicks, durationToTicks, effectiveAlterAt, measureDurationTicks, preserveFollowingPitchSounds, sortVoiceEvents, validateMeasureRhythm, validateTieRelations, voiceEventDurationTicks, type Note, type Score, type ScoreCommand, type Staff, type VoiceEvent } from '../../../score-core'
import { collectSpanEndpointIds } from '../../../score-core/span-references'
import { locateEvent, type EditorSelection, type EventLocation } from './editor-state'
import { buildStaffContentCommand } from './staff-content-command'

// Private editor transaction: no voice navigation, engine command or schema change.
export function buildEmptyVoiceMove(score: Score, location: EventLocation | undefined, targetVoice: string, createId: () => string): { command?: ScoreCommand; selection?: EditorSelection; reason?: string } {
  const blocked = (reason: string) => ({ reason })
  const current = location && locateEvent(score, location.event.id, location.address)
  if (!current || current.event.type !== 'note') return blocked('옮길 일반 음표 하나를 선택하세요.')
  const { event: note, measure, address } = current
  if (!/^voice-[1-4]$/.test(targetVoice) || targetVoice === address.voiceId) return blocked('같은 마디의 다른 1–4성부를 고르세요.')
  const source = measure.voices.find(v => v.id === address.voiceId)!, target = measure.voices.find(v => v.id === targetVoice)
  if (!target && measure.voices.length >= 4) return blocked('현재 마디에 성부가 네 개 있습니다. 기존 빈 성부를 고르세요.')
  if ((note.pitches?.length ?? 1) > 1 || note.graceNotes?.length || note.lyrics?.length || note.articulations?.length || note.ornaments?.length || note.tremolo || note.fermata || note.breathMark) return blocked('화음·꾸밈음·가사·표현 기호가 없는 일반 단음을 선택하세요.')
  if (note.ties?.start || note.ties?.stop || note.duration.tuplet || source.tuplets?.some(t => t.eventIds.includes(note.id))) return blocked('타이·잇단음표가 연결된 음표는 옮길 수 없습니다.')
  const anchors = collectSpanEndpointIds(score)
  if (anchors.has(note.id)) return blocked('구간 기호의 시작·끝 음표는 먼저 연결을 확인하세요.')
  const blank = target?.events[0]
  if (target && (target.tuplets?.length || target.events.length !== 1 || blank?.type !== 'rest' || !blank.fullMeasure || blank.position.tick !== 0 || blank.fermata || blank.breathMark || blank.duration.tuplet)) return blocked('대상은 없거나 표기가 없는 온마디 쉼표 하나인 빈 성부여야 합니다. 기존 내용은 덮어쓰지 않습니다.')
  if (blank && anchors.has(blank.id)) return blocked('대상 성부의 쉼표가 구간 기호의 시작·끝입니다. 연결을 먼저 확인하세요. 기존 내용은 덮어쓰지 않습니다.')
  const staff = score.parts.find(p => p.id === address.partId)?.staves.find(s => s.id === address.staffId)
  if (!staff || !validateMeasureRhythm(measure).isExact) return blocked('현재 마디의 리듬을 먼저 확인하세요.')
  if (changesHairpinVoiceScope(score, staff, note, address.voiceId, targetVoice)) return blocked('성부 이동으로 헤어핀 적용이 달라집니다. 재생 세기를 보존하기 위해 옮기지 않습니다. 헤어핀 구간과 대상 성부를 먼저 확인하세요.')
  const end = note.position.tick + durationToTicks(note.duration)
  const before = decomposeDurationTicks(note.position.tick), after = decomposeDurationTicks(measureDurationTicks(measure) - end)
  if (!before || !after) return blocked('대상 성부의 앞뒤 쉼표를 현재 마디 길이에 맞출 수 없습니다.')
  const ids = new Set(score.parts.flatMap(p => p.staves.flatMap(s => s.measures.flatMap(m => m.voices.flatMap(v => v.events.map(e => e.id))))))
  const allocate = () => { const id = createId(); if (!id || ids.has(id)) throw Error('Duplicate event ID'); ids.add(id); return id }
  try {
    const replacedSource = sortVoiceEvents(source.events).map(event => event.id === note.id
      ? createRest({ id: allocate(), position: note.position, duration: note.duration })
      : event)
    const sourceEvents = preserveFollowingPitchSounds(measure, source, replacedSource, note.position.tick)
    const targetEvents: VoiceEvent[] = []
    let tick = 0
    for (const duration of before) { targetEvents.push(createRest({ id: allocate(), position: { tick }, duration })); tick += durationToTicks(duration) }
    const pinMoved = (pitch: Note['pitch']) => {
      const args = { measure, step: pitch.step, octave: pitch.octave, tick: note.position.tick, override: pitch.alter }
      const desired = effectiveAlterAt({ ...args, voice: source }), actual = effectiveAlterAt({ ...args, voice: { id: targetVoice, events: targetEvents } })
      return desired === actual ? pitch : { ...pitch, alter: desired }
    }
    const pitches = note.pitches?.map(pinMoved)
    targetEvents.push({ ...note, pitch: pitches?.[0] ?? pinMoved(note.pitch), ...(pitches ? { pitches } : {}) }); tick = end
    for (const duration of after) { targetEvents.push(createRest({ id: allocate(), position: { tick }, duration })); tick += durationToTicks(duration) }
    const nextTarget = { ...(target ?? { id: targetVoice }), events: targetEvents }
    const voices = measure.voices.map(voice => voice.id === source.id ? { ...voice, events: sourceEvents } : voice.id === targetVoice ? nextTarget : voice)
    if (!target) voices.push(nextTarget)
    const next = { ...measure, voices }
    if (!validateMeasureRhythm(next).isExact) return blocked('이동 후 마디 리듬이 맞지 않아 변경하지 않았습니다.')
    const command = buildStaffContentCommand(score.parts, { partId: address.partId, staffId: address.staffId }, staff.measures.map(m => m.id === measure.id ? next : m))
    if (validateTieRelations(applyScoreCommand(score, command).score).length) return blocked('이웃 음표의 타이 연결을 보존할 수 없어 옮기지 않았습니다.')
    return { command, selection: { type: 'event', eventId: note.id, address: { ...address, voiceId: targetVoice } } }
  } catch {
    return blocked('현재 음표 ID와 리듬을 보존할 수 없어 옮기지 않았습니다.')
  }
}

function changesHairpinVoiceScope(score: Score, staff: Staff, note: Note, sourceVoice: string, targetVoice: string): boolean {
  if (!score.hairpins?.length) return false
  const positions = new Map<string, { voiceId: string; start: number; end: number }>()
  let measureStart = 0
  for (const measure of staff.measures) {
    for (const voice of measure.voices) for (const event of voice.events) {
      const start = measureStart + event.position.tick
      positions.set(event.id, { voiceId: voice.id, start, end: start + voiceEventDurationTicks(event, measure) })
    }
    measureStart += measureDurationTicks(measure)
  }
  const selected = positions.get(note.id)
  if (!selected) return false
  return score.hairpins.some(span => {
    const start = positions.get(span.startEventId)
    const address = span.endTime
    let beat = 0
    const end = address ? staff.measures.find(measure => {
      if (measure.id === address.measureId) return true
      beat += measureDurationTicks(measure)
      return false
    }) && { voiceId: address.voiceId, end: beat + address.tick }
      : positions.get(span.endEventId)
    // Match the existing playback scope: different endpoint voices apply to
    // the whole staff; equal endpoint voices apply only to that voice.
    if (!start || !end || start.voiceId !== end.voiceId) return false
    if ((sourceVoice === start.voiceId) === (targetVoice === start.voiceId)) return false
    return end.end > start.start && selected.start < end.end && selected.end > start.start
  })
}
