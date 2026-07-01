import {
  createMeasure,
  createPart,
  createScore,
  createStaff,
  type KeySignature,
  type Score,
  type TimeSignature
} from '../../../score-core'

export interface NewScoreOptions {
  title: string
  composer?: string
  partName: string
  partAbbreviation?: string
  keySignature: KeySignature
  timeSignature: TimeSignature
  measureCount: number
}

export const keySignaturePresets = [
  {
    id: 'c-major',
    label: 'C major',
    value: { fifths: 0, mode: 'major' }
  },
  {
    id: 'a-minor',
    label: 'A minor',
    value: { fifths: 0, mode: 'minor' }
  },
  {
    id: 'g-major',
    label: 'G major',
    value: { fifths: 1, mode: 'major' }
  },
  {
    id: 'e-minor',
    label: 'E minor',
    value: { fifths: 1, mode: 'minor' }
  },
  {
    id: 'd-major',
    label: 'D major',
    value: { fifths: 2, mode: 'major' }
  },
  {
    id: 'b-minor',
    label: 'B minor',
    value: { fifths: 2, mode: 'minor' }
  },
  {
    id: 'a-major',
    label: 'A major',
    value: { fifths: 3, mode: 'major' }
  },
  {
    id: 'f-sharp-minor',
    label: 'F# minor',
    value: { fifths: 3, mode: 'minor' }
  },
  {
    id: 'f-major',
    label: 'F major',
    value: { fifths: -1, mode: 'major' }
  },
  {
    id: 'd-minor',
    label: 'D minor',
    value: { fifths: -1, mode: 'minor' }
  },
  {
    id: 'bb-major',
    label: 'Bb major',
    value: { fifths: -2, mode: 'major' }
  },
  {
    id: 'g-minor',
    label: 'G minor',
    value: { fifths: -2, mode: 'minor' }
  },
  {
    id: 'eb-major',
    label: 'Eb major',
    value: { fifths: -3, mode: 'major' }
  },
  {
    id: 'c-minor',
    label: 'C minor',
    value: { fifths: -3, mode: 'minor' }
  }
] satisfies Array<{
  id: string
  label: string
  value: KeySignature
}>

export const timeSignaturePresets = [
  {
    id: '2-4',
    label: '2/4',
    value: { beats: 2, beatType: 4 }
  },
  {
    id: '3-4',
    label: '3/4',
    value: { beats: 3, beatType: 4 }
  },
  {
    id: '4-4',
    label: '4/4',
    value: { beats: 4, beatType: 4 }
  },
  {
    id: '6-8',
    label: '6/8',
    value: { beats: 6, beatType: 8 }
  }
] satisfies Array<{
  id: string
  label: string
  value: TimeSignature
}>

export const partPresets = [
  {
    id: 'piano',
    label: 'Piano',
    abbreviation: 'Pno.'
  },
  {
    id: 'violin',
    label: 'Violin',
    abbreviation: 'Vln.'
  },
  {
    id: 'cello',
    label: 'Cello',
    abbreviation: 'Vc.'
  },
  {
    id: 'flute',
    label: 'Flute',
    abbreviation: 'Fl.'
  },
  {
    id: 'voice',
    label: 'Voice',
    abbreviation: 'Vox'
  },
  {
    id: 'melody',
    label: 'Melody',
    abbreviation: 'Mel.'
  }
] as const

export function createNewScore(options: NewScoreOptions): Score {
  const measureCount = Math.max(1, Math.floor(options.measureCount))
  const measures = Array.from({ length: measureCount }, (_, index) =>
    createMeasure({
      id: `measure-${index + 1}`,
      number: index + 1,
      keySignature: options.keySignature,
      timeSignature: options.timeSignature
    })
  )

  return createScore({
    id: `score-${crypto.randomUUID()}`,
    title: options.title.trim() || 'Untitled Score',
    composer: options.composer?.trim() || undefined,
    parts: [
      createPart({
        id: 'part-1',
        name: options.partName.trim() || 'Piano',
        abbreviation: options.partAbbreviation?.trim() || undefined,
        staves: [
          createStaff({
            id: 'staff-1',
            measures
          })
        ]
      })
    ]
  })
}

export function resolveKeySignaturePreset(
  id: string
): (typeof keySignaturePresets)[number] {
  return (
    keySignaturePresets.find((preset) => preset.id === id) ??
    keySignaturePresets[0]
  )
}

export function resolveKeySignaturePresetId(
  keySignature: KeySignature
): string {
  return (
    keySignaturePresets.find(
      (preset) =>
        preset.value.fifths === keySignature.fifths &&
        preset.value.mode === keySignature.mode
    )?.id ?? keySignaturePresets[0].id
  )
}

export function resolveTimeSignaturePreset(
  id: string
): (typeof timeSignaturePresets)[number] {
  return (
    timeSignaturePresets.find((preset) => preset.id === id) ??
    timeSignaturePresets[2]
  )
}

export function resolveTimeSignaturePresetId(
  timeSignature: TimeSignature
): string {
  return (
    timeSignaturePresets.find(
      (preset) =>
        preset.value.beats === timeSignature.beats &&
        preset.value.beatType === timeSignature.beatType
    )?.id ?? timeSignaturePresets[2].id
  )
}

export function resolvePartPreset(id: string): (typeof partPresets)[number] {
  return partPresets.find((preset) => preset.id === id) ?? partPresets[0]
}
