import { XMLParser } from 'fast-xml-parser'

import {
  TICKS_PER_QUARTER,
  createFullMeasureRest,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createStaff,
  createTimePosition,
  createVoice,
  durationToTicks,
  validateTieRelations,
  validateMeasureRhythm,
  validateVoiceTuplets,
  type Articulation,
  type BreathMark,
  type Clef,
  type Duration,
  type DurationValue,
  type DynamicValue,
  type HairpinType,
  type KeySignature,
  type Score,
  type TimeSignature,
  type TupletGroup,
  type VoiceEvent
} from '../score-core'
import {
  isDurationValue,
  isKeyMode,
  isPitchStep,
  toArray
} from './shared'

interface XmlNode {
  [key: string]: unknown
}

interface MeasureState {
  clef: Clef
  divisions: number
  keySignature: KeySignature
  timeSignature: TimeSignature
}

const parser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true
})

const defaultMeasureState: MeasureState = {
  clef: {
    sign: 'G',
    line: 2
  },
  divisions: TICKS_PER_QUARTER,
  keySignature: {
    fifths: 0,
    mode: 'major'
  },
  timeSignature: {
    beats: 4,
    beatType: 4
  }
}

export function parseMusicXml(xml: string): Score {
  let document: XmlNode

  try {
    document = parser.parse(xml) as XmlNode
  } catch (error) {
    throw new Error(`MusicXML 문서를 읽을 수 없습니다: ${getErrorMessage(error)}`)
  }

  const root = readNode(document, 'score-partwise')
  const parts = toArray(root.part as XmlNode | XmlNode[] | undefined)

  if (parts.length !== 1) {
    throw new Error('MVP에서는 단일 part MusicXML만 가져올 수 있습니다.')
  }

  const partNode = parts[0]
  const partId = readOptionalString(partNode, '@_id') ?? 'part-1'
  const partList = readOptionalNode(root, 'part-list')
  const scoreParts = toArray(
    partList?.['score-part'] as XmlNode | XmlNode[] | undefined
  )
  const scorePart =
    scoreParts.find((candidate) => candidate['@_id'] === partId) ?? scoreParts[0]
  const partName = scorePart
    ? readOptionalString(scorePart, 'part-name') ?? 'MusicXML Part'
    : 'MusicXML Part'
  const abbreviation = scorePart
    ? readOptionalString(scorePart, 'part-abbreviation')
    : undefined
  const measureNodes = toArray(
    partNode.measure as XmlNode | XmlNode[] | undefined
  )

  if (measureNodes.length === 0) {
    throw new Error('MusicXML에 measure가 없습니다.')
  }

  let state = structuredClone(defaultMeasureState)
  let eventCounter = 0
  const measures = measureNodes.map((measureNode, measureIndex) => {
    const attributes = readOptionalNode(measureNode, 'attributes')

    if (attributes) {
      validateSingleStaff(attributes)
      state = readMeasureState(attributes, state)
    }

    if ('backup' in measureNode || 'forward' in measureNode) {
      throw new Error('MVP에서는 여러 성부 또는 backup/forward를 지원하지 않습니다.')
    }

    const noteNodes = toArray(
      measureNode.note as XmlNode | XmlNode[] | undefined
    )
    let positionTick = 0
    const events = noteNodes.map((noteNode) => {
      eventCounter += 1
      const event = readVoiceEvent(noteNode, eventCounter, positionTick)
      const xmlDurationTicks = readMusicXmlDurationTicks(
        noteNode,
        state.divisions
      )

      if (
        !(event.type === 'rest' && event.fullMeasure) &&
        durationToTicks(event.duration) !== xmlDurationTicks
      ) {
        throw new Error(
          `MusicXML event ${eventCounter}의 type과 duration이 일치하지 않습니다.`
        )
      }

      positionTick += xmlDurationTicks
      return event
    })
    const measureNumber =
      readOptionalInteger(measureNode, '@_number') ?? measureIndex + 1
    const measureId = `measure-${measureNumber}`
    const isPickup = readOptionalString(measureNode, '@_implicit') === 'yes'

    if (isPickup && positionTick === 0) {
      throw new Error('MusicXML 못갖춘마디의 duration은 0보다 커야 합니다.')
    }

    const normalizedEvents =
      events.length > 0
        ? events
        : [
            createFullMeasureRest({
              id: `${measureId}-full-measure-rest`
            })
          ]
    const tuplets = readTupletGroups(
      noteNodes,
      normalizedEvents,
      measureId
    )

    const measure = createMeasure({
      id: measureId,
      number: measureNumber,
      timing: isPickup
        ? {
            type: 'pickup',
            durationTicks: positionTick
          }
        : {
            type: 'regular'
          },
      clef: { ...state.clef },
      keySignature: { ...state.keySignature },
      timeSignature: { ...state.timeSignature },
      voices: [
        createVoice({
          id: 'voice-1',
          events: normalizedEvents,
          tuplets
        })
      ]
    })
    const rhythm = validateMeasureRhythm(measure)
    const tupletErrors = validateVoiceTuplets(measure.voices[0])

    if (!rhythm.isExact) {
      throw new Error(
        `MusicXML measure ${measureNumber}의 리듬 정합성이 올바르지 않습니다: ${rhythm.status}`
      )
    }

    if (tupletErrors.length > 0) {
      throw new Error(
        `MusicXML measure ${measureNumber}의 tuplet 관계가 올바르지 않습니다: ${tupletErrors.join(', ')}`
      )
    }

    return measure
  })

  const title =
    readOptionalString(root, 'work', 'work-title') ??
    readOptionalString(root, 'movement-title') ??
    'Imported score'
  const composer = readComposer(root)
  const tempo = readTempoMarking(measureNodes)
  const rehearsalMarks = readRehearsalMarks(measureNodes)
  const staffTexts = readStaffTexts(measureNodes)
  const dynamics = readDynamics(measureNodes)
  const hairpins = readHairpins(measureNodes, measures)
  const slurs = readSlurs(measureNodes, measures)

  const score = createScore({
    id: 'musicxml-score',
    title,
    composer,
    tempo,
    rehearsalMarks,
    staffTexts,
    dynamics,
    hairpins,
    slurs,
    parts: [
      createPart({
        id: partId,
        name: partName,
        abbreviation,
        staves: [
          createStaff({
            id: `${partId}-staff-1`,
            measures
          })
        ]
      })
    ]
  })
  const tieErrors = validateTieRelations(score)

  if (tieErrors.length > 0) {
    throw new Error(`MusicXML 타이 관계가 올바르지 않습니다: ${tieErrors.join(', ')}`)
  }

  return score
}

