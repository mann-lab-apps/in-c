import {
  createMeasure,
  createPart,
  createScore,
  createStaff,
  type Clef,
  type KeySignature,
  type Score,
  type TempoMarking,
  type TimeSignature
} from '../../../score-core'

export type NewScoreTemplateId =
  | 'solo-melody'
  | 'piano-grand-staff'
  | 'duet'
  | 'string-quartet'

export interface NewScoreOptions {
  title: string
  composer?: string
  partName?: string
  partAbbreviation?: string
  keySignature: KeySignature
  timeSignature: TimeSignature
  measureCount: number
  tempo?: number
  templateId?: NewScoreTemplateId
}

export const keySignaturePresets = [
  {
    id: 'c-major',
    label: '다장조 (조표 없음)',
    value: { fifths: 0, mode: 'major' }
  },
  {
    id: 'a-minor',
    label: '가단조 (조표 없음)',
    value: { fifths: 0, mode: 'minor' }
  },
  {
    id: 'g-major',
    label: '사장조 (♯ 1개)',
    value: { fifths: 1, mode: 'major' }
  },
  {
    id: 'e-minor',
    label: '마단조 (♯ 1개)',
    value: { fifths: 1, mode: 'minor' }
  },
  {
    id: 'd-major',
    label: '라장조 (♯ 2개)',
    value: { fifths: 2, mode: 'major' }
  },
  {
    id: 'b-minor',
    label: '나단조 (♯ 2개)',
    value: { fifths: 2, mode: 'minor' }
  },
  {
    id: 'a-major',
    label: '가장조 (♯ 3개)',
    value: { fifths: 3, mode: 'major' }
  },
  {
    id: 'f-sharp-minor',
    label: '올림바단조 (♯ 3개)',
    value: { fifths: 3, mode: 'minor' }
  },
  {
    id: 'f-major',
    label: '바장조 (♭ 1개)',
    value: { fifths: -1, mode: 'major' }
  },
  {
    id: 'd-minor',
    label: '라단조 (♭ 1개)',
    value: { fifths: -1, mode: 'minor' }
  },
  {
    id: 'bb-major',
    label: '내림나장조 (♭ 2개)',
    value: { fifths: -2, mode: 'major' }
  },
  {
    id: 'g-minor',
    label: '사단조 (♭ 2개)',
    value: { fifths: -2, mode: 'minor' }
  },
  {
    id: 'eb-major',
    label: '내림마장조 (♭ 3개)',
    value: { fifths: -3, mode: 'major' }
  },
  {
    id: 'c-minor',
    label: '다단조 (♭ 3개)',
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
    abbreviation: 'Pno.',
    staves: [
      { id: 'staff-1', clef: { sign: 'G', line: 2 } },
      { id: 'staff-2', clef: { sign: 'F', line: 4 } }
    ]
  },
  {
    id: 'violin',
    label: '바이올린',
    abbreviation: 'Vln.',
    staves: [{ id: 'staff-1', clef: { sign: 'G', line: 2 } }]
  },
  {
    id: 'viola',
    label: '비올라',
    abbreviation: 'Vla.',
    staves: [{ id: 'staff-1', clef: { sign: 'C', line: 3 } }]
  },
  {
    id: 'cello',
    label: '첼로',
    abbreviation: 'Vc.',
    staves: [{ id: 'staff-1', clef: { sign: 'F', line: 4 } }]
  },
  {
    id: 'double-bass',
    label: '더블베이스',
    abbreviation: 'Cb.',
    staves: [{ id: 'staff-1', clef: { sign: 'F', line: 4 } }]
  },
  {
    id: 'flute',
    label: '플루트',
    abbreviation: 'Fl.',
    staves: [{ id: 'staff-1', clef: { sign: 'G', line: 2 } }]
  },
  {
    id: 'clarinet',
    label: '클라리넷',
    abbreviation: 'Cl.',
    staves: [{ id: 'staff-1', clef: { sign: 'G', line: 2 } }]
  },
  {
    id: 'voice',
    label: '성악',
    abbreviation: 'Vox',
    staves: [{ id: 'staff-1', clef: { sign: 'G', line: 2 } }]
  },
  {
    id: 'melody',
    label: '멜로디',
    abbreviation: 'Mel.',
    staves: [{ id: 'staff-1', clef: { sign: 'G', line: 2 } }]
  }
] as const satisfies ReadonlyArray<{
  id: string
  label: string
  abbreviation: string
  staves: ReadonlyArray<{
    id: string
    clef: Clef
  }>
}>

