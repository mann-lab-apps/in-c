import { sortVoiceEvents } from './timing'
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

  const previousNote = sortVoiceEvents(input.voice.events)
    .filter(
      (event): event is Note =>
        event.type === 'note' &&
        event.id !== input.excludeEventId &&
        event.position.tick < input.tick &&
        event.pitch.step === input.step &&
        event.pitch.octave === input.octave &&
        event.pitch.alter !== undefined
    )
    .at(-1)

  return previousNote?.pitch.alter ??
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
  note: Note
): boolean {
  const previousAlter = effectiveAlterAt({
    measure,
    voice,
    step: note.pitch.step,
    octave: note.pitch.octave,
    tick: note.position.tick,
    excludeEventId: note.id
  })
  const noteAlter = effectiveAlterAt({
    measure,
    voice,
    step: note.pitch.step,
    octave: note.pitch.octave,
    tick: note.position.tick,
    override: note.pitch.alter
  })

  return noteAlter !== previousAlter
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