function readTempoMarking(measureNodes: XmlNode[]): Score['tempo'] {
  for (const measureNode of measureNodes) {
    const directions = toArray(
      measureNode.direction as XmlNode | XmlNode[] | undefined
    )

    for (const direction of directions) {
      const directionTypes = readDirectionTypes(direction)
      const metronomeDirectionType = directionTypes.find((directionType) =>
        Boolean(readOptionalNode(directionType, 'metronome'))
      )
      const words = metronomeDirectionType
        ? readOptionalString(metronomeDirectionType, 'words')
        : undefined
      const metronome = metronomeDirectionType
        ? readOptionalNode(metronomeDirectionType, 'metronome')
        : undefined
      const sound = readOptionalNode(direction, 'sound')
      const soundTempo = sound
        ? readOptionalNumber(sound, '@_tempo')
        : undefined

      const perMinute = metronome
        ? readOptionalNumber(metronome, 'per-minute')
        : undefined
      const tempoValue = soundTempo ?? perMinute

      if (tempoValue !== undefined) {
        const bpm = normalizeTempo(tempoValue)
        const beatUnit = metronome
          ? readOptionalString(metronome, 'beat-unit')
          : undefined
        return {
          bpm,
          beatUnit: isTempoBeatUnit(beatUnit) ? beatUnit : 'quarter',
          dots: metronome ? toArray(metronome['beat-unit-dot']).length : 0,
          text: words ?? tempoLabel(bpm, beatUnit)
        }
      }
    }
  }

  return undefined
}