export const scoreStructurePresets = [
  {
    id: 'solo-melody',
    label: '솔로 멜로디',
    parts: [
      {
        id: 'part-1',
        name: '멜로디',
        abbreviation: 'Mel.',
        staves: [{ id: 'staff-1', clef: { sign: 'G', line: 2 } }]
      }
    ]
  },
  {
    id: 'piano-grand-staff',
    label: '피아노 grand staff',
    parts: [
      {
        id: 'part-1',
        name: 'Piano',
        abbreviation: 'Pno.',
        staves: [
          { id: 'staff-1', clef: { sign: 'G', line: 2 } },
          { id: 'staff-2', clef: { sign: 'F', line: 4 } }
        ]
      }
    ]
  },
  {
    id: 'duet',
    label: '2파트 앙상블',
    parts: [
      {
        id: 'part-1',
        name: 'Part 1',
        abbreviation: 'P1',
        staves: [{ id: 'staff-1', clef: { sign: 'G', line: 2 } }]
      },
      {
        id: 'part-2',
        name: 'Part 2',
        abbreviation: 'P2',
        staves: [{ id: 'staff-1', clef: { sign: 'G', line: 2 } }]
      }
    ]
  },
  {
    id: 'string-quartet',
    label: '현악 4중주',
    parts: [
      {
        id: 'violin-1',
        name: 'Violin I',
        abbreviation: 'Vln. I',
        staves: [{ id: 'staff-1', clef: { sign: 'G', line: 2 } }]
      },
      {
        id: 'violin-2',
        name: 'Violin II',
        abbreviation: 'Vln. II',
        staves: [{ id: 'staff-1', clef: { sign: 'G', line: 2 } }]
      },
      {
        id: 'viola',
        name: 'Viola',
        abbreviation: 'Vla.',
        staves: [{ id: 'staff-1', clef: { sign: 'C', line: 3 } }]
      },
      {
        id: 'cello',
        name: 'Cello',
        abbreviation: 'Vc.',
        staves: [{ id: 'staff-1', clef: { sign: 'F', line: 4 } }]
      }
    ]
  }
] as const satisfies ReadonlyArray<{
  id: NewScoreTemplateId
  label: string
  parts: ReadonlyArray<{
    id: string
    name: string
    abbreviation: string
    staves: ReadonlyArray<{
      id: string
      clef: Clef
    }>
  }>
}>

export function createNewScore(options: NewScoreOptions): Score {
  const measureCount = Math.max(1, Math.floor(options.measureCount))
  const tempo = options.tempo ?? 120
  const template = resolveScoreStructurePreset(
    options.templateId ?? 'solo-melody'
  )
  const useLegacySinglePart =
    !options.templateId || options.templateId === 'solo-melody'

  return createScore({
    id: `score-${crypto.randomUUID()}`,
    title: options.title.trim() || '제목 없는 악보',
    composer: options.composer?.trim() || undefined,
    tempo: createTempoMarkingForTimeSignature(tempo, options.timeSignature),
    parts: useLegacySinglePart
      ? [
      createPart({
        id: 'part-1',
        name: options.partName?.trim() || template.parts[0].name,
        abbreviation: options.partAbbreviation?.trim() || undefined,
        staves: [
          createStaff({
            id: 'staff-1',
            measures: createTemplateMeasures({
              measureCount,
              keySignature: options.keySignature,
              timeSignature: options.timeSignature,
              clef: template.parts[0].staves[0].clef,
              idPrefix: 'staff-1',
              preserveLegacyMeasureIds: true
            })
          })
        ]
      })
    ]
      : template.parts.map((part) =>
          createPart({
            id: part.id,
            name: part.name,
            abbreviation: part.abbreviation,
            staves: part.staves.map((staff) =>
              createStaff({
                id: staff.id,
                measures: createTemplateMeasures({
                  measureCount,
                  keySignature: options.keySignature,
                  timeSignature: options.timeSignature,
                  clef: staff.clef,
                  idPrefix: `${part.id}-${staff.id}`
                })
              })
            )
          })
        )
  })
}

