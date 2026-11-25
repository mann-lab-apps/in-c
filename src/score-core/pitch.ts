import { durationToTicks, sortVoiceEvents } from './timing'
import { sortScoreVoices } from './voice-order'
import type {
  KeySignature,
  Measure,
  Note,
  Pitch,
  PitchStep,
  Tick,
  Voice
} from './types'

const pitchSteps: PitchStep[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const pitchSemitones: Record<PitchStep, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11
}
const sharpOrder: PitchStep[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
const flatOrder: PitchStep[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F']
const writtenPhase = { trailing: 0, leading: 1, principal: 2 } as const

export function keySignatureAlter(
  keySignature: KeySignature,
  step: PitchStep
): Pitch['alter'] {
  if (keySignature.fifths > 0) {
    return sharpOrder
      .slice(0, Math.min(7, keySignature.fifths))
      .includes(step)
      ? 1
      : 0
  }

  if (keySignature.fifths < 0) {
    return flatOrder
      .slice(0, Math.min(7, Math.abs(keySignature.fifths)))
      .includes(step)
      ? -1
      : 0
  }

  return 0
}

export function effectiveAlterAt(input: {
  measure: Measure
  voice: Voice
  step: PitchStep
  octave: number
  tick: Tick
  override?: Pitch['alter']
  excludeEventId?: string
}): Pitch['alter'] {
  if (input.override !== undefined) {
    return input.override
  }

  const previousPitch = sortVoiceEvents(input.voice.events)
    .filter(
      (event): event is Note =>
        event.type === 'note' &&
        event.id !== input.excludeEventId &&
        event.position.tick < input.tick
    )
    .flatMap((note) => note.pitches?.length ? note.pitches : [note.pitch])
    .filter((pitch) =>
      pitch.step === input.step &&
      pitch.octave === input.octave &&
      pitch.alter !== undefined
    )
    .at(-1)

  return previousPitch?.alter ??
    keySignatureAlter(input.measure.keySignature, input.step)
}

export function resolveNotePitch(
  measure: Measure,
  voice: Voice,
  note: Note
): Pitch {
  return {
    ...note.pitch,
    alter: effectiveAlterAt({
      measure,
      voice,
      step: note.pitch.step,
      octave: note.pitch.octave,
      tick: note.position.tick,
      override: note.pitch.alter
    })
  }
}

export function shouldDisplayAccidental(
  measure: Measure,
  voice: Voice,
  note: Note,
  graceIndex?: number
): boolean {
  const grace = graceIndex === undefined ? undefined : note.graceNotes?.[graceIndex]
  const pitch = grace?.pitch ?? note.pitch
  const previousAlter = precedingWrittenAlter(measure, voice, note, pitch, graceIndex) ??
    keySignatureAlter(measure.keySignature, pitch.step)
  const noteAlter = effectiveAlterAt({
    measure,
    voice,
    step: pitch.step,
    octave: pitch.octave,
    tick: note.position.tick,
    override: pitch.alter
  })

  return noteAlter !== previousAlter
}

// The reader sees accidentals on the whole staff, including graces. Written
// context is shared, but the pitch of each entry still resolves in its voice.
function precedingWrittenAlter(
  measure: Measure,
  voice: Voice,
  note: Note,
  pitch: Pitch,
  graceIndex?: number
): Pitch['alter'] {
  const matches = (candidate: Pitch) => candidate.step === pitch.step && candidate.octave === pitch.octave
  const after = graceIndex !== undefined && note.graceNotes?.[graceIndex]?.after
  let firstInGraceChord = graceIndex
  while (firstInGraceChord !== undefined && firstInGraceChord > 0 && note.graceNotes?.[firstInGraceChord]?.chord) {
    firstInGraceChord -= 1
  }
  const precedingGraces = note.graceNotes?.slice(0, firstInGraceChord).reverse()
  const priorGroupPitch = precedingGraces?.find(grace => Boolean(grace.after) === Boolean(after) && matches(grace.pitch))?.pitch
  if (graceIndex !== undefined && priorGroupPitch) {
    return resolveNotePitch(measure, voice, { ...note, pitch: priorGroupPitch }).alter
  }

  const voices = sortScoreVoices([...measure.voices.filter(candidate => candidate.id !== voice.id), voice])
  const targetVoice = voices.indexOf(voice)
  const targetTick = note.position.tick + (after ? durationToTicks(note.duration) : 0)
  const ownPitchBeforeTarget = after
    ? (note.pitches ?? [note.pitch]).slice().reverse().find(matches) ??
      precedingGraces?.find(grace => !grace.after && matches(grace.pitch))?.pitch
    : priorGroupPitch
  // A grace after a held note sees any intervening accidentals from other voices.
  let previous: { event: Note; voice: Voice; pitch: Pitch; tick: Tick; phase: number } | undefined =
    ownPitchBeforeTarget ? {
      event: note, voice, pitch: ownPitchBeforeTarget, tick: note.position.tick,
      phase: after ? writtenPhase.principal : writtenPhase.leading
    } : undefined
  for (const [index, precedingVoice] of voices.entries()) {
    for (const event of precedingVoice.events) {
      if (event.type !== 'note') continue
      if (precedingVoice.id === voice.id && event.id === note.id) continue
      const tick = event.position.tick
      if (tick > targetTick) continue

      const fromEarlierTick = tick < targetTick
      const canUsePrincipal = fromEarlierTick || (graceIndex === undefined && index < targetVoice)
      const canUseLeading = fromEarlierTick || (!after && (graceIndex === undefined || index < targetVoice))
      const members = event.pitches?.length ? event.pitches : [event.pitch]
      const principal = canUsePrincipal
        ? members.slice().reverse().find(matches)
        : undefined
      const graces = event.graceNotes?.slice().reverse()
      const leading = canUseLeading ? graces?.find(grace => !grace.after && matches(grace.pitch))?.pitch : undefined
      const trailingGrace = graces?.find(grace => grace.after && matches(grace.pitch))
      const endTick = trailingGrace ? tick + durationToTicks(event.duration) : tick
      const trailing = endTick <= targetTick ? trailingGrace?.pitch : undefined
      const writtenPitch = trailing ?? principal ?? leading
      const writtenTick = trailing ? endTick : tick
      if (!writtenPitch || (previous && writtenTick < previous.tick)) continue

      // Trailing graces and then leading graces precede the principal noteheads at the same tick.
      const phase = trailing ? writtenPhase.trailing : principal ? writtenPhase.principal : writtenPhase.leading
      if (writtenTick === previous?.tick) {
        const supersedesPrevious = phase > previous.phase || (phase === previous.phase && previous.event !== note)
        if (!supersedesPrevious) continue
      }
      previous = { event, voice: precedingVoice, pitch: writtenPitch, tick: writtenTick, phase }
    }
  }
  return previous && resolveNotePitch(measure, previous.voice, { ...previous.event, pitch: previous.pitch }).alter
}

export function nearestPitch(input: {
  step: PitchStep
  alter: Pitch['alter']
  reference?: Pitch
}): Pitch {
  if (!input.reference) {
    return {
      step: input.step,
      octave: 4,
      alter: input.alter
    }
  }

  const referenceMidi = pitchToMidi(input.reference)
  const candidates = [-1, 0, 1].map((octaveOffset) => ({
    step: input.step,
    octave: input.reference!.octave + octaveOffset,
    alter: input.alter
  }))

  return candidates.reduce((nearest, candidate) => {
    const nearestDistance = Math.abs(pitchToMidi(nearest) - referenceMidi)
    const candidateDistance = Math.abs(
      pitchToMidi(candidate) - referenceMidi
    )

    return candidateDistance < nearestDistance ? candidate : nearest
  })
}

export function transposeDiatonic(
  pitch: Pitch,
  direction: -1 | 1
): Pick<Pitch, 'step' | 'octave'> {
  const stepIndex = pitchSteps.indexOf(pitch.step)
  const nextIndex = stepIndex + direction

  if (nextIndex < 0) {
    return {
      step: 'B',
      octave: pitch.octave - 1
    }
  }

  if (nextIndex >= pitchSteps.length) {
    return {
      step: 'C',
      octave: pitch.octave + 1
    }
  }

  return {
    step: pitchSteps[nextIndex],
    octave: pitch.octave
  }
}

export function transposeChromatic(
  pitch: Pitch,
  direction: -1 | 1
): Pitch | undefined {
  const alter = (pitch.alter ?? 0) + direction

  if (alter < -2 || alter > 2) {
    return undefined
  }

  return {
    ...pitch,
    alter: alter as Pitch['alter']
  }
}

export function transposeOctave(pitch: Pitch, direction: -1 | 1): Pitch {
  return {
    ...pitch,
    octave: pitch.octave + direction
  }
}

export function pitchToMidi(pitch: Pitch): number {
  return (
    (pitch.octave + 1) * 12 +
    pitchSemitones[pitch.step] +
    (pitch.alter ?? 0)
  )
}