function isTempoBeatUnit(value: string | undefined): value is DurationValue {
  return value === 'whole' ||
    value === 'half' ||
    value === 'quarter' ||
    value === 'eighth' ||
    value === '16th' ||
    value === '32nd' ||
    value === '64th'
}

function tempoLabel(bpm: number, beatUnit: string | undefined): string {
  return `${beatUnit === 'eighth' ? '♪' : '♩'} = ${bpm}`
}

function readRehearsalMarks(measureNodes: XmlNode[]): Score['rehearsalMarks'] {
  const marks = measureNodes.flatMap((measureNode, measureIndex) => {
    const measureNumber =
      readOptionalInteger(measureNode, '@_number') ?? measureIndex + 1
    const measureId = `measure-${measureNumber}`
    const directions = toArray(
      measureNode.direction as XmlNode | XmlNode[] | undefined
    )

    return directions.flatMap((direction, directionIndex) => {
      const directionTypes = readDirectionTypes(direction)

      return directionTypes.flatMap((directionType, typeIndex) => {
        const rehearsal = readOptionalString(directionType, 'rehearsal')

        if (!rehearsal) {
          return []
        }

        return [
          {
            id: `${measureId}-rehearsal-${directionIndex + 1}${directionTypeIdSuffix(directionTypes, typeIndex)}`,
            measureId,
            text: rehearsal
          }
        ]
      })
    })
  })

  return marks.length > 0 ? marks : undefined
}

function readStaffTexts(measureNodes: XmlNode[]): Score['staffTexts'] {
  const texts = measureNodes.flatMap((measureNode, measureIndex) => {
    const measureNumber =
      readOptionalInteger(measureNode, '@_number') ?? measureIndex + 1
    const measureId = `measure-${measureNumber}`
    const directions = toArray(
      measureNode.direction as XmlNode | XmlNode[] | undefined
    )

    return directions.flatMap((direction, directionIndex) => {
      const directionTypes = readDirectionTypes(direction)

      return directionTypes.flatMap((directionType, typeIndex) => {
        if (readOptionalNode(directionType, 'metronome')) {
          return []
        }

        const words = readOptionalString(directionType, 'words')

        if (!words) {
          return []
        }

        return [
          {
            id: `${measureId}-staff-text-${directionIndex + 1}${directionTypeIdSuffix(directionTypes, typeIndex)}`,
            measureId,
            text: words
          }
        ]
      })
    })
  })

  return texts.length > 0 ? texts : undefined
}

function readDynamics(measureNodes: XmlNode[]): Score['dynamics'] {
  const allowedDynamics = new Set<DynamicValue>(['p', 'mp', 'mf', 'f'])
  const dynamics = measureNodes.flatMap((measureNode, measureIndex) => {
    const measureNumber =
      readOptionalInteger(measureNode, '@_number') ?? measureIndex + 1
    const measureId = `measure-${measureNumber}`
    const directions = toArray(
      measureNode.direction as XmlNode | XmlNode[] | undefined
    )

    return directions.flatMap((direction, directionIndex) => {
      const directionTypes = readDirectionTypes(direction)

      return directionTypes.flatMap((directionType, typeIndex) => {
        const dynamicNode = readOptionalNode(directionType, 'dynamics')

        if (!dynamicNode) {
          return []
        }

        const value = Object.keys(dynamicNode).find((key): key is DynamicValue =>
          allowedDynamics.has(key as DynamicValue)
        )

        if (!value) {
          return []
        }

        return [
          {
            id: `${measureId}-dynamic-${directionIndex + 1}${directionTypeIdSuffix(directionTypes, typeIndex)}`,
            measureId,
            value
          }
        ]
      })
    })
  })

  return dynamics.length > 0 ? dynamics : undefined
}