function createTemplateMeasures({
  measureCount,
  keySignature,
  timeSignature,
  clef,
  idPrefix,
  preserveLegacyMeasureIds = false
}: {
  measureCount: number
  keySignature: KeySignature
  timeSignature: TimeSignature
  clef: Clef
  idPrefix: string
  preserveLegacyMeasureIds?: boolean
}) {
  return Array.from({ length: measureCount }, (_, index) =>
    createMeasure({
      id: preserveLegacyMeasureIds
        ? `measure-${index + 1}`
        : `${idPrefix}-measure-${index + 1}`,
      number: index + 1,
      keySignature,
      timeSignature,
      clef
    })
  )
}

export function createTempoMarkingForTimeSignature(
  bpm: number,
  timeSignature: TimeSignature,
  overrides: Partial<Pick<TempoMarking, 'transparent'>> = {}
): TempoMarking {
  const beat = resolveDefaultTempoBeatForTimeSignature(timeSignature)
  const tempo = {
    bpm,
    ...beat,
    transparent: overrides.transparent
  }

  return {
    ...tempo,
    text: formatTempoMarkingText(tempo)
  }
}

export function resolveDefaultTempoBeatForTimeSignature(
  timeSignature: TimeSignature
): Required<Pick<TempoMarking, 'beatUnit' | 'dots'>> {
  if (isCompoundMeter(timeSignature)) {
    const beatUnit = resolveCompoundTempoBeatUnit(timeSignature.beatType)

    if (beatUnit) {
      return {
        beatUnit,
        dots: 1
      }
    }
  }

  return {
    beatUnit: resolveSimpleTempoBeatUnit(timeSignature.beatType) ?? 'quarter',
    dots: 0
  }
}

export function formatTempoMarkingText(
  tempo: Pick<TempoMarking, 'bpm' | 'beatUnit' | 'dots'>
): string {
  const symbol = tempoBeatUnitSymbol(tempo.beatUnit ?? 'quarter')
  const dots = '.'.repeat(tempo.dots ?? 0)

  return `${symbol}${dots} = ${tempo.bpm}`
}

function isCompoundMeter(timeSignature: TimeSignature): boolean {
  return timeSignature.beats > 3 && timeSignature.beats % 3 === 0
}

function resolveSimpleTempoBeatUnit(
  beatType: TimeSignature['beatType']
): TempoMarking['beatUnit'] {
  return beatType === 1
    ? 'whole'
    : beatType === 2
      ? 'half'
      : beatType === 4
        ? 'quarter'
        : beatType === 8
          ? 'eighth'
          : beatType === 16
            ? '16th'
            : beatType === 32
              ? '32nd'
              : beatType === 64
                ? '64th'
                : undefined
}

function resolveCompoundTempoBeatUnit(
  beatType: TimeSignature['beatType']
): TempoMarking['beatUnit'] {
  return beatType === 2
    ? 'whole'
    : beatType === 4
      ? 'half'
      : beatType === 8
        ? 'quarter'
        : beatType === 16
          ? 'eighth'
          : beatType === 32
            ? '16th'
            : beatType === 64
              ? '32nd'
              : undefined
}

function tempoBeatUnitSymbol(beatUnit: NonNullable<TempoMarking['beatUnit']>): string {
  return beatUnit === 'whole'
    ? '𝅝'
    : beatUnit === 'half'
      ? '𝅗𝅥'
      : beatUnit === 'eighth'
        ? '♪'
        : beatUnit === '16th'
          ? '𝅘𝅥𝅯'
          : beatUnit === '32nd'
            ? '𝅘𝅥𝅰'
            : beatUnit === '64th'
              ? '𝅘𝅥𝅱'
              : '♩'
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

export function resolveScoreStructurePreset(
  id: string
): (typeof scoreStructurePresets)[number] {
  return (
    scoreStructurePresets.find((preset) => preset.id === id) ??
    scoreStructurePresets[0]
  )
}
