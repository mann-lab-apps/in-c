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
  tempo?: number
}

export const keySignaturePresets = [
  {
    id: 'c-major',
    label: '다장조',
    value: { fifths: 0, mode: 'major' }
  },
  {
    id: 'a-minor',
    label: '가단조',
    value: { fifths: 0, mode: 'minor' }
  },
  {
    id: 'g-major',
    label: '사장조',
    value: { fifths: 1, mode: 'major' }
  },
  {
    id: 'e-minor',
    label: '마단조',
    value: { fifths: 1, mode: 'minor' }
  },
  {
    id: 'd-major',
    label: '라장조',
    value: { fifths: 2, mode: 'major' }
  },
  {
    id: 'b-minor',
    label: '나단조',
    value: { fifths: 2, mode: 'minor' }
  },
  {
    id: 'a-major',
    label: '가장조',
    value: { fifths: 3, mode: 'major' }
  },
  {
    id: 'f-sharp-minor',
    label: '올림바단조',
    value: { fifths: 3, mode: 'minor' }
  },
  {
    id: 'f-major',
    label: '바장조',
    value: { fifths: -1, mode: 'major' }
  },
  {
    id: 'd-minor',
    label: '라단조',
    value: { fifths: -1, mode: 'minor' }
  },
  {
    id: 'bb-major',
    label: '내림나장조',
    value: { fifths: -2, mode: 'major' }
  },
  {
    id: 'g-minor',
    label: '사단조',
    value: { fifths: -2, mode: 'minor' }
  },
  {
    id: 'eb-major',
    label: '내림마장조',
    value: { fifths: -3, mode: 'major' }
  },
  {
    id: 'c-minor',
    label: '다단조',
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
    label: '피아노',
    abbreviation: 'Pno.'
  },
  {
    id: 'violin',
    label: '바이올린',
    abbreviation: 'Vln.'
  },
  {
    id: 'cello',
    label: '첼로',
    abbreviation: 'Vc.'
  },
  {
    id: 'flute',
    label: '플루트',
    abbreviation: 'Fl.'
  },
  {
    id: 'voice',
    label: '성악',
    abbreviation: 'Vox'
  },
  {
    id: 'melody',
    label: '멜로디',
    abbreviation: 'Mel.'
  }
] as const

export function createNewScore(options: NewScoreOptions): Score {
  const measureCount = Math.max(1, Math.floor(options.measureCount))
  const tempo = options.tempo ?? 120
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
    title: options.title.trim() || '제목 없는 악보',
    composer: options.composer?.trim() || undefined,
    tempo: {
      bpm: tempo,
      text: `♩ = ${tempo}`
    },
    parts: [
      createPart({
        id: 'part-1',
        name: options.partName.trim() || '피아노',
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