function readHairpins(
  measureNodes: XmlNode[],
  measures: Score['parts'][number]['staves'][number]['measures']
): Score['hairpins'] {
  const activeHairpins = new Map<
    string,
    { startEventId: string; type: HairpinType }
  >()
  const hairpins = measureNodes.flatMap((measureNode, measureIndex) => {
    const measure = measures[measureIndex]
    const measureNoteIds =
      measure?.voices[0]?.events
        .filter((event) => event.type === 'note')
        .map((event) => event.id) ?? []
    const directions = toArray(
      measureNode.direction as XmlNode | XmlNode[] | undefined
    )
    const completed: NonNullable<Score['hairpins']> = []

    directions.forEach((direction, directionIndex) => {
      const wedges = readDirectionTypes(direction).flatMap((directionType) =>
        toArray(directionType.wedge as XmlNode | XmlNode[] | undefined)
      )

      wedges.forEach((wedge) => {
        const wedgeType = readOptionalString(wedge, '@_type')
        const number = readOptionalString(wedge, '@_number') ?? '1'

        if (wedgeType === 'crescendo' || wedgeType === 'diminuendo') {
          const startEventId = measureNoteIds[0]

          if (startEventId) {
            activeHairpins.set(number, {
              startEventId,
              type: wedgeType
            })
          }
          return
        }

        if (wedgeType !== 'stop') {
          return
        }

        const activeHairpin = activeHairpins.get(number)
        const endEventId = measureNoteIds.at(-1)

        if (!activeHairpin) {
          throw new Error('MusicXML hairpin stop에 대응하는 시작 표식이 없습니다.')
        }

        if (!endEventId) {
          throw new Error('MusicXML hairpin stop을 연결할 note가 없습니다.')
        }

        completed.push({
          id: `hairpin-${completed.length + 1}-${measureIndex + 1}-${directionIndex + 1}`,
          startEventId: activeHairpin.startEventId,
          endEventId,
          type: activeHairpin.type
        })
        activeHairpins.delete(number)
      })
    })

    return completed
  })

  if (activeHairpins.size > 0) {
    throw new Error('MusicXML hairpin의 종료 표식이 없습니다.')
  }

  return hairpins.length > 0 ? hairpins : undefined
}

function readSlurs(
  measureNodes: XmlNode[],
  measures: Score['parts'][number]['staves'][number]['measures']
): Score['slurs'] {
  const activeSlurs = new Map<string, string>()
  const slurs: NonNullable<Score['slurs']> = []

  measureNodes.forEach((measureNode, measureIndex) => {
    const events = measures[measureIndex]?.voices[0]?.events ?? []
    const noteNodes = toArray(measureNode.note as XmlNode | XmlNode[] | undefined)

    noteNodes.forEach((noteNode, noteIndex) => {
      const event = events[noteIndex]

      if (!event || event.type !== 'note') {
        return
      }

      const notations = readOptionalNode(noteNode, 'notations')
      const slurNodes = toArray(
        notations?.slur as XmlNode | XmlNode[] | undefined
      )

      slurNodes.forEach((slurNode) => {
        const type = readOptionalString(slurNode, '@_type')
        const number = readOptionalString(slurNode, '@_number') ?? '1'

        if (type === 'start') {
          activeSlurs.set(number, event.id)
          return
        }

        if (type !== 'stop') {
          return
        }

        const startEventId = activeSlurs.get(number)

        if (!startEventId) {
          throw new Error('MusicXML slur stop에 대응하는 시작 표식이 없습니다.')
        }

        slurs.push({
          id: `slur-${slurs.length + 1}`,
          startEventId,
          endEventId: event.id,
          number: parseSlurNumber(number)
        })
        activeSlurs.delete(number)
      })
    })
  })

  if (activeSlurs.size > 0) {
    throw new Error('MusicXML slur의 종료 표식이 없습니다.')
  }

  return slurs.length > 0 ? slurs : undefined
}

function readDirectionTypes(direction: XmlNode): XmlNode[] {
  return toArray(direction['direction-type'] as XmlNode | XmlNode[] | undefined)
    .filter(
      (value): value is XmlNode =>
        Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    )
}

