import type { InstrumentTransposition, Score, ScoreCommand } from '../../../score-core'

export const instrumentTranspositionPresets: ReadonlyArray<{
  id: string
  label: string
  value: InstrumentTransposition
}> = [
  { id: 'concert', label: 'C (실음)', value: { diatonic: 0, chromatic: 0 } },
  { id: 'bb', label: 'B♭ (장2도 아래)', value: { diatonic: -1, chromatic: -2 } },
  { id: 'eb', label: 'E♭ (장6도 아래)', value: { diatonic: -5, chromatic: -9 } },
  { id: 'f', label: 'F (완전5도 아래)', value: { diatonic: -4, chromatic: -7 } },
  { id: 'octave-down', label: 'C (옥타브 아래)', value: { diatonic: 0, chromatic: 0, octaveChange: -1 } },
  { id: 'bb-bass', label: 'B♭ (장9도 아래)', value: { diatonic: -1, chromatic: -2, octaveChange: -1 } }
]

export function resolveInstrumentTranspositionId(value?: InstrumentTransposition): string {
  return instrumentTranspositionPresets.find((preset) =>
    preset.value.chromatic === (value?.chromatic ?? 0) &&
    (preset.value.octaveChange ?? 0) === (value?.octaveChange ?? 0) &&
    (value?.diatonic === undefined || preset.value.diatonic === value.diatonic)
  )?.id ?? 'custom'
}

export function buildPartTranspositionCommand(score: Score, partId: string, presetId: string): ScoreCommand | undefined {
  const preset = instrumentTranspositionPresets.find((candidate) => candidate.id === presetId)
  if (!preset || !score.parts.some((part) => part.id === partId)) return undefined
  return {
    type: 'score-parts.replace',
    parts: score.parts.map((part) => part.id !== partId ? part : {
      ...part,
      staves: part.staves.map((staff) => ({
        ...staff,
        measures: staff.measures.map((measure) => ({ ...measure, transposition: { ...preset.value } }))
      }))
    })
  }
}
