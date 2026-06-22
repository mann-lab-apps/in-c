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
  type Clef,
  type Duration,
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

  const score = createScore({
    id: 'musicxml-score',
    title,
    composer,
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

  const duration = readDuration(node)
  const id = `event-${eventIndex}`

  if ('rest' in node) {
    const restNode = readOptionalNode(node, 'rest')

    return createRest({
      id,
      position: createTimePosition(positionTick),
      duration,
      fullMeasure: restNode?.['@_measure'] === 'yes'
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
    ties: readTieFlags(node)
  })
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

  const number = Number.parseInt(value, 10)

  if (!Number.isFinite(number)) {
    throw new Error(`MusicXML 정수 값이 올바르지 않습니다: ${key}`)
  }

  return number
}

function readText(node: XmlNode): string | undefined {
  return readOptionalString(node, '#text')
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