function directionTypeIdSuffix(directionTypes: XmlNode[], typeIndex: number): string {
  return directionTypes.length > 1 ? `-${typeIndex + 1}` : ''
}

function parseSlurNumber(value: string): number | undefined {
  const number = Number.parseInt(value, 10)

  return Number.isInteger(number) && number > 0 ? number : undefined
}

function readVoiceEvent(
  node: XmlNode,
  eventIndex: number,
  positionTick: number
): VoiceEvent {
  if ('chord' in node) {
    throw new Error('MVP에서는 chord 음표를 지원하지 않습니다.')
  }

  if ('grace' in node) {
    throw new Error('MVP에서는 grace note를 지원하지 않습니다.')
  }

  const voice = readOptionalString(node, 'voice')

  if (voice && voice !== '1') {
    throw new Error('MVP에서는 voice 1만 지원합니다.')
  }

  const staff = readOptionalInteger(node, 'staff')

  if (staff !== undefined && staff !== 1) {
    throw new Error('MVP에서는 staff 1만 지원합니다.')
  }

  const duration = readDuration(node)
  const id = `event-${eventIndex}`

  if ('rest' in node) {
    const restNode = readOptionalNode(node, 'rest')

    return createRest({
      id,
      position: createTimePosition(positionTick),
      duration,
      fullMeasure: restNode?.['@_measure'] === 'yes',
      fermata: readFermata(node),
      breathMark: readBreathMark(node)
    })
  }

  const pitchNode = readNode(node, 'pitch')
  const step = readString(pitchNode, 'step').toUpperCase()

  if (!isPitchStep(step)) {
    throw new Error(`지원하지 않는 pitch step입니다: ${step}`)
  }

  const alter = readOptionalInteger(pitchNode, 'alter')

  if (
    alter !== undefined &&
    ![-2, -1, 0, 1, 2].includes(alter)
  ) {
    throw new Error(`지원하지 않는 alter 값입니다: ${alter}`)
  }

  return createNote({
    id,
    position: createTimePosition(positionTick),
    pitch: {
      step,
      octave: readInteger(pitchNode, 'octave'),
      alter: alter as -2 | -1 | 0 | 1 | 2 | undefined
    },
    duration,
    ties: readTieFlags(node),
    articulations: readArticulations(node),
    fermata: readFermata(node),
    breathMark: readBreathMark(node)
  })
}

function readBreathMark(node: XmlNode): BreathMark | undefined {
  const articulations = readNotationArticulations(node)

  if (!articulations) {
    return undefined
  }

  if ('caesura' in articulations) {
    return 'caesura'
  }

  return 'breath-mark' in articulations ? 'breath' : undefined
}

function readFermata(node: XmlNode): boolean | undefined {
  const notations = readOptionalNode(node, 'notations')

  return notations && 'fermata' in notations ? true : undefined
}

function readArticulations(node: XmlNode): Articulation[] | undefined {
  const articulations = readNotationArticulations(node)

  if (!articulations) {
    return undefined
  }

  const values = (['staccato', 'accent'] as const).filter(
    (articulation) => articulation in articulations
  )

  return values.length > 0 ? values : undefined
}

function readNotationArticulations(node: XmlNode): XmlNode | undefined {
  const notations = readOptionalNode(node, 'notations')

  return notations ? readOptionalNode(notations, 'articulations') : undefined
}

function readTieFlags(node: XmlNode) {
  const directTypes = toArray(
    node.tie as XmlNode | XmlNode[] | undefined
  ).map((tie) => readOptionalString(tie, '@_type'))
  const notations = readOptionalNode(node, 'notations')
  const notationTypes = toArray(
    notations?.tied as XmlNode | XmlNode[] | undefined
  ).map((tie) => readOptionalString(tie, '@_type'))
  const types = new Set([...directTypes, ...notationTypes])
  const start = types.has('start')
  const stop = types.has('stop')

  return start || stop
    ? {
        start: start || undefined,
        stop: stop || undefined
      }
    : undefined
}

function readDuration(node: XmlNode): Duration {
  const type = readString(node, 'type')

  if (!isDurationValue(type)) {
    throw new Error(`지원하지 않는 note type입니다: ${type}`)
  }

  const timeModification = readOptionalNode(node, 'time-modification')

  return {
    value: type,
    dots: toArray(node.dot as XmlNode | XmlNode[] | undefined).length,
    ...(timeModification
      ? {
          tuplet: {
            actualNotes: readInteger(timeModification, 'actual-notes'),
            normalNotes: readInteger(timeModification, 'normal-notes')
          }
        }
      : {})
  }
}

function readTupletGroups(
  noteNodes: XmlNode[],
  events: VoiceEvent[],
  measureId: string
): TupletGroup[] {
  const groups: TupletGroup[] = []
  let active:
    | {
        id: string
        eventIds: string[]
        actualNotes: number
        normalNotes: number
      }
    | undefined

  noteNodes.forEach((node, index) => {
    const event = events[index]
    const types = readTupletNotationTypes(node)
    const ratio = event?.duration.tuplet

    if (types.has('start')) {
      if (active || !ratio) {
        throw new Error('MusicXML의 중첩 또는 비율 없는 tuplet은 지원하지 않습니다.')
      }

      active = {
        id: `${measureId}-tuplet-${groups.length + 1}`,
        eventIds: [],
        actualNotes: ratio.actualNotes,
        normalNotes: ratio.normalNotes
      }
    }

    if (ratio) {
      if (
        !active ||
        active.actualNotes !== ratio.actualNotes ||
        active.normalNotes !== ratio.normalNotes
      ) {
        throw new Error('MusicXML tuplet 그룹의 비율 또는 범위가 올바르지 않습니다.')
      }

      active.eventIds.push(event.id)
    } else if (active) {
      throw new Error('MusicXML tuplet 그룹에 time-modification이 없습니다.')
    }

    if (types.has('stop')) {
      if (!active || active.eventIds.length !== active.actualNotes) {
        throw new Error('MusicXML tuplet 그룹이 완전하지 않습니다.')
      }

      groups.push(active)
      active = undefined
    }
  })

  if (active) {
    throw new Error('MusicXML tuplet 그룹의 종료 표식이 없습니다.')
  }

  return groups
}

function readTupletNotationTypes(node: XmlNode): Set<string | undefined> {
  const notations = readOptionalNode(node, 'notations')

  return new Set(
    toArray(notations?.tuplet as XmlNode | XmlNode[] | undefined).map(
      (tuplet) => readOptionalString(tuplet, '@_type')
    )
  )
}

function readMeasureState(
  attributes: XmlNode,
  previous: MeasureState
): MeasureState {
  const clefNode = readOptionalNode(attributes, 'clef')
  const keyNode = readOptionalNode(attributes, 'key')
  const timeNode = readOptionalNode(attributes, 'time')

  return {
    clef: clefNode ? readClef(clefNode) : previous.clef,
    divisions: readDivisions(attributes, previous.divisions),
    keySignature: keyNode ? readKeySignature(keyNode) : previous.keySignature,
    timeSignature: timeNode ? readTimeSignature(timeNode) : previous.timeSignature
  }
}

function readDivisions(attributes: XmlNode, previous: number): number {
  const value = readOptionalInteger(attributes, 'divisions') ?? previous

  if (value <= 0) {
    throw new Error(`MusicXML divisions는 0보다 커야 합니다: ${value}`)
  }

  return value
}

function readMusicXmlDurationTicks(node: XmlNode, divisions: number): number {
  const xmlDuration = readInteger(node, 'duration')
  const ticks = (xmlDuration * TICKS_PER_QUARTER) / divisions

  if (!Number.isSafeInteger(ticks) || ticks <= 0) {
    throw new Error(
      `MusicXML duration을 정수 tick으로 변환할 수 없습니다: ${xmlDuration}/${divisions}`
    )
  }

  return ticks
}

function readClef(node: XmlNode): Clef {
  const sign = readString(node, 'sign')

  if (!['G', 'F', 'C', 'percussion'].includes(sign)) {
    throw new Error(`지원하지 않는 clef sign입니다: ${sign}`)
  }

  if (sign !== 'G') {
    throw new Error('MVP 가져오기는 높은음자리표(G clef)만 지원합니다.')
  }

  return {
    sign,
    line: readInteger(node, 'line'),
    octaveChange: readOptionalInteger(node, 'clef-octave-change')
  } as Clef
}

function readKeySignature(node: XmlNode): KeySignature {
  const mode = readOptionalString(node, 'mode')

  if (mode && !isKeyMode(mode)) {
    throw new Error(`지원하지 않는 key mode입니다: ${mode}`)
  }

  return {
    fifths: readInteger(node, 'fifths'),
    mode: mode && isKeyMode(mode) ? mode : undefined
  }
}

function readTimeSignature(node: XmlNode): TimeSignature {
  return {
    beats: readInteger(node, 'beats'),
    beatType: readInteger(node, 'beat-type')
  }
}

function validateSingleStaff(attributes: XmlNode): void {
  const staves = readOptionalInteger(attributes, 'staves')

  if (staves !== undefined && staves !== 1) {
    throw new Error('MVP에서는 단일 staff MusicXML만 가져올 수 있습니다.')
  }
}

function readComposer(root: XmlNode): string | undefined {
  const identification = readOptionalNode(root, 'identification')
  const creators = toArray(
    identification?.creator as XmlNode | XmlNode[] | undefined
  )
  const composer = creators.find(
    (creator) => creator['@_type'] === 'composer'
  )

  return composer ? readText(composer) : undefined
}

function readNode(node: XmlNode, key: string): XmlNode {
  const value = node[key]

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`MusicXML 필수 요소가 없습니다: ${key}`)
  }

  return value as XmlNode
}

function readOptionalNode(node: XmlNode, key: string): XmlNode | undefined {
  const value = node[key]

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  return value as XmlNode
}

function readString(node: XmlNode, key: string): string {
  const value = readOptionalString(node, key)

  if (value === undefined || value.length === 0) {
    throw new Error(`MusicXML 필수 값이 없습니다: ${key}`)
  }

  return value
}

function readOptionalString(
  node: XmlNode,
  ...path: string[]
): string | undefined {
  let value: unknown = node

  for (const key of path) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined
    }

    value = (value as XmlNode)[key]
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim()
  }

  if (value && typeof value === 'object' && '#text' in value) {
    return String((value as XmlNode)['#text']).trim()
  }

  return undefined
}

function readInteger(node: XmlNode, key: string): number {
  const value = readOptionalInteger(node, key)

  if (value === undefined) {
    throw new Error(`MusicXML 정수 값이 없습니다: ${key}`)
  }

  return value
}

function readOptionalInteger(node: XmlNode, key: string): number | undefined {
  const value = readOptionalString(node, key)

  if (value === undefined) {
    return undefined
  }

  if (!/^-?\d+$/.test(value)) {
    throw new Error(`MusicXML 정수 값이 올바르지 않습니다: ${key}`)
  }

  const number = Number(value)

  if (!Number.isSafeInteger(number)) {
    throw new Error(`MusicXML 정수 값이 올바르지 않습니다: ${key}`)
  }

  return number
}

function readOptionalNumber(node: XmlNode, key: string): number | undefined {
  const value = readOptionalString(node, key)

  if (value === undefined) {
    return undefined
  }

  const number = Number.parseFloat(value)

  if (!Number.isFinite(number)) {
    throw new Error(`MusicXML 숫자 값이 올바르지 않습니다: ${key}`)
  }

  return number
}

function normalizeTempo(value: number): number {
  return Math.min(240, Math.max(40, Math.round(value)))
}

function readText(node: XmlNode): string | undefined {
  return readOptionalString(node, '#text')
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
