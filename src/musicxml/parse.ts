import { hairpinEndTick } from '../score-core/span-references'
import { readHairpinEndMarker } from './hairpin-end-marker'
import { resolveHarmonyDisplayText, musicXmlHarmonyKinds } from './harmony-text'
import { createMusicXmlParser } from './xml-parser'
import { assertMusicXmlInputCharacters } from './xml-input-characters'
import { collectUnresolvedXmlReferences } from './xml-unresolved-references'
import { readMusicXmlPageDefaults } from './page-layout'
import { secondVoltaRepeatCounts } from './barline-scope'

import {
  TICKS_PER_QUARTER,
  inspectAlternativeEndingRepeats,
  createFullMeasureRest,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createScoreRepeatPlaybackPlan,
  createStaff,
  createTimePosition,
  createVoice,
  globalSwingPlaybackUnavailableReason,
  convertOctaveShiftPitches,
  durationToTicks,
  keySignatureAlter,
  measureDurationTicks,
  timeSignatureDurationTicks,
  voiceEventDurationTicks,
  sortVoiceEvents,
  sameVoltaPasses,
  scoreRepeatSource,
  validateTieRelations,
  validateMeasureRhythm,
  validateVoiceTuplets,
  type Articulation,
  type BreathMark,
  type Clef,
  type Duration,
  type DurationValue,
  type DynamicValue,
  type GraceNote,
  type HairpinType,
  type KeySignature,
  type Measure,
  type NavigationMark,
  type Note,
  type Pitch,
  type Score,
  type TimeSignature,
  type TremoloMark,
  type TupletGroup,
  type VoltaMark,
  type VoiceEvent
} from '../score-core'
import {
  isDurationValue,
  isKeyMode,
  isPitchStep,
  supportedDurationValues,
  toArray
} from './shared'

interface XmlNode {
  [key: string]: unknown
}

interface MeasureState {
  clef: Clef
  keySignature: KeySignature
  timeSignature: TimeSignature
}

interface PartMeasureState {
  clefs: Map<number, Clef>
  transpositions: Map<number, NonNullable<Measure['transposition']>>
  keySignatures: Map<number, KeySignature>
  timeSignatures: Map<number, TimeSignature>
  keySignature: KeySignature
  staffCount: number
  timeSignature: TimeSignature
}

export interface MusicXmlImportWarning {
  code: 'unsupported-direction' | 'unsupported-notation' | 'unsupported-layout'
  message: string
  measureNumber?: number
  /** Owning source part, including diagnostics outside its measures. */
  partNumber?: number
  eventIndex?: number
  path: string
}

export interface MusicXmlImportReport {
  warnings: MusicXmlImportWarning[]
}

const parser = createMusicXmlParser({
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true
})

const orderedParser = createMusicXmlParser({ ignoreAttributes: false, parseTagValue: false, trimValues: false, preserveOrder: true })
const sourceOrderedText = new WeakMap<XmlNode, XmlNode[]>()
const sourceLyricText = new WeakMap<XmlNode, string>()
const sourceLyricElisions = new WeakMap<XmlNode, { text: string; smufl?: string }[]>()
const sourceNotationFacts = new WeakMap<XmlNode, Partial<Record<'footnote' | 'level' | 'fermata' | 'segno' | 'coda', (XmlNode | string)[]>>>()
const sourceBarlineAttributes = new WeakMap<XmlNode, XmlNode>()
const sourceMidiFacts = new WeakMap<XmlNode, Partial<Record<'midi-name' | 'midi-device', (XmlNode | string)[]>>>()
const directionTicks = new WeakMap<XmlNode, number>()
const soundTicks = new WeakMap<XmlNode, number>()
const unrepresentedHairpinStops = new WeakMap<XmlNode, {
  staff: number; voice: string; sourceTick: number; retainedTick: number
}>()
const importedNavigationSounds = new WeakSet<XmlNode>()
const importedClosingTranspositions = new WeakSet<XmlNode>()
const relocatedLeadingRestTranspositions = new WeakSet<XmlNode>()
const importedClosingKeys = new WeakSet<XmlNode>()
const importedClosingMeters = new WeakSet<XmlNode>()
const unsupportedKeyFifths = new WeakMap<KeySignature, string>()
interface NavigationAppearance {
  node: XmlNode
  fields: readonly string[]
  appearanceChanged: boolean
}
const importedNavigationAppearance = new WeakMap<XmlNode, NavigationAppearance>()
const navigationSoundAttributes = ['dacapo', 'dalsegno', 'segno', 'coda', 'tocoda', 'fine', 'forward-repeat'] as const
const sourceNoteDurationTicks = new WeakMap<XmlNode, number>()
const sourceChordMemberDurations = new WeakMap<XmlNode, {
  duration: string
  divisions: string
  sourceTicks: number | null
  appliedTicks?: number
}>()
const sourcePitchedNoteTicks = new WeakMap<XmlNode, number>()
const sourceForwardPickupTicks = new WeakMap<XmlNode, number>()
const measureChildOrder = new WeakMap<XmlNode, number>()
const sourceMeasureNumbers = new WeakMap<XmlNode, number>()
const sourceStaffVoiceNumbers = new WeakMap<XmlNode, ReadonlyMap<string, number>>()
type SourceMeasureIdentity = { sourceMeasure: number; originalNumber: string | null; internalNumber: number }
const normalizedPartMeasureNumbers = new WeakMap<XmlNode, SourceMeasureIdentity[]>()

function indexSourceMeasureNumbers(parts: XmlNode[]): void {
  for (const part of parts) {
    const measures = toArray(part.measure as XmlNode | XmlNode[] | undefined)
    const labels = measures.map(node => readOptionalString(node, '@_number'))
    const candidates = labels.map((label, index) => label === undefined ? index + 1
      : /^-?\d+$/.test(label) ? Number(label) : undefined)
    const keep = candidates.every(number => number !== undefined && Number.isSafeInteger(number) && number > 0)
      && new Set(candidates).size === candidates.length
    const mapping = measures.map((node, index) => {
      const internalNumber = keep ? candidates[index]! : index + 1
      sourceMeasureNumbers.set(node, internalNumber)
      return { sourceMeasure: index + 1, originalNumber: labels[index] ?? null, internalNumber }
    })
    if (!keep) normalizedPartMeasureNumbers.set(part, mapping)
  }
}

function readSourceMeasureNumber(node: XmlNode, index: number): number {
  return sourceMeasureNumbers.get(node) ?? readOptionalInteger(node, '@_number') ?? index + 1
}

const defaultMeasureState: MeasureState = {
  clef: {
    sign: 'G',
    line: 2
  },
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
  return parseMusicXmlDocument(parseMusicXmlString(xml))
}

export function parseMusicXmlWithReport(xml: string): {
  score: Score
  report: MusicXmlImportReport
} {
  const document = parseMusicXmlString(xml)
  const root = readNode(document, 'score-partwise')
  const score = parseMusicXmlDocument(document)

  return {
    score,
    report: {
      warnings: [...collectUnsupportedMusicXmlWarnings(root, score),
        ...collectUnresolvedXmlReferences(xml, sourceOrderedText.get(document) ?? [], score)]
    }
  }
}

function parseMusicXmlString(xml: string): XmlNode {
  let document: XmlNode

  try {
    // Whole-score input must be a document, unlike the fragment parser used by
    // other adapters. Validate nesting/attributes before reading musical data.
    const ordered = orderedParser.parse(xml, true) as XmlNode[]
    const declarationAttributes = ordered.find(node => '?xml' in node)?.[':@'] as XmlNode | undefined
    const xmlVersion = declarationAttributes?.['@_version']
    // Do not silently define a new XML 1.1 import policy in this XML 1.0 guard.
    if (xmlVersion === undefined || xmlVersion === '1.0') assertMusicXmlInputCharacters(xml)
    // The installed validator misses a self-closing second root. Count actual
    // parsed elements (not declarations/PI), and reject text outside the root.
    const roots = ordered.flatMap(node => Object.keys(node)
      .filter(name => name !== ':@' && name !== '#text' && !name.startsWith('?')))
    const outsideText = ordered.some(node =>
      node['#text'] !== undefined && String(node['#text']).trim().length > 0)
    if (roots.length !== 1 || outsideText) {
      throw new Error('XML 문서에는 하나의 최상위 요소만 있어야 하며 바깥에 글자를 둘 수 없습니다.')
    }
    document = parser.parse(xml) as XmlNode
    if (xml.includes('<!DOCTYPE')) sourceOrderedText.set(document, ordered)
    indexMetadataText(document, ordered)
    indexDirectionTicks(document, ordered)
  } catch (error) {
    throw new Error(`MusicXML 문서를 읽을 수 없습니다: ${getErrorMessage(error)}`)
  }

  return document
}

// The ordinary parser trims individual text pieces before joining CDATA/PI.
// Reuse the existing untrimmed ordered tree for scalar header text, trimming
// only the outside once. Do not reinterpret nested rich content or attributes.
function indexMetadataText(document: XmlNode, ordered: XmlNode[]): void {
  const root = readOptionalNode(document, 'score-partwise')
  const children = ordered.find(node => 'score-partwise' in node)?.['score-partwise'] as XmlNode[] | undefined
  if (!root || !children) return
  const align = (parent: XmlNode, key: string, content: XmlNode[] | undefined) => {
    const current = parent[key]
    if (current === undefined || Array.isArray(current) || !content ||
      content.some(node => Object.keys(node).some(name => name !== '#text' && name !== ':@' && !name.startsWith('?')))) return
    const text = content.map(node => typeof node['#text'] === 'string' || typeof node['#text'] === 'number'
      ? String(node['#text']) : '').join('').trim()
    if (typeof current === 'string' || typeof current === 'number') parent[key] = text
    else if (current && typeof current === 'object' && '#text' in current) current['#text'] = text
  }
  const work = readOptionalNode(root, 'work')
  const orderedWork = children.find(node => 'work' in node)?.work as XmlNode[] | undefined
  if (work) align(work, 'work-title', orderedWork?.find(node => 'work-title' in node)?.['work-title'] as XmlNode[] | undefined)
  align(root, 'movement-title', children.find(node => 'movement-title' in node)?.['movement-title'] as XmlNode[] | undefined)
  const identification = readOptionalNode(root, 'identification')
  const creators = toArray(identification?.creator as XmlNode | XmlNode[] | undefined)
  const orderedIdentification = children.find(node => 'identification' in node)?.identification as XmlNode[] | undefined
  orderedIdentification?.filter(node => 'creator' in node).forEach((node, index) => {
    const creator = creators[index]
    if (creator && typeof creator === 'object') align(creator, '#text', node.creator as XmlNode[])
  })
  const partList = readOptionalNode(root, 'part-list')
  const scoreParts = toArray(partList?.['score-part'] as XmlNode | XmlNode[] | undefined)
  const orderedPartList = children.find(node => 'part-list' in node)?.['part-list'] as XmlNode[] | undefined
  orderedPartList?.filter(node => 'score-part' in node).forEach((node, index) => {
    const scorePart = scoreParts[index]
    if (!scorePart || typeof scorePart !== 'object') return
    const content = node['score-part'] as XmlNode[]
    indexSourceMidiFacts(scorePart, content)
    for (const key of ['part-name', 'part-abbreviation']) {
      align(scorePart, key, content.find(child => key in child)?.[key] as XmlNode[] | undefined)
    }
  })
}

// The ordinary object tree groups siblings by name; keep musical cursor timing
// from the ordered tree so backup/forward and relative offsets are not lost.
function indexDirectionTicks(document: XmlNode, ordered: XmlNode[]): void {
  const orderedRoot = ordered.find(node => 'score-partwise' in node)?.['score-partwise'] as XmlNode[] | undefined
  if (!orderedRoot) return
  const parts = toArray(readNode(document, 'score-partwise').part as XmlNode | XmlNode[] | undefined)
  orderedRoot.filter(node => 'part' in node).forEach((orderedPart, partIndex) => {
    const measures = toArray(parts[partIndex]?.measure as XmlNode | XmlNode[] | undefined)
    let divisions: XmlDecimal = { text: String(TICKS_PER_QUARTER), units: BigInt(TICKS_PER_QUARTER), scale: 1n }
    ;(orderedPart.part as XmlNode[]).filter(node => 'measure' in node).forEach((orderedMeasure, measureIndex) => {
      const measure = measures[measureIndex]
      if (!measure) return
      const hasPickupForward = 'forward' in measure && readOptionalString(measure, '@_implicit') === 'yes'
      let cursor = 0
      let furthestTick = 0
      const indices = new Map<string, number>()
      for (const [order, child] of (orderedMeasure.measure as XmlNode[]).entries()) {
        const key = Object.keys(child).find(name => name !== ':@')
        if (!key) continue
        const index = indices.get(key) ?? 0
        indices.set(key, index + 1)
        const node = toArray(measure[key] as XmlNode | XmlNode[] | undefined)[index]
        if (!node || typeof node !== 'object') continue
        if (key === 'note') {
          indexSourceLyricText(node, child.note as XmlNode[])
          indexSourceNotationFacts(node, child.note as XmlNode[])
          if ('pitch' in node && !('chord' in node)) sourcePitchedNoteTicks.set(node, cursor)
          if ('chord' in node && !('grace' in node)) {
            const duration = readOptionalString(node, 'duration')
            const value = duration === undefined ? undefined : readXmlDecimal(duration)
            if (value && value.units > 0n) {
              sourceChordMemberDurations.set(node, {
                duration: value.text, divisions: divisions.text,
                sourceTicks: exactMusicXmlTicks(value, divisions) ?? null
              })
            }
          }
        }
        if (key === 'barline') {
          sourceNotationFacts.set(node, {
            footnote: readOrderedScalarFacts(child.barline as XmlNode[], 'footnote'),
            level: readOrderedScalarFacts(child.barline as XmlNode[], 'level'),
            fermata: readOrderedScalarFacts(child.barline as XmlNode[], 'fermata'),
            segno: readOrderedScalarFacts(child.barline as XmlNode[], 'segno'),
            coda: readOrderedScalarFacts(child.barline as XmlNode[], 'coda')
          })
          sourceBarlineAttributes.set(node, (child[':@'] ?? {}) as XmlNode)
        }
        if (key === 'direction' || key === 'sound') measureChildOrder.set(node, order)
        if (key === 'attributes') { directionTicks.set(node, cursor); divisions = readDivisions(node, divisions) }
        if (key === 'direction' || key === 'harmony') {
          const offset = readOptionalString(node, 'offset')
          const tick = readMusicXmlOffsetTick(cursor, offset, divisions, `MusicXML ${key} offset을 유효한 tick으로 변환할 수 없습니다.`)
          directionTicks.set(node, tick)
          const sound = readOptionalNode(node, 'sound')
          if (sound) {
            indexSourceMidiFacts(sound, ((child[key] as XmlNode[]).find(value => 'sound' in value)?.sound ?? []) as XmlNode[])
            const soundOffset = readOptionalString(sound, 'offset') ??
              (readOptionalString(readOptionalNode(node, 'offset') ?? {}, '@_sound') === 'yes' ? offset : undefined)
            const soundTick = readMusicXmlOffsetTick(cursor, soundOffset, divisions, 'MusicXML pedal sound offset이 유효하지 않습니다.')
            soundTicks.set(sound, soundTick)
          }
        }
        if (key === 'sound') {
          indexSourceMidiFacts(node, child.sound as XmlNode[])
          const tick = readMusicXmlOffsetTick(cursor, readOptionalString(node, 'offset'), divisions, 'MusicXML sound offset이 유효하지 않습니다.')
          soundTicks.set(node, tick)
        }
        if (key === 'backup' || key === 'forward') {
          cursor += readMusicXmlDurationTicks(node, divisions) * (key === 'backup' ? -1 : 1)
        } else if (key === 'note' && !('chord' in node) && !('grace' in node)) {
          const ticks = readMusicXmlDurationTicks(node, divisions)
          sourceNoteDurationTicks.set(node, ticks)
          cursor += ticks
        }
        if (hasPickupForward) furthestTick = Math.max(furthestTick, cursor)
      }
      if (hasPickupForward) sourceForwardPickupTicks.set(measure, furthestTick)
    })
  })
}

// The regular tree trims each text fragment. Retain its original boundaries
// only for a plain syllable: no elision symbol is synthesized or reinterpreted.
function indexSourceLyricText(note: XmlNode, orderedNote: XmlNode[]): void {
  const lyrics = toArray(note.lyric as XmlNode | XmlNode[] | undefined)
  orderedNote.filter(child => 'lyric' in child).forEach((orderedLyric, index) => {
    const lyric = lyrics[index]
    const content = orderedLyric.lyric as XmlNode[]
    if (!lyric) return
    const elisions = content.filter(child => 'elision' in child).map(child => ({
      text: (child.elision as XmlNode[]).flatMap(part => {
        const text = part['#text']
        return typeof text === 'string' || typeof text === 'number' ? [String(text)] : []
      }).join(''),
      smufl: readOptionalString((child[':@'] ?? {}) as XmlNode, '@_smufl')
    }))
    // Diagnostic-only ordered values retain even a no-break-space symbol. The
    // existing plain-lyric fallback and its score representation stay intact.
    if (elisions.length > 0) { sourceLyricElisions.set(lyric, elisions); return }
    const fragments = content.filter(child => 'text' in child).flatMap(child =>
      (child.text as XmlNode[]).flatMap(part => {
        const text = part['#text']
        return typeof text === 'string' || typeof text === 'number' ? [String(text)] : []
      }))
    if (fragments.length > 0) sourceLyricText.set(lyric, fragments.join('').trim())
  })
}

// Diagnostic-only values use the existing ordered tree so xml:space, a literal
// zero and original attributes are not changed by the model parser's trimming.
function indexSourceNotationFacts(note: XmlNode, orderedNote: XmlNode[]): void {
  const containers = toArray(note.notations as XmlNode | XmlNode[] | undefined)
  orderedNote.filter(child => 'notations' in child).forEach((child, index) => {
    const container = containers[index]
    if (!container || typeof container !== 'object') return
    const values: Partial<Record<'footnote' | 'level' | 'fermata', (XmlNode | string)[]>> = {}
    for (const kind of ['footnote', 'level', 'fermata'] as const) {
      values[kind] = readOrderedScalarFacts(child.notations as XmlNode[], kind)
    }
    sourceNotationFacts.set(container, values)
  })
}

function readOrderedScalarFacts(children: XmlNode[], kind: string): (XmlNode | string)[] {
  return children.filter(node => kind in node).map(node => {
    const text = (node[kind] as XmlNode[]).map(fragment => fragment['#text'] ?? '').join('')
    const attributes = (node[':@'] ?? {}) as XmlNode
    return Object.keys(attributes).length ? { ...(text ? { '#text': text } : {}), ...attributes } : text
  })
}

// MIDI source strings may contain significant outside whitespace, split text
// and an empty device name with a port/id. Keep diagnostic-only facts from the
// already parsed ordered tree; never alter score strings or playback routing.
function indexSourceMidiFacts(parent: XmlNode, children: XmlNode[]): void {
  const devices = readOrderedScalarFacts(children, 'midi-device')
  if (devices.length) sourceMidiFacts.set(parent, { 'midi-device': devices })
  const instruments = toArray(parent['midi-instrument'] as XmlNode | XmlNode[] | undefined)
  children.filter(child => 'midi-instrument' in child).forEach((child, index) => {
    const instrument = instruments[index]
    if (!instrument || typeof instrument !== 'object') return
    const names = readOrderedScalarFacts(child['midi-instrument'] as XmlNode[], 'midi-name')
    if (names.length) sourceMidiFacts.set(instrument, { 'midi-name': names })
  })
}

function midiFactText(value: XmlNode | string): string {
  return typeof value === 'string' ? value : value['#text'] === undefined ? '' : String(value['#text'])
}

type HairpinEndSource = {
  partNumber: number
  partId: string
  measureIndex: number
  measureLabel?: string
  sourceVoice?: string
}

export class MusicXmlHairpinEndAnchorError extends Error {
  constructor(source: HairpinEndSource, staff: number, voiceId: string | undefined, tick: number) {
    const voice = source.sourceVoice ?? voiceId?.replace(/^voice-/, '') ?? '지정 없음'
    const measure = `파일의 ${source.measureIndex + 1}번째 마디${source.measureLabel ? ` (번호 ${source.measureLabel})` : ''}`
    super(`헤어핀 끝에 연결할 음표나 쉼표가 없습니다. 파트 ${source.partNumber} (${source.partId}) · 보표 ${staff} · 성부 ${voice} · ${measure} · ${tick} tick (마디 시작 기준 ${tick / TICKS_PER_QUARTER}박, 4분음표 단위)`)
    this.name = 'MusicXmlHairpinEndAnchorError'
  }
}

function directionVoiceId(direction: XmlNode, preferredVoice?: string) {
  const staff = readOptionalInteger(direction, 'staff') ?? 1
  return readOptionalString(direction, 'voice') === undefined ? preferredVoice : readVoiceId(direction, staff)
}

function findDirectionAnchor(direction: XmlNode, measure: Measure | undefined, stop: boolean, preferredVoice?: string,
  allowRest = false, endMarker?: 'onset' | 'release') {
  const voiceId = directionVoiceId(direction, preferredVoice)
  const voices = (measure?.voices ?? []).filter(voice => !voiceId || voice.id === voiceId)
  const tick = directionTicks.get(direction) ?? 0
  const candidates = voices.flatMap(voice => voice.events.filter(event => allowRest || event.type === 'note')
    .map(event => ({ event, voiceId: voice.id })))
  const onset = candidates.find(({ event }) => event.position.tick === tick)
  const marked = endMarker === 'onset' ? onset : endMarker === 'release' && measure
    ? candidates.find(({ event }) => event.position.tick + voiceEventDurationTicks(event, measure) === tick) : undefined
  const anchor = marked ?? onset ??
    (stop ? candidates.find(({ event }) => event.position.tick + durationToTicks(event.duration) === tick) : undefined)
  return anchor && { ...anchor, endAnchor: marked ? endMarker : undefined }
}

function directionAnchor(direction: XmlNode, measure: Measure | undefined, allowRest = false) {
  const anchor = findDirectionAnchor(direction, measure, false, undefined, allowRest)
  if (!anchor) throw new Error(`MusicXML span의 tick ${directionTicks.get(direction) ?? 0}에 연결할 note가 없습니다 (${directionVoiceId(direction) ?? 'staff'}).`)
  return anchor
}

function parseMusicXmlDocument(document: XmlNode): Score {
  const root = readNode(document, 'score-partwise')
  const parts = toArray(root.part as XmlNode | XmlNode[] | undefined)
  indexSourceMeasureNumbers(parts)
  const partList = readOptionalNode(root, 'part-list')
  const scoreParts = toArray(
    partList?.['score-part'] as XmlNode | XmlNode[] | undefined
  )
  const parsedParts = parts.map((partNode, partIndex) =>
    parseMusicXmlPart(partNode, scoreParts, {
      partIndex,
      preserveLegacyIds: parts.length === 1
    })
  )
  const primaryMeasureNodes = toArray(
    parts[0]?.measure as XmlNode | XmlNode[] | undefined
  )

  const title =
    readOptionalString(root, 'work', 'work-title') ??
    readOptionalString(root, 'movement-title') ??
    'Imported score'
  const composer = readComposer(root)
  const directTempo = readPrimaryDirectTempoState(primaryMeasureNodes, parsedParts[0]?.staves[0]?.measures ?? [])
  const tempo = directTempo ? directTempo.tempo : readTempoMarking(primaryMeasureNodes)
  const tempoEvents = directTempo ? directTempo.tempoEvents : readTempoEvents(primaryMeasureNodes)
  const swing = readGlobalSwingPlayback(parts)
  const rhythmFeel = readRhythmFeelMarking(primaryMeasureNodes, swing.hasFormal)
  const rehearsalMarks = readRehearsalMarks(primaryMeasureNodes)
  for (const part of parsedParts) for (const staff of part.staves) {
    const exactSecondMarkers = new Set<Measure>()
    for (const group of inspectAlternativeEndingRepeats(staff.measures).groups.values()) {
      group.legacySecondMarkers.forEach(measure => exactSecondMarkers.add(measure))
    }
    for (const [measure, count] of secondVoltaRepeatCounts(staff.measures)) {
      if (count > 2 && measure.volta?.number === 2) exactSecondMarkers.add(measure)
    }
    for (const measure of exactSecondMarkers) {
      const { start, end } = measure.volta!
      measure.volta = { start, end, passes: [2] }
    }
  }
  importPlaybackNavigation(parts, parsedParts)
  const systemTexts = readSystemTexts(primaryMeasureNodes)
  const markings = readPartStaffMarkings(parts, parsedParts)
  const physicalPageSetup = readMusicXmlPageDefaults(root).pageSetup
  const layoutBreaks = readLayoutBreaks(primaryMeasureNodes, parsedParts[0]?.staves[0]?.measures ?? [])

  const score = convertOctaveShiftPitches(createScore({
    id: 'musicxml-score',
    title,
    composer,
    tempo,
    tempoEvents,
    pedalEvents: readPedalEvents(parts, parsedParts),
    rhythmFeel,
    swingPlayback: swing.value,
    ...markings,
    rehearsalMarks,
    systemTexts,
    layout: physicalPageSetup ? { ...layoutBreaks, pageSetup:physicalPageSetup } : layoutBreaks,
    parts: parsedParts
  }), 'display')
  const tieErrors = validateTieRelations(score)

  if (tieErrors.length > 0) {
    const unattached = parts.flatMap((part, partIndex) =>
      toArray(part.measure as XmlNode | XmlNode[] | undefined).flatMap((measure, measureIndex) =>
        toArray(measure.note as XmlNode | XmlNode[] | undefined).flatMap((note, noteIndex) => {
          // A normal middle chain uses stop then start. The standard's reverse
          // order, with no sound ties, describes a visual one-note tie instead.
          const notationTypes = readNotationTieNodes(note)
            .map(tied => readOptionalString(tied, '@_type'))
          return toArray(note.tie as XmlNode | XmlNode[] | undefined).length === 0 &&
            notationTypes.length === 2 && notationTypes[0] === 'start' && notationTypes[1] === 'stop'
            ? [`part[${partIndex + 1}].measure[${measureIndex + 1}].note[${noteIndex + 1}]`] : []
        })))
    if (unattached.length > 0) {
      throw new Error(`한 음표에만 연결된 타이 표기는 현재 가져오기에서 지원하지 않습니다. 원본 MusicXML을 보관하고 다른 표기 방식의 사본을 사용해 주세요. ${unattached.join(', ')}; ${tieErrors.join(', ')}`)
    }
    throw new Error(`MusicXML 타이 관계가 올바르지 않습니다: ${tieErrors.join(', ')}`)
  }

  return score
}

function importPlaybackNavigation(parts: XmlNode[], parsedParts: Score['parts']): void {
  const pending: { measure: Measure; sound: XmlNode; mark: NavigationMark; appearance?: NavigationAppearance }[] = []
  const counts = new Map<Measure, number>()
  for (const [partIndex, part] of parts.entries()) {
    const measures = parsedParts[partIndex].staves[0].measures
    for (const [index, node] of toArray(part.measure as XmlNode | XmlNode[] | undefined).entries()) {
      const measure = measures[index]
      const sounds: { sound: XmlNode; direction?: XmlNode }[] = [
        ...toArray(node.sound as XmlNode | XmlNode[] | undefined).map(sound => ({ sound })),
        ...toArray(node.direction as XmlNode | XmlNode[] | undefined).flatMap(direction => {
          const sound = readOptionalNode(direction, 'sound')
          return sound ? [{ sound, direction }] : []
        })
      ]
      for (const { sound, direction } of sounds) {
        for (const type of navigationSoundAttributes) {
          const value = readOptionalString(sound, `@_${type}`)
          if (!value || ((type === 'dacapo' || type === 'forward-repeat') && value === 'no')) continue
          if (type === 'forward-repeat') return
          const text = readOptionalString(sound, '@_time-only')
          if (text !== undefined && !/^[1-9]\d*(?:, *[1-9]\d*)*$/.test(text)) return
          const passes = text === undefined ? undefined : text.split(',').map(Number)
          if (passes && (passes.length > 100 || !passes.every(Number.isSafeInteger))) return
          const marker = type === 'segno' || type === 'coda'
          const tick = marker ? 0 : measureDurationTicks(measure)
          if (soundTicks.get(sound) !== tick) return
          if ((marker && passes) || ((type === 'fine' || type === 'dacapo') && value !== 'yes')) return
          const visualDirection = direction && directionTicks.get(direction) === tick ? direction : undefined
          const graphic = marker && visualDirection ? readNavigationSymbolDirection(visualDirection, type) : undefined
          const words = !marker && visualDirection ? readNavigationEndDirection(visualDirection, type) : undefined
          const actionFields = { ...(passes ? { passes } : {}), ...(words ? { display: words.display } : {}) }
          const mark: NavigationMark =
            type === 'dacapo' || type === 'fine' ? { type, ...actionFields } :
            type === 'dalsegno' || type === 'tocoda' ? { type, label: value, ...actionFields } :
            { type, label: value, ...(graphic ? { symbol: true } : {}) }
          if ('label' in mark && mark.label.length > 1024) return
          const count = (counts.get(measure) ?? 0) + 1
          if (count > 100) return
          counts.set(measure, count)
          pending.push({ measure, sound, mark, appearance: graphic ?? words })
        }
      }
    }
  }
  if (!pending.length) return
  for (const { measure, mark } of pending) (measure.navigation ??= []).push(mark)
  const plan = createScoreRepeatPlaybackPlan({ parts: parsedParts })
  if (!plan || plan.navigationIssue) {
    for (const { measure } of pending) delete measure.navigation
    return
  }
  for (const { sound, appearance } of pending) {
    importedNavigationSounds.add(sound)
    if (appearance) importedNavigationAppearance.set(appearance.node, appearance)
  }
}

function readNavigationSymbolDirection(direction: XmlNode, kind: 'segno' | 'coda'): NavigationAppearance | undefined {
  const types = readDirectionTypes(direction).filter(node => Object.hasOwn(node, kind))
  if (types.length !== 1 || Array.isArray(types[0][kind])) return undefined
  const [node] = types
  const content = readOptionalNode(node, kind)
  const placement = readOptionalString(direction, '@_placement')
  return {
    node,
    fields: [kind],
    appearanceChanged: Boolean((placement && placement !== 'above') ||
      Object.keys(content ?? {}).some(key => key.startsWith('@_') && key !== '@_id' &&
        !(key === '@_smufl' && readOptionalString(content!, key) === kind)))
  }
}

function readNavigationEndDirection(direction: XmlNode, kind: 'dacapo' | 'dalsegno' | 'fine' | 'tocoda') {
  const [node, ...others] = readDirectionTypes(direction)
  if (!node || others.length || Array.isArray(node.words) || Array.isArray(node.symbol)) return undefined
  if (Object.keys(node).some(key => !key.startsWith('@_') && key !== 'words' && key !== 'symbol')) return undefined
  const words = readOptionalString(node, 'words')
  const symbol = readOptionalString(node, 'symbol')
  if (!words || words.length > 1024 || (symbol !== undefined && (kind !== 'tocoda' || symbol !== 'coda'))) return undefined

  const fields = symbol === 'coda' ? ['words', 'symbol'] : ['words']
  const placement = readOptionalString(direction, '@_placement')
  const appearanceChanged = Boolean((placement && placement !== 'above') ||
    fields.some(field => Object.keys(readOptionalNode(node, field) ?? {}).some(key => key.startsWith('@_') && key !== '@_id')))
  return { node, fields, appearanceChanged, display: { words, ...(symbol === 'coda' ? { coda: true as const } : {}) } }
}

function readLayoutBreaks(nodes: XmlNode[], measures: Measure[]): Score['layout'] {
  const system: string[] = []
  const page: string[] = []
  for (const [index, node] of nodes.entries()) {
    const measure = measures[index]
    if (!measure) continue
    const prints = toArray(node.print as XmlNode | XmlNode[] | undefined)
    if (prints.some(print => readOptionalString(print, '@_new-system') === 'yes')) system.push(measure.id)
    if (prints.some(print => readOptionalString(print, '@_new-page') === 'yes')) page.push(measure.id)
  }
  return system.length || page.length ? {
    ...(system.length ? { systemBreakBeforeMeasureIds: system } : {}),
    ...(page.length ? { pageBreakBeforeMeasureIds: page } : {})
  } : undefined
}

function readPartStaffMarkings(partNodes: XmlNode[], parts: Score['parts']) {
  type Markings = Pick<Score, 'harmonies' | 'staffTexts' | 'expressionTexts' | 'dynamics' | 'hairpins' | 'slurs' | 'octaveShifts'>
  const result: Markings = {}
  parts.forEach((part, partIndex) => {
    const nodes = toArray(partNodes[partIndex]?.measure as XmlNode | XmlNode[] | undefined)
    part.staves.forEach((staff, staffIndex) => {
      const staffNodes = nodes.map((node, measureIndex) => {
        const filter = (key: string) => toArray(node[key] as XmlNode | XmlNode[] | undefined)
          .filter(item => (readOptionalInteger(item, 'staff') ?? 1) === staffIndex + 1)
        const local = { ...node, note: filter('note'), direction: filter('direction'), harmony: filter('harmony') }
        // Keep source child identities for their node-keyed timing maps.
        sourceMeasureNumbers.set(local, readSourceMeasureNumber(node, measureIndex))
        return local
      })
      const prefix = parts.length === 1 && part.staves.length === 1 ? '' : `${part.id}:${staff.id}:`
      const anchor = <T extends { id: string; measureId: string }>(items: T[] | undefined) => items?.map(item => ({
        ...item, id: `${prefix}${item.id}`,
        measureId: staff.measures.find(measure => `measure-${measure.number}` === item.measureId)?.id ?? item.measureId
      }))
      const identify = <T extends { id: string }>(items: T[] | undefined) => items?.map(item => ({ ...item, id: `${prefix}${item.id}` }))
      const local: Markings = {
        harmonies: anchor(readHarmonies(staffNodes)),
        staffTexts: anchor(readStaffTexts(staffNodes)),
        expressionTexts: anchor(readExpressionTexts(staffNodes)),
        dynamics: anchor(readDynamics(staffNodes)),
        hairpins: identify(readHairpins(staffNodes, staff.measures, { partNumber: partIndex + 1, partId: part.id })),
        slurs: identify(readSlurs(staffNodes, staff.measures)),
        octaveShifts: identify(readOctaveShifts(staffNodes, staff.measures))
      }
      const append = <K extends keyof Markings>(key: K) => {
        if (local[key]?.length) result[key] = [...(result[key] ?? []), ...local[key]!] as Markings[K]
      }
      append('harmonies'); append('staffTexts'); append('expressionTexts'); append('dynamics')
      append('hairpins'); append('slurs'); append('octaveShifts')
    })
  })
  return result
}

// Keep damper playback separate from visual span marks and from sostenuto.
// Explicit sound CC values take precedence over the associated pedal sign.
function readPedalEvents(nodes: XmlNode[], parts: Score['parts']): Score['pedalEvents'] {
  const result: NonNullable<Score['pedalEvents']> = []
  parts.forEach((part, partIndex) => {
    const measures = toArray(nodes[partIndex]?.measure as XmlNode | XmlNode[] | undefined)
    const directions = measures.flatMap(node => toArray(node.direction as XmlNode | XmlNode[] | undefined))
    const unsupportedNumbers = new Set(directions.flatMap(direction => readDirectionTypes(direction)
      .flatMap(type => toArray(type.pedal as XmlNode | XmlNode[] | undefined))
      .filter(pedal => readOptionalString(pedal, '@_type') === 'sostenuto')
      .map(pedal => readOptionalInteger(pedal, '@_number') ?? 1)))
    measures.forEach((node, index) => {
      const append = (staffNumber: number, tick: number, value: number) => {
        const staff = part.staves[staffNumber - 1], measure = staff?.measures[index]
        if (!measure || tick > measureDurationTicks(measure)) throw new Error('MusicXML pedal의 staff 또는 마디 위치가 유효하지 않습니다.')
        result.push({ id: `pedal-${result.length + 1}`, partId: part.id, staffId: staff.id,
          measureId: measure.id, tick, value })
      }
      const soundValue = (sound: XmlNode | undefined) => {
        const raw = sound ? readOptionalString(sound, '@_damper-pedal') : undefined
        if (raw === undefined) return undefined
        if (raw === 'yes') return 127
        if (raw === 'no') return 0
        const value = Number(raw)
        if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('MusicXML damper-pedal 값은 yes/no 또는 0–100이어야 합니다.')
        return Math.round(value * 127 / 100)
      }
      // The object tree groups direct sounds after directions. Restore their
      // XML sibling order: a same-tick lift/retake has one instrument state.
      const sources = [
        ...toArray(node.direction as XmlNode | XmlNode[] | undefined).map(node => ({ node, direct: false })),
        ...toArray(node.sound as XmlNode | XmlNode[] | undefined).map(node => ({ node, direct: true }))
      ].sort((a, b) => (measureChildOrder.get(a.node) ?? 0) - (measureChildOrder.get(b.node) ?? 0))
      for (const { node: direction, direct } of sources) {
        const sound = direct ? direction : readOptionalNode(direction, 'sound'), value = soundValue(sound)
        const staff = direct ? 1 : readOptionalInteger(direction, 'staff') ?? 1
        if (value !== undefined) {
          append(staff, soundTicks.get(sound!) ?? 0, value)
          continue
        }
        if (direct) continue
        for (const type of readDirectionTypes(direction)) for (const pedal of toArray(type.pedal as XmlNode | XmlNode[] | undefined)) {
          const number = readOptionalInteger(pedal, '@_number') ?? 1
          if (number !== 1 || unsupportedNumbers.has(number)) continue
          const tick = directionTicks.get(direction) ?? 0
          switch (readOptionalString(pedal, '@_type')) {
            case 'start': append(staff, tick, 127); break
            case 'stop': append(staff, tick, 0); break
            case 'change': append(staff, tick, 0); append(staff, tick, 127); break
          }
        }
      }
    })
  })
  return result.length ? result : undefined
}

function findScorePartDefinition(partId: string, scoreParts: XmlNode[], partIndex: number) {
  const found = scoreParts.findIndex(candidate => candidate['@_id'] === partId)
  const index = found >= 0 ? found : partIndex
  return { node: scoreParts[index], index }
}

function parseMusicXmlPart(
  partNode: XmlNode,
  scoreParts: XmlNode[],
  options: {
    partIndex: number
    preserveLegacyIds: boolean
  }
): Score['parts'][number] {
  const partId =
    readOptionalString(partNode, '@_id') ?? `part-${options.partIndex + 1}`
  const scorePart = findScorePartDefinition(partId, scoreParts, options.partIndex).node
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

  indexStaffVoiceNumbers(measureNodes)
  let state = createPartMeasureState()
  let eventCounter = 0
  const measuresByStaff = new Map<number, Measure[]>()

  measureNodes.forEach((measureNode, measureIndex) => {
    const attributeBlocks = toArray(measureNode.attributes as XmlNode | XmlNode[] | undefined)
    const inheritedState = state
    const inheritedClefs = state.clefs
    // A staff's boundary settings can follow a backup to tick zero.
    // Keep the single-block projection for other attributes.
    const boundaryBlocks = attributeBlocks.length > 1
      ? attributeBlocks.filter(attributes => (directionTicks.get(attributes) ?? 0) === 0)
      : attributeBlocks
    const staffCount = boundaryBlocks.reduce((count, attributes) => readStaffCount(attributes, count), state.staffCount)
    for (const attributes of boundaryBlocks) {
      state = readPartMeasureState(attributes, state, staffCount)
    }

    // A single positioned block was projected onto the start of this bar.
    // Restore the opening clef for the staves whose pitched clef we can carry.
    const openingClefs = attributeBlocks.length === 1 ? inheritedClefs : state.clefs
    const deferredClefs = readDeferredPitchedClefs(attributeBlocks, openingClefs, staffCount)
    if (attributeBlocks.length === 1) {
      for (const staffNumber of deferredClefs.keys()) {
        state.clefs.set(staffNumber, openingClefs.get(staffNumber) ?? defaultMeasureState.clef)
      }
    }

    const noteNodes = toArray(measureNode.note as XmlNode | XmlNode[] | undefined)
    const positionTicksByVoice = new Map<string, number>()
    const eventsByVoice = new Map<string, VoiceEvent[]>()
    const rhythmicNoteNodesByVoice = new Map<string, XmlNode[]>()
    const pendingGraceNotesByVoice = new Map<string, GraceNote[]>()
    let previousGraceVoiceKey: string | undefined

    for (const noteNode of noteNodes) {
      const staffNumber = readStaffNumber(noteNode, state.staffCount)
      const voiceId = readVoiceId(noteNode, staffNumber)
      const voiceKey = musicXmlVoiceKey(staffNumber, voiceId)

      if ('grace' in noteNode) {
        if ('chord' in noteNode && previousGraceVoiceKey !== voiceKey) {
          throw new Error('MusicXML 꾸밈음 화음의 구성음은 같은 보표·성부의 앞 꾸밈음에 연결되어야 합니다.')
        }
        pendingGraceNotesByVoice.set(voiceKey, [
          ...(pendingGraceNotesByVoice.get(voiceKey) ?? []),
          readGraceNote(noteNode)
        ])
        previousGraceVoiceKey = voiceKey
        continue
      }
      previousGraceVoiceKey = undefined

      if ('chord' in noteNode) {
        const previousEvent = eventsByVoice.get(voiceKey)?.at(-1)

        if (!previousEvent || previousEvent.type !== 'note') {
          throw new Error('MusicXML chord note에 대응하는 앞 음표가 없습니다.')
        }

        const pitch = readPitch(noteNode)
        previousEvent.pitches = [...(previousEvent.pitches ?? [previousEvent.pitch]), pitch]
        const source = sourceChordMemberDurations.get(noteNode)
        if (source) {
          const appliedTicks = durationToTicks(previousEvent.duration)
          if (source.sourceTicks !== appliedTicks) source.appliedTicks = appliedTicks
        }
        continue
      }

      eventCounter += 1
      const positionTick = positionTicksByVoice.get(voiceKey) ?? 0
      const xmlDurationTicks = sourceNoteDurationTicks.get(noteNode)
      if (xmlDurationTicks === undefined) {
        throw new Error(`MusicXML event ${eventCounter}의 duration을 확인할 수 없습니다.`)
      }
      const event = withImportedEventId(
        readVoiceEvent(noteNode, eventCounter, positionTick, xmlDurationTicks),
        createImportedEventId(
          partId,
          staffNumber,
          eventCounter,
          options.preserveLegacyIds && state.staffCount === 1
        )
      )
      const pendingGraceNotes = pendingGraceNotesByVoice.get(voiceKey) ?? []

      if (event.type === 'note' && pendingGraceNotes.length > 0) {
        event.graceNotes = pendingGraceNotes
        pendingGraceNotesByVoice.delete(voiceKey)
      }

      if (
        !(event.type === 'rest' && event.fullMeasure) &&
        durationToTicks(event.duration) !== xmlDurationTicks
      ) {
        throw new Error(
          `MusicXML event ${eventCounter}의 type과 duration이 일치하지 않습니다.`
        )
      }

      positionTicksByVoice.set(voiceKey, positionTick + xmlDurationTicks)
      eventsByVoice.set(voiceKey, [
        ...(eventsByVoice.get(voiceKey) ?? []),
        event
      ])
      rhythmicNoteNodesByVoice.set(voiceKey, [
        ...(rhythmicNoteNodesByVoice.get(voiceKey) ?? []),
        noteNode
      ])
    }

    for (const [voiceKey, pending] of pendingGraceNotesByVoice) {
      const host = eventsByVoice.get(voiceKey)?.at(-1)
      if (!host || host.type !== 'note') throw new Error('MusicXML grace note를 연결할 실제 note가 없습니다.')
      // A grace at the end of this voice in the measure has no following host.
      // Preserve its notation after the last note without inferring playback.
      host.graceNotes = [
        ...(host.graceNotes ?? []),
        ...pending.map((note): GraceNote => ({
          ...note, after: true, pitch: { ...note.pitch, alter: note.pitch.alter ?? 0 }
        }))
      ]
    }

    const measureNumber =
      readSourceMeasureNumber(measureNode, measureIndex)
    const isPickup = readOptionalString(measureNode, '@_implicit') === 'yes'
    const actualDurationTicks = Math.max(0, ...positionTicksByVoice.values())

    if (isPickup && actualDurationTicks === 0) {
      throw new Error('MusicXML 못갖춘마디의 duration은 0보다 커야 합니다.')
    }

    const pickupDuration = isPickup ? actualDurationTicks : undefined
    const hasNextMeasure = measureIndex + 1 < measureNodes.length
    const singlePositionedBlock = attributeBlocks.length === 1 && (directionTicks.get(attributeBlocks[0]) ?? 0) > 0
      ? attributeBlocks[0] : undefined
    // The meter in a closing block cannot define the preceding bar's end.
    const openingMeter = singlePositionedBlock ? {
      ...state, timeSignature: inheritedState.timeSignature, timeSignatures: inheritedState.timeSignatures
    } : state
    const closingMeters = readClosingStaffSettings(attributeBlocks, openingMeter, pickupDuration, 'time', node =>
      timeSignatureDurationTicks(readTimeSignature(node)))
    const closingKeys = readClosingStaffSettings(attributeBlocks, openingMeter, pickupDuration, 'key', readKeySignature)
    const openingTranspositions = singlePositionedBlock ? inheritedState.transpositions : state.transpositions
    const positionedTranspositions = readPositionedTranspositions(attributeBlocks, openingMeter, pickupDuration)
    const leadingRestTranspositions = readLeadingRestTranspositions(positionedTranspositions, measureNode, openingMeter, pickupDuration)
    state.transpositions = new Map([...openingTranspositions, ...leadingRestTranspositions])

    // Keep the existing single-block approximation for attributes that do
    // not belong at the next downbeat.
    if (singlePositionedBlock && closingMeters.size) {
      const times = toArray(singlePositionedBlock.time as XmlNode | XmlNode[] | undefined)
      state = { ...state, ...readPartMeters(times.filter(time => !closingMeters.has(time)), inheritedState, staffCount) }
    }
    if (singlePositionedBlock && closingKeys.size) {
      const keys = toArray(singlePositionedBlock.key as XmlNode | XmlNode[] | undefined)
      state = { ...state, ...readPartKeys(keys.filter(key => !closingKeys.has(key)), inheritedState, staffCount) }
    }

    for (let staffNumber = 1; staffNumber <= state.staffCount; staffNumber += 1) {
      const measureId = createImportedMeasureId(
        partId,
        staffNumber,
        measureNumber,
        options.preserveLegacyIds && state.staffCount === 1
      )
      const voiceEntries = [...eventsByVoice.entries()]
        .filter(([voiceKey]) => voiceKey.startsWith(`${staffNumber}:`))
        .map(([voiceKey, events]) => [
          readVoiceIdFromMusicXmlVoiceKey(voiceKey),
          events
        ] as const)

      if (voiceEntries.length === 0) {
        voiceEntries.push([
          'voice-1',
          [
            createFullMeasureRest({
              id: `${measureId}-full-measure-rest`
            })
          ]
        ])
      }

      const activeKey = state.keySignatures.get(staffNumber) ?? state.keySignature
      const outsideRange = unsupportedKeyFifths.get(activeKey)
      if (outsideRange !== undefined) {
        throw new Error(`현재 가져오기에서 지원하지 않는 조표 범위입니다: fifths=${outsideRange} (지원 범위: -7~7). 적용 위치: ${partId} ${measureNumber}마디 ${staffNumber}보표`)
      }
      const keySignature = { ...activeKey }
      const voices = voiceEntries
        .sort(([left], [right]) => compareVoiceIds(left, right))
        .map(([voiceId, events]) => {
          const normalizedEvents = sortVoiceEvents(events)
          preserveImportedNaturals(normalizedEvents, keySignature)
          const voiceKey = musicXmlVoiceKey(staffNumber, voiceId)

          return createVoice({
            id: voiceId,
            events: normalizedEvents,
            tuplets: readTupletGroups(
              rhythmicNoteNodesByVoice.get(voiceKey) ?? [],
              normalizedEvents,
              measureId
            )
          })
        })

      const measure = createMeasure({
        id: measureId,
        number: measureNumber,
        timing: isPickup
          ? {
              type: 'pickup',
              durationTicks: actualDurationTicks
            }
          : {
              type: 'regular'
            },
        clef: { ...(state.clefs.get(staffNumber) ?? defaultMeasureState.clef) },
        transposition: state.transpositions.get(staffNumber),
        keySignature,
        timeSignature: { ...(state.timeSignatures.get(staffNumber) ?? state.timeSignature) },
        repeat: readRepeatMark(measureNode),
        volta: readVoltaMark(measureNode),
        voices
      })
      const rhythm = validateMeasureRhythm(measure)
      const tupletErrors = measure.voices.flatMap((voice) =>
        validateVoiceTuplets(voice)
      )

      if (!rhythm.isExact) {
        if (rhythm.status === 'gap' && 'forward' in measureNode) {
          const forward = toArray(measureNode.forward as XmlNode | XmlNode[] | undefined).map(node => ({
            duration: readOptionalString(node, 'duration'),
            voice: readOptionalString(node, 'voice'),
            staff: readOptionalString(node, 'staff')
          }))
          const source = { staff: staffNumber, forward }
          throw new Error(
            `MusicXML forward가 있는 마디의 성부 길이를 맞출 수 없습니다: part[${options.partIndex + 1}].measure[${measureNumber}].forward ${JSON.stringify(source)}`
          )
        }
        throw new Error(
          `MusicXML measure ${measureNumber}의 리듬 정합성이 올바르지 않습니다: ${rhythm.status}`
        )
      }

      if (tupletErrors.length > 0) {
        throw new Error(
          `MusicXML measure ${measureNumber}의 tuplet 관계가 올바르지 않습니다: ${tupletErrors.join(', ')}`
        )
      }

      measuresByStaff.set(staffNumber, [
        ...(measuresByStaff.get(staffNumber) ?? []),
        measure
      ])
    }

    for (const [staffNumber, clef] of deferredClefs) state.clefs.set(staffNumber, clef)
    if (positionedTranspositions.length) {
      state.transpositions = validatePositionedTranspositions({
        changes: positionedTranspositions, noteNodes, state, openingTranspositions,
        partId, partName, measureNumber, hasNextMeasure
      })
    }
    if (hasNextMeasure && closingKeys.size) {
      state = { ...state, ...readPartKeys([...closingKeys], state, staffCount) }
      for (const key of closingKeys) importedClosingKeys.add(key)
    }
    if (hasNextMeasure && closingMeters.size) {
      state = { ...state, ...readPartMeters([...closingMeters], state, staffCount) }
      for (const time of closingMeters) importedClosingMeters.add(time)
    }
  })

  return createPart({
    id: partId,
    name: partName,
    abbreviation,
    staves: Array.from({ length: state.staffCount }, (_, index) => {
      const staffNumber = index + 1

      return createStaff({
        id: `${partId}-staff-${staffNumber}`,
        measures: measuresByStaff.get(staffNumber) ?? []
      })
    })
  })
}

function readDirectSoundTempo(sound: XmlNode, measure: Measure | undefined): Score['tempo'] {
  const raw = readOptionalString(sound, '@_tempo'), bpm = Number(raw)
  const tick = soundTicks.get(sound) ?? 0
  // Match the existing editor's range/step. Never silently normalize a newly
  // supported source value or move an out-of-measure playback instruction.
  if (!measure || raw === undefined || !Number.isInteger(bpm) || bpm < 40 || bpm > 240 ||
    !Number.isSafeInteger(tick) || tick < 0 || tick > measureDurationTicks(measure)) return undefined
  return { ...readTempoFromDirection({ sound })!, transparent: true }
}

function readPrimaryDirectTempoState(measureNodes: XmlNode[], measures: Measure[]) {
  type Source = { tempo: NonNullable<Score['tempo']>; measureIndex: number; measureId: string; tick: number; id: string; direct: boolean }
  const sources: Source[] = []
  let hasDirectTempo = false
  measureNodes.forEach((measure, measureIndex) => {
    const number = readSourceMeasureNumber(measure, measureIndex)
    const children = [
      ...toArray(measure.direction as XmlNode | XmlNode[] | undefined).map((node, index) => ({ node, index, direct: false })),
      ...toArray(measure.sound as XmlNode | XmlNode[] | undefined).map((node, index) => ({ node, index, direct: true }))
    ].sort((a, b) => (measureChildOrder.get(a.node) ?? 0) - (measureChildOrder.get(b.node) ?? 0))
    for (const { node, index, direct } of children) {
      const tempo = direct ? readDirectSoundTempo(node, measures[measureIndex]) : readTempoFromDirection(node)
      if (!tempo) continue
      hasDirectTempo ||= direct
      sources.push({ tempo, measureIndex, measureId: `measure-${number}`,
        tick: (direct ? soundTicks : directionTicks).get(node) ?? 0,
        id: `measure-${number}-${direct ? 'direct-tempo' : 'tempo'}-${index + 1}`, direct })
    }
  })
  // Direction-only sources retain their dedicated reader. Direct inputs use
  // the same initial-anchor rule with hidden fallback and source-order precedence.
  if (!hasDirectTempo) return undefined
  const initial = sources.find(source => source.measureIndex === 0 && source.tick === 0)
  const tempo = initial?.tempo ?? { ...readTempoFromDirection({ sound: { '@_tempo': '120' } })!, transparent: true }
  const quarter = (mark: NonNullable<Score['tempo']>) => mark.bpm * durationToTicks({ value: mark.beatUnit ?? 'quarter', dots: mark.dots ?? 0 }) / TICKS_PER_QUARTER
  const atAnchor = new Map([['0:0', quarter(tempo)]])
  const tempoEvents: NonNullable<Score['tempoEvents']> = []
  for (const source of sources) {
    if (source === initial) continue
    const key = `${source.measureIndex}:${source.tick}`, bpm = quarter(source.tempo)
    // A redundant hidden instruction adds neither a new rate nor print ink.
    if (!(source.direct && atAnchor.get(key) === bpm)) tempoEvents.push({
      ...source.tempo, id: source.id, measureId: source.measureId, tick: source.tick
    })
    atAnchor.set(key, bpm)
  }
  return { tempo, tempoEvents: tempoEvents.length ? tempoEvents : undefined }
}

function readTempoMarking(measureNodes: XmlNode[]): Score['tempo'] {
  // A first encountered mark may belong to a later beat or measure. Only an
  // actual initial anchor supplies the base tempo; otherwise keep the engine's
  // existing default until the positioned event is reached.
  const directions = toArray(measureNodes[0]?.direction as XmlNode | XmlNode[] | undefined)
  for (const direction of directions) {
    const tick = directionTicks.get(direction) ?? readOptionalInteger(direction, 'offset') ?? 0
    if (tick !== 0) continue
    const tempo = readTempoFromDirection(direction)
    if (tempo) return tempo
  }
  return undefined
}

function readTempoEvents(measureNodes: XmlNode[]): Score['tempoEvents'] {
  let skippedGlobalTempo = false
  const events = measureNodes.flatMap((measureNode, measureIndex) => {
    const measureNumber =
      readSourceMeasureNumber(measureNode, measureIndex)
    const measureId = `measure-${measureNumber}`
    const directions = toArray(
      measureNode.direction as XmlNode | XmlNode[] | undefined
    )

    return directions.flatMap((direction, directionIndex) => {
      const tempo = readTempoFromDirection(direction)

      if (!tempo) {
        return []
      }

      const tick = directionTicks.get(direction) ?? readOptionalInteger(direction, 'offset') ?? 0

      if (!skippedGlobalTempo && measureIndex === 0 && tick === 0) {
        skippedGlobalTempo = true
        return []
      }

      return [
        {
          id: `${measureId}-tempo-${directionIndex + 1}`,
          measureId,
          tick,
          ...tempo
        }
      ]
    })
  })

  return events.length > 0 ? events : undefined
}

function readTempoFromDirection(direction: XmlNode): Score['tempo'] {
  const directionTypes = readDirectionTypes(direction)
  const metronomeDirectionType = directionTypes.find((directionType) =>
    Boolean(readOptionalNode(directionType, 'metronome'))
  )
  const wordsDirectionType = findTempoWordsDirectionType(directionTypes, metronomeDirectionType)
  const words = (wordsDirectionType ? readOptionalString(wordsDirectionType, 'words') : undefined) || undefined
  const metronome = metronomeDirectionType
    ? readOptionalNode(metronomeDirectionType, 'metronome')
    : undefined
  const sound = readOptionalNode(direction, 'sound')
  const soundTempo = sound
    ? readOptionalNumber(sound, '@_tempo')
    : undefined
  const playback = readMetronomePlayback(metronome, soundTempo)
  const conversion = playback.unitConversion
  if (conversion && !conversion.tempo) {
    throw new Error(`MusicXML 메트로놈 기준 음가를 정확히 환산할 수 없습니다: beat-unit=${playback.beatUnit}, dots=${playback.dots}, per-minute=${JSON.stringify(playback.raw)}, quarterBpm=${conversion.quarterBpm}`)
  }
  const tempoValue = conversion?.tempo?.bpm ?? playback.value
  if (tempoValue === undefined) {
    // A formatted label without a playable number must not invent a clock.
    if (playback.raw !== undefined) {
      throw new Error('MusicXML 숫자 값이 올바르지 않습니다: per-minute')
    }
    return undefined
  }

  const bpm = conversion?.tempo?.bpm ?? normalizeTempo(tempoValue)
  const { beatUnit, dots } = conversion?.tempo ?? playback
  const wordsColor = wordsDirectionType ? readOptionalString(readOptionalNode(wordsDirectionType, 'words') ?? {}, '@_color') : undefined
  const hiddenWords = !words || /^#00[0-9a-f]{6}$/i.test(wordsColor ?? '')
  const hiddenMetronome = readOptionalString(metronome ?? {}, '@_print-object') === 'no'

  return {
    bpm,
    beatUnit: isTempoBeatUnit(beatUnit) ? beatUnit : 'quarter',
    dots,
    text: words ?? tempoLabel(!conversion && playback.preserveText ? playback.raw! : bpm, beatUnit, dots),
    ...((readOptionalString(direction, '@_print-object') === 'no' || (hiddenMetronome && hiddenWords))
      ? {
          transparent: true
        }
      : {})
  }
}

// MusicXML per-minute is a string: ranges and approximate descriptions are
// display text, whereas sound tempo is always expressed in quarter-note BPM.
// Keep strict numeric precedence and the legacy out-of-range fallback intact.
function readMetronomePlayback(metronome: XmlNode | undefined, soundTempo: number | undefined) {
  const raw = metronome ? readOptionalString(metronome, 'per-minute') : undefined
  const beatUnit = metronome ? readOptionalString(metronome, 'beat-unit') : undefined
  const dots = metronome ? toArray(metronome['beat-unit-dot']).length : 0
  const formatted = raw !== undefined && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)
  const prefix = raw === undefined ? undefined : Number.parseFloat(raw)
  const supportedBeat = isTempoBeatUnit(beatUnit) && dots <= 3
  const localSound = supportedBeat && soundTempo !== undefined
    ? soundTempo / (durationToTicks({ value: beatUnit, dots }) / TICKS_PER_QUARTER)
    : undefined
  const usesNativeSound = Boolean(formatted && raw && localSound !== undefined &&
    Number.isFinite(localSound) && localSound > 0 && localSound <= 1000)
  const value = usesNativeSound ? localSound : raw === undefined ? soundTempo
    : prefix !== undefined && Number.isFinite(prefix) ? prefix : undefined
  const preserveText = Boolean(formatted && raw && supportedBeat && value !== undefined && value > 0 && value <= 1000)
  // Convert only explicit, known MusicXML units outside the native duration
  // enum. Do not apply legacy numeric clamping to their equivalent clock.
  const factor = beatUnit === undefined ? undefined : convertibleTempoUnitFactors.get(beatUnit)
  const usesConvertedSound = Boolean(factor !== undefined && formatted && soundTempo !== undefined &&
    Number.isFinite(soundTempo) && soundTempo > 0)
  const unitConversion = factor !== undefined && raw !== undefined ? (() => {
    const quarterBpm = usesConvertedSound ? soundTempo! : (value ?? Number.NaN) * factor * (2 - 2 ** -dots)
    return { quarterBpm, tempo: representQuarterTempo(quarterBpm) }
  })() : undefined
  return { raw, beatUnit, dots, formatted, usesSound: usesNativeSound || usesConvertedSound, value, preserveText, unitConversion }
}

const convertibleTempoUnitFactors = new Map<string, number>([
  ['128th', 1 / 32], ['256th', 1 / 64], ['512th', 1 / 128], ['1024th', 1 / 256],
  ['breve', 8], ['long', 16], ['maxima', 32]
])

function representQuarterTempo(quarterBpm: number): { bpm: number; beatUnit: DurationValue; dots: number } | undefined {
  if (!Number.isFinite(quarterBpm) || quarterBpm <= 0) return undefined
  const candidates: { beatUnit: DurationValue; dots: number }[] = [
    { beatUnit: 'quarter', dots: 0 },
    ...[0, 1, 2, 3].map(dots => ({ beatUnit: 'whole' as const, dots }))
  ]
  for (const candidate of candidates) {
    const factor = durationToTicks({ value: candidate.beatUnit, dots: candidate.dots }) / TICKS_PER_QUARTER
    const bpm = quarterBpm / factor
    if (bpm > 0 && bpm <= 1000 && bpm * factor === quarterBpm) return { bpm, ...candidate }
  }
  return undefined
}

const defaultRhythmFeelText = {
  eighth: '♫ = ³♩ ♪',
  '16th': '♬ = ³♪ 𝅘𝅥𝅯'
} as const satisfies Record<NonNullable<Score['rhythmFeel']>['unit'], string>

function readGlobalSwingPlayback(parts: XmlNode[]) {
  const sources: { partIndex: number; measureIndex: number; path: string; value?: Score['swingPlayback']; supported: boolean }[] = []
  parts.forEach((part, partIndex) => toArray(part.measure as XmlNode | XmlNode[] | undefined).forEach((measure, measureIndex) => {
    const number = readSourceMeasureNumber(measure, measureIndex)
    const collect = (sound: XmlNode, path: string, scoped: boolean) => {
      if (!sound || typeof sound !== 'object' || !('swing' in sound)) return
      const node = readOptionalNode(sound, 'swing'), first = Number(node && readOptionalString(node, 'first')), second = Number(node && readOptionalString(node, 'second'))
      const unit = node && readOptionalString(node, 'swing-type')
      const ratio = first > 0 && second > 0 && Number.isInteger(first) && Number.isInteger(second)
        ? first / second === 2 ? '2:1' : first / second === 1.5 ? '3:2' : undefined : undefined
      const straight = Boolean(node && 'straight' in node)
      const value: Score['swingPlayback'] = ratio && (unit === 'eighth' || unit === '16th') ? { unit, ratio } : undefined
      const supported = Boolean(node && !('swing-style' in node) && (straight || value) &&
        measureIndex === 0 && soundTicks.get(sound) === 0 && !scoped)
      sources.push({ partIndex, measureIndex, path: path + '.swing', value, supported })
    }
    toArray(measure.sound as XmlNode | XmlNode[] | undefined).forEach((sound, i) => collect(sound, `part[${partIndex + 1}].measure[${number}].sound[${i + 1}]`, false))
    toArray(measure.direction as XmlNode | XmlNode[] | undefined).forEach((direction, i) => {
      const sound = readOptionalNode(direction, 'sound')
      if (sound) collect(sound, `part[${partIndex + 1}].measure[${number}].direction[${i + 1}].sound`, 'staff' in direction || 'voice' in direction)
    })
  }))
  const first = sources[0], signature = (value: Score['swingPlayback']) => JSON.stringify(value ?? null)
  // MusicXML sound belongs to a part. Missing/contradictory parts must not be
  // silently promoted to a global instruction in this first global model.
  const represented = Boolean(first && sources.every(source => source.supported && signature(source.value) === signature(first.value)) &&
    parts.every((_, index) => sources.some(source => source.partIndex === index)))
  const warnings: MusicXmlImportWarning[] = represented ? [] : sources.map(source => ({
    code: 'unsupported-direction', partNumber: source.partIndex + 1,
    measureNumber: readSourceMeasureNumber(toArray(parts[source.partIndex].measure as XmlNode | XmlNode[])[source.measureIndex], source.measureIndex),
    path: source.path,
    message: 'Unrepresented swing playback scope or ratio. Only matching whole-score initial eighth/16th ratios 2:1 and 3:2 are supported. Keep the original MusicXML and compare playback and re-export.'
  }))
  return { value: represented ? first?.value : undefined, hasFormal: sources.length > 0, warnings }
}

function readRhythmFeelMarking(measureNodes: XmlNode[], preserveSwingWords = false): Score['rhythmFeel'] {
  for (const measureNode of measureNodes) {
    const directions = toArray(
      measureNode.direction as XmlNode | XmlNode[] | undefined
    )

    for (const direction of directions) {
      const types = readDirectionTypes(direction)
      const tempoWords = findTempoWordsDirectionType(types,
        types.find(type => Boolean(readOptionalNode(type, 'metronome'))))
      for (const directionType of types) {
        // A paired tempo label can contain a duration glyph without declaring
        // swing. Independent legacy rhythm words still follow the old reader.
        if (directionType === tempoWords) continue
        const words = readOptionalString(directionType, 'words')
        const rhythmFeel = words ? parseRhythmFeelText(words) : undefined

        if (rhythmFeel) {
          if (preserveSwingWords && words && /^(swing|shuffle)/i.test(words.trim())) return { ...rhythmFeel, text: words.trim() }
          return rhythmFeel
        }
      }
    }
  }

  return undefined
}

function parseRhythmFeelText(text: string): Score['rhythmFeel'] {
  const normalized = text.trim()
  const lower = normalized.toLowerCase()
  const unit = normalized.includes('♬') ||
    normalized.includes('𝅘𝅥𝅯') ||
    lower.includes('16th')
    ? '16th'
    : normalized.includes('♫') ||
        normalized.includes('♪♪') ||
        normalized.includes('♩♪') ||
        lower.startsWith('swing') ||
        lower.startsWith('triplet feel') ||
        lower.startsWith('shuffle')
      ? 'eighth'
      : undefined

  if (!unit) {
    return undefined
  }

  return isDefaultRhythmFeelText(normalized, lower, unit)
    ? { unit }
    : { unit, text: normalized }
}

function isDefaultRhythmFeelText(
  normalized: string,
  lower: string,
  unit: NonNullable<Score['rhythmFeel']>['unit']
): boolean {
  return (
    normalized === defaultRhythmFeelText[unit] ||
    lower === 'swing' ||
    lower === 'swing 16ths' ||
    lower.startsWith('swing:') ||
    lower === 'triplet feel' ||
    lower === '16th triplet feel'
  )
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

function tempoLabel(bpm: number | string, beatUnit: string | undefined, dots: number): string {
  const symbols: Record<DurationValue, string> = {
    whole: '𝅝', half: '𝅗𝅥', quarter: '♩', eighth: '♪',
    '16th': '𝅘𝅥𝅯', '32nd': '𝅘𝅥𝅰', '64th': '𝅘𝅥𝅱'
  }
  return `${symbols[isTempoBeatUnit(beatUnit) ? beatUnit : 'quarter']}${'.'.repeat(dots)} = ${bpm}`
}

function readRehearsalMarks(measureNodes: XmlNode[]): Score['rehearsalMarks'] {
  const marks = measureNodes.flatMap((measureNode, measureIndex) => {
    const measureNumber =
      readSourceMeasureNumber(measureNode, measureIndex)
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
      readSourceMeasureNumber(measureNode, measureIndex)
    const measureId = `measure-${measureNumber}`
    const directions = toArray(
      measureNode.direction as XmlNode | XmlNode[] | undefined
    )

    return directions.flatMap((direction, directionIndex) => {
      const directionTypes = readDirectionTypes(direction)
      const tempoWordsType = findTempoWordsDirectionType(directionTypes,
        directionTypes.find(type => Boolean(readOptionalNode(type, 'metronome'))))

      return directionTypes.flatMap((directionType, typeIndex) => {
        if (importedNavigationAppearance.get(directionType)?.fields.includes('words')) return []
        if (directionType === tempoWordsType || readOptionalNode(directionType, 'metronome')) {
          return []
        }

        const words = readOptionalString(directionType, 'words')

        if (
          !words ||
          parseRhythmFeelText(words) ||
          isSystemTextDirection(direction) ||
          isExpressionTextDirection(direction, directionType)
        ) {
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

function readSystemTexts(measureNodes: XmlNode[]): Score['systemTexts'] {
  const texts = measureNodes.flatMap((measureNode, measureIndex) => {
    const measureNumber =
      readSourceMeasureNumber(measureNode, measureIndex)
    const measureId = `measure-${measureNumber}`
    const directions = toArray(
      measureNode.direction as XmlNode | XmlNode[] | undefined
    )

    return directions.flatMap((direction, directionIndex) => {
      if (!isSystemTextDirection(direction)) {
        return []
      }

      const directionTypes = readDirectionTypes(direction)

      return directionTypes.flatMap((directionType, typeIndex) => {
        if (importedNavigationAppearance.get(directionType)?.fields.includes('words')) return []
        const words = readOptionalString(directionType, 'words')

        if (!words || parseRhythmFeelText(words)) {
          return []
        }

        return [
          {
            id: `${measureId}-system-text-${directionIndex + 1}${directionTypeIdSuffix(directionTypes, typeIndex)}`,
            measureId,
            text: words
          }
        ]
      })
    })
  })

  return texts.length > 0 ? texts : undefined
}

function readExpressionTexts(
  measureNodes: XmlNode[]
): Score['expressionTexts'] {
  const texts = measureNodes.flatMap((measureNode, measureIndex) => {
    const measureNumber =
      readSourceMeasureNumber(measureNode, measureIndex)
    const measureId = `measure-${measureNumber}`
    const directions = toArray(
      measureNode.direction as XmlNode | XmlNode[] | undefined
    )

    return directions.flatMap((direction, directionIndex) => {
      const directionTypes = readDirectionTypes(direction)

      return directionTypes.flatMap((directionType, typeIndex) => {
        if (importedNavigationAppearance.get(directionType)?.fields.includes('words')) return []
        const words = readOptionalString(directionType, 'words')

        if (
          !words ||
          parseRhythmFeelText(words) ||
          !isExpressionTextDirection(direction, directionType)
        ) {
          return []
        }

        return [
          {
            id: `${measureId}-expression-text-${directionIndex + 1}${directionTypeIdSuffix(directionTypes, typeIndex)}`,
            measureId,
            tick: directionTicks.get(direction) ?? readOptionalInteger(direction, 'offset') ?? 0,
            text: words
          }
        ]
      })
    })
  })

  return texts.length > 0 ? texts : undefined
}

function isSystemTextDirection(direction: XmlNode): boolean {
  // Accept earlier Studio files as well as the standard system-relation value.
  const system = readOptionalString(direction, '@_system')
  return system === 'yes' || system === 'only-top'
}

function isExpressionTextDirection(
  direction: XmlNode,
  directionType: XmlNode
): boolean {
  const wordsNode = readOptionalNode(directionType, 'words')

  return (
    readOptionalString(direction, '@_placement') === 'below' &&
    readOptionalString(wordsNode ?? {}, '@_font-style') === 'italic'
  )
}

function readHarmonies(measureNodes: XmlNode[]): Score['harmonies'] {
  const harmonies = measureNodes.flatMap((measureNode, measureIndex) => {
    const measureNumber =
      readSourceMeasureNumber(measureNode, measureIndex)
    const measureId = `measure-${measureNumber}`
    const harmonyNodes = toArray(
      measureNode.harmony as XmlNode | XmlNode[] | undefined
    )

    return harmonyNodes.flatMap((harmonyNode, harmonyIndex) => {
      const root = readHarmonyPitch(harmonyNode, 'root')
      const bass = readHarmonyPitch(harmonyNode, 'bass')
      const kindNode = readOptionalNode(harmonyNode, 'kind')
      const kindText =
        kindNode
          ? readOptionalString(kindNode, '@_text') ??
            readOptionalString(kindNode, '#text') ??
            readOptionalString(harmonyNode, 'kind')
          : readOptionalString(harmonyNode, 'kind')

      const kindValue = kindNode ? readOptionalString(kindNode, '#text') : readOptionalString(harmonyNode, 'kind')
      const kind = kindNode ? readOptionalString(kindNode, '@_value') : undefined
      const resolvedKind = kind ?? (kindValue && musicXmlHarmonyKinds.has(kindValue) ? kindValue : undefined)
      const displayText = kindNode ? readOptionalString(kindNode, '@_text') : undefined

      if (!root && !kindText) {
        return []
      }

      return [
        {
          id: `${measureId}-harmony-${harmonyIndex + 1}`,
          measureId,
          tick: directionTicks.get(harmonyNode) ?? readOptionalInteger(harmonyNode, 'offset') ?? 0,
          text: resolveHarmonyDisplayText(root, resolvedKind, bass, displayText) ?? kindText ?? root!.step,
          root,
          kind: resolvedKind,
          bass
        }
      ]
    })
  })

  return harmonies.length > 0 ? harmonies : undefined
}

function readHarmonyPitch(
  harmonyNode: XmlNode,
  role: 'root' | 'bass'
): NonNullable<NonNullable<Score['harmonies']>[number]['root']> | undefined {
  const node = readOptionalNode(harmonyNode, role)

  if (!node) {
    return undefined
  }

  const stepValue = readOptionalString(node, `${role}-step`)?.toUpperCase()

  if (!stepValue) {
    return undefined
  }

  if (!isPitchStep(stepValue)) {
    throw new Error(`지원하지 않는 harmony ${role} step입니다: ${stepValue}`)
  }

  const alter = readOptionalIntegralSemitones(node, `${role}-alter`)

  if (alter !== undefined && ![-2, -1, 0, 1, 2].includes(alter)) {
    throw new Error(`지원하지 않는 harmony ${role} alter 값입니다: ${alter}`)
  }

  return {
    step: stepValue,
    alter: alter as -2 | -1 | 0 | 1 | 2 | undefined
  }
}

const supportedDynamicValues = [
  'ppp',
  'pp',
  'p',
  'mp',
  'mf',
  'f',
  'ff',
  'fff',
  'sfz'
] as const satisfies readonly DynamicValue[]

function readDynamics(measureNodes: XmlNode[]): Score['dynamics'] {
  const allowedDynamics = new Set<DynamicValue>(supportedDynamicValues)
  const dynamics = measureNodes.flatMap((measureNode, measureIndex) => {
    const measureNumber =
      readSourceMeasureNumber(measureNode, measureIndex)
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
  measures: Score['parts'][number]['staves'][number]['measures'],
  sourcePart: Pick<HairpinEndSource, 'partNumber' | 'partId'>
): Score['hairpins'] {
  type Marker = {
    direction: XmlNode
    wedge: XmlNode
    type: HairpinType | 'stop'
    measureIndex: number
    directionIndex: number
  }
  const pending = new Map<string | number, Marker>()
  const hairpins = measureNodes.flatMap((measureNode, measureIndex) => {
    const directions = toArray(
      measureNode.direction as XmlNode | XmlNode[] | undefined
    )
    const completed: NonNullable<Score['hairpins']> = []

    directions.forEach((direction, directionIndex) => {
      const wedges = readDirectionTypes(direction).flatMap((directionType) =>
        toArray(directionType.wedge as XmlNode | XmlNode[] | undefined)
      )

      wedges.forEach((wedge) => {
        const type = readOptionalString(wedge, '@_type')
        if (type !== 'crescendo' && type !== 'diminuendo' && type !== 'stop') return
        const sourceNumber = readOptionalString(wedge, '@_number') ?? '1'
        const level = Number(sourceNumber)
        const number = /^\+?\d+$/.test(sourceNumber) && level >= 1 && level <= 16 ? level : sourceNumber
        const marker: Marker = { direction, wedge, type, measureIndex, directionIndex }
        const previous = pending.get(number)

        // A backup in a polyphonic measure can place a later stop before
        // its earlier start in the file. Resolve the pair before anchoring.
        if (!previous) {
          pending.set(number, marker)
          return
        }
        const start = type === 'stop' ? previous : marker
        const stop = type === 'stop' ? marker : previous
        if (start.type === 'stop' || stop.type !== 'stop') {
          throw new Error('MusicXML hairpin number가 중복되었습니다.')
        }
        if (stop.measureIndex < start.measureIndex || (stop.measureIndex === start.measureIndex &&
            (directionTicks.get(stop.direction) ?? 0) <= (directionTicks.get(start.direction) ?? 0))) {
          throw new Error('MusicXML 헤어핀 끝점은 시작점보다 뒤에 있어야 합니다.')
        }

        const startMeasure = measures[start.measureIndex]
        const anchor = { ...directionAnchor(start.direction, startMeasure, true), measure: startMeasure }
        const stopMeasure = measures[stop.measureIndex]
        const endMarker = readHairpinEndMarker(readOptionalString(stop.wedge, '@_id'))
        const endSource = {
          ...sourcePart,
          measureIndex: stop.measureIndex,
          measureLabel: readOptionalString(measureNodes[stop.measureIndex], '@_number'),
          sourceVoice: readOptionalString(stop.direction, 'voice') ?? readOptionalString(start.direction, 'voice')
        }
        const sourceTick = directionTicks.get(stop.direction) ?? 0
        const endEvent = endMarker === 'time' ? undefined
          : findDirectionAnchor(stop.direction, stopMeasure, true, anchor.voiceId, true, endMarker)
        const span = {
          id: `hairpin-${completed.length + 1}-${stop.measureIndex + 1}-${stop.directionIndex + 1}`,
          startEventId: anchor.event.id,
          type: start.type
        }
        pending.delete(number)
        if (!endEvent) {
          const voiceId = directionVoiceId(stop.direction, anchor.voiceId)
          if (!stopMeasure || voiceId === undefined || !stopMeasure.voices.some(voice => voice.id === voiceId) ||
              sourceTick > measureDurationTicks(stopMeasure) || (endMarker && endMarker !== 'time')) {
            throw new MusicXmlHairpinEndAnchorError(endSource, readOptionalInteger(stop.direction, 'staff') ?? 1, voiceId, sourceTick)
          }
          completed.push({ ...span, endTime: { measureId: stopMeasure.id, voiceId, tick: sourceTick } })
          return
        }
        const end = { ...endEvent, measure: stopMeasure }
        const legacyTick = hairpinEndTick(undefined, anchor, end)
        // A chosen note release is unambiguous after onset lookup fails. For
        // onsets, opt in the cross-voice case where the two ends are authored
        // independently, retaining same-voice interchange for existing scores.
        let endAnchor = end.endAnchor
        if (!endAnchor && end.event.type === 'note') {
          if (sourceTick === end.event.position.tick && anchor.voiceId !== end.voiceId) endAnchor = 'onset'
          else if (sourceTick !== legacyTick && sourceTick === hairpinEndTick('release', anchor, end)) endAnchor = 'release'
        }
        const retainedTick = hairpinEndTick(endAnchor, anchor, end)
        if (retainedTick !== sourceTick) {
          unrepresentedHairpinStops.set(stop.wedge, {
            staff: readOptionalInteger(stop.direction, 'staff') ?? 1,
            voice: end.voiceId, sourceTick, retainedTick
          })
        }
        completed.push({ ...span, endEventId: end.event.id, ...(endAnchor ? { endAnchor } : {}) })
      })
    })

    return completed
  })

  if (pending.size > 0) {
    throw new Error([...pending.values()].some(marker => marker.type === 'stop')
      ? 'MusicXML hairpin stop에 대응하는 시작 표식이 없습니다.'
      : 'MusicXML hairpin의 종료 표식이 없습니다.')
  }

  return hairpins.length > 0 ? hairpins : undefined
}

function readSlurs(
  measureNodes: XmlNode[],
  measures: Score['parts'][number]['staves'][number]['measures']
): Score['slurs'] {
  type Endpoint = { type: 'start' | 'stop'; event: Note; measureIndex: number }
  const activeSlurs = new Map<string, Endpoint>()
  const slurs: NonNullable<Score['slurs']> = []

  measureNodes.forEach((measureNode, measureIndex) => {
    const voices = measures[measureIndex]?.voices ?? []
    const nextIndex = new Map<number, number>()
    const noteNodes = toArray(measureNode.note as XmlNode | XmlNode[] | undefined)

    noteNodes.forEach((noteNode) => {
      if ('grace' in noteNode) return
      const staffNumber = readOptionalInteger(noteNode, 'staff') ?? 1
      const voiceNumber = readVoiceIdNumber(readVoiceId(noteNode, staffNumber))
      const voice = voices.find(candidate => readVoiceIdNumber(candidate.id) === voiceNumber)
      const index = nextIndex.get(voiceNumber) ?? 0
      const event = voice?.events['chord' in noteNode ? index - 1 : index]
      if (!('chord' in noteNode)) nextIndex.set(voiceNumber, index + 1)

      if (!event || event.type !== 'note') {
        return
      }

      const slurNodes = toArray(noteNode.notations as XmlNode | XmlNode[] | undefined)
        .flatMap(notations => toArray(notations?.slur as XmlNode | XmlNode[] | undefined))

      slurNodes.forEach((slurNode) => {
        const type = readOptionalString(slurNode, '@_type')
        if (type !== 'start' && type !== 'stop') return
        const sourceNumber = readOptionalString(slurNode, '@_number') ?? '1'
        const number = parseSlurNumber(sourceNumber)
        const key = number === undefined ? sourceNumber : String(number)
        const marker: Endpoint = { type, event, measureIndex }
        const previous = activeSlurs.get(key)

        // A backup can put the ending note of one voice before the starting
        // note of another voice in the file, even on the same staff.
        if (!previous) {
          activeSlurs.set(key, marker)
          return
        }
        if (previous.type === type) {
          throw new Error(`MusicXML에서 같은 slur 번호 ${sourceNumber}의 ${type} 표식이 중복되었습니다.`)
        }
        const start = type === 'start' ? marker : previous
        const stop = type === 'stop' ? marker : previous
        if (start.measureIndex > stop.measureIndex || (start.measureIndex === stop.measureIndex &&
            start.event.position.tick >= stop.event.position.tick)) {
          throw new Error('MusicXML 슬러 끝점은 시작점보다 뒤에 있어야 합니다.')
        }

        slurs.push({
          id: `slur-${slurs.length + 1}`,
          startEventId: start.event.id,
          endEventId: stop.event.id,
          number
        })
        activeSlurs.delete(key)
      })
    })
  })

  if (activeSlurs.size > 0) {
    throw new Error([...activeSlurs.values()].some(marker => marker.type === 'stop')
      ? 'MusicXML slur stop에 대응하는 시작 표식이 없습니다.'
      : 'MusicXML slur의 종료 표식이 없습니다.')
  }

  return slurs.length > 0 ? slurs : undefined
}

function readRepeatMark(measureNode: XmlNode): Score['parts'][number]['staves'][number]['measures'][number]['repeat'] {
  const barlines = toArray(measureNode.barline as XmlNode | XmlNode[] | undefined)
  let start = false
  let end = false
  let times: number | undefined
  let afterJump: boolean | undefined

  for (const barline of barlines) {
    const repeat = readOptionalNode(barline, 'repeat')

    if (!repeat) {
      continue
    }

    const direction = readOptionalString(repeat, '@_direction')

    if (direction === 'forward') {
      start = true
    } else if (direction === 'backward') {
      end = true
      times = readOptionalInteger(repeat, '@_times') ?? times
      const flag = readOptionalString(repeat, '@_after-jump')
      if (flag === 'yes' || flag === 'no') afterJump = flag === 'yes'
    }
  }

  return start || end
    ? {
        start: start || undefined,
        end: end || undefined,
        times,
        ...(afterJump !== undefined ? { afterJump } : {})
      }
    : undefined
}

function readVoltaMark(measureNode: XmlNode): VoltaMark | undefined {
  let volta: VoltaMark | undefined
  const barlines = toArray(measureNode.barline as XmlNode | XmlNode[] | undefined)
  for (const barline of barlines) {
    const ending = readOptionalNode(barline, 'ending')
    if (!ending) continue
    const number = readOptionalString(ending, '@_number')
    const type = readOptionalString(ending, '@_type')
    if (number === undefined || (type !== 'start' && type !== 'stop' && type !== 'discontinue')) continue

    if (number && !/^[1-9]\d*(?:, *[1-9]\d*)*$/.test(number)) {
      throw new Error('MusicXML 볼타의 회차 목록이 올바르지 않습니다.')
    }
    const passes = number ? number.split(',').map(Number) : []
    if (!passes.every(Number.isSafeInteger)) throw new Error('MusicXML 볼타의 회차 번호가 너무 큽니다.')
    const [first] = passes
    const next: VoltaMark = passes.length === 1 && (first === 1 || first === 2)
      ? { number: first }
      : { passes }

    // A measure can retain one ending. Preserve old single 1st/2nd behavior;
    // an imported pass list cannot be combined with a different endpoint.
    if (volta && (volta.passes || next.passes) && !sameVoltaPasses(volta, next)) {
      throw new Error('같은 마디에 서로 다른 볼타 회차의 시작과 끝이 있습니다.')
    }
    volta = {
      ...next,
      start: volta?.start || type === 'start' || undefined,
      end: volta?.end || type !== 'start' || undefined
    }
  }
  return volta
}

function readOctaveShifts(
  measureNodes: XmlNode[],
  measures: Score['parts'][number]['staves'][number]['measures']
): Score['octaveShifts'] {
  type OctaveMarker = {
    direction: XmlNode
    directionIndex: number
    measureIndex: number
    tick: number
    shift?: NonNullable<Score['octaveShifts']>[number]['type']
  }
  const pending = new Map<string, OctaveMarker>()
  const shifts: NonNullable<Score['octaveShifts']> = []
  let measureStart = 0

  measureNodes.forEach((measureNode, measureIndex) => {
    const directions = toArray(
      measureNode.direction as XmlNode | XmlNode[] | undefined
    )

    directions.forEach((direction, directionIndex) => {
      const octaveShiftNodes = readDirectionTypes(direction).flatMap((directionType) =>
        toArray(directionType['octave-shift'] as XmlNode | XmlNode[] | undefined)
      )

      octaveShiftNodes.forEach((node) => {
        const markerType = readOptionalString(node, '@_type')
        if (markerType !== 'up' && markerType !== 'down' && markerType !== 'stop') return

        const number = readOptionalString(node, '@_number') ?? '1'
        const shift = markerType === 'stop' ? undefined
          : toOctaveShiftType(markerType, readOptionalInteger(node, '@_size') ?? 8)
        const marker: OctaveMarker = {
          direction, directionIndex, measureIndex, shift,
          tick: measureStart + (directionTicks.get(direction) ?? 0)
        }

        // Numbers are reusable once a pair closes in document order. A
        // backup may put a stop before its own start in that same order.
        const previous = pending.get(number)
        if (!previous) {
          pending.set(number, marker)
          return
        }
        const type = shift ?? previous.shift
        if (!type || (shift && previous.shift)) throw new Error('MusicXML octave-shift number가 중복되었습니다.')

        const start = shift ? marker : previous
        const stop = shift ? previous : marker
        if (stop.tick <= start.tick) {
          throw new Error('MusicXML octave-shift의 종료 위치는 시작 위치보다 뒤에 있어야 합니다.')
        }
        const anchor = directionAnchor(start.direction, measures[start.measureIndex])
        const endEventId = octaveStopEventId(stop.direction, measures, stop.tick, anchor.voiceId)
        shifts.push({
          id: `octave-shift-${shifts.length + 1}-${stop.measureIndex + 1}-${stop.directionIndex + 1}`,
          startEventId: anchor.event.id, endEventId, type
        })
        pending.delete(number)
      })
    })

    const measure = measures[measureIndex]
    if (measure) measureStart += measureDurationTicks(measure)
  })

  if ([...pending.values()].some(marker => !marker.shift)) {
    throw new Error('MusicXML octave-shift stop에 대응하는 시작 표식이 없습니다.')
  }
  if (pending.size > 0) throw new Error('MusicXML octave-shift의 종료 표식이 없습니다.')

  return shifts.length > 0 ? shifts : undefined
}

function toOctaveShiftType(
  direction: 'up' | 'down',
  size: number
): NonNullable<Score['octaveShifts']>[number]['type'] {
  if (size !== 8 && size !== 15) throw new Error(`Unsupported MusicXML octave-shift size: ${size}`)
  if (direction === 'down') return size === 15 ? '15ma' : '8va'
  return size === 15 ? '15mb' : '8vb'
}

function octaveStopEventId(direction: XmlNode, measures: Measure[], target: number, startVoiceId: string): string {
  const staff = readOptionalInteger(direction, 'staff') ?? 1
  const stopVoiceId = readOptionalString(direction, 'voice') === undefined
    ? startVoiceId : readVoiceId(direction, staff)
  let measureStart = 0
  for (const measure of measures) {
    const end = measureStart + measureDurationTicks(measure)
    if (target > measureStart && target <= end) {
      const eventEndingHere = (voiceId: string) => measure.voices.find(voice => voice.id === voiceId)?.events.find(event =>
        event.type === 'note' && measureStart + event.position.tick + voiceEventDurationTicks(event, measure) === target)
      // Older files can give the direction a voice without an endpoint in
      // that voice. Retain the start voice fallback at the same exact time.
      const event = eventEndingHere(stopVoiceId) ??
        (stopVoiceId !== startVoiceId ? eventEndingHere(startVoiceId) : undefined)
      if (event) return event.id
      break
    }
    measureStart = end
  }
  throw new Error(`MusicXML octave-shift stop tick ${target} is not a supported note-end anchor.`)
}

function readDirectionTypes(direction: XmlNode): XmlNode[] {
  return toArray(direction['direction-type'] as XmlNode | XmlNode[] | undefined)
    .filter(
      (value): value is XmlNode =>
        Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    )
}

function findTempoWordsDirectionType(types: XmlNode[], metronomeType?: XmlNode): XmlNode | undefined {
  if (!metronomeType) return undefined
  // Older Studio files combined these two choices illegally. Keep reading
  // their label while writing separate, standard direction-type siblings.
  if (readOptionalString(metronomeType, 'words') !== undefined) return metronomeType
  // A mixed rehearsal/words/dynamics/metronome direction retains independent
  // staff words; it is not the paired tempo-label shape emitted by Studio.
  const paired = types.every(type => Object.keys(type).filter(key => !key.startsWith('@_'))
    .every(key => key === 'words' || key === 'metronome'))
  return paired ? types.find(type => readOptionalString(type, 'words') !== undefined) : undefined
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
  positionTick: number,
  xmlDurationTicks: number
): VoiceEvent {
  // Unsupported pitch representation must not be disguised as a missing
  // optional graphic type. Keep ordinary note/rest validation order intact.
  assertSupportedNotePitch(node)
  // A complete measure rest need not have a graphic <type>. Its duration is
  // the owning measure's actual length (including pickup), as in the existing
  // fullMeasure model.
  const untypedMeasureRest = 'rest' in node &&
    readOptionalNode(node, 'rest')?.['@_measure'] === 'yes' && !('type' in node)
  const duration: Duration = untypedMeasureRest ? { value: 'whole', dots: 0 } : readDuration(node, xmlDurationTicks)
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

  const pitch = readPitch(node)

  return createNote({
    id,
    position: createTimePosition(positionTick),
    pitch,
    duration,
    ties: readTieFlags(node),
    articulations: readArticulations(node),
    fermata: readFermata(node),
    breathMark: readBreathMark(node),
    tremolo: readTremolo(node),
    lyrics: readLyrics(node),
    ornaments: readOrnaments(node)
  })
}

function readSourceVoiceLabel(node: XmlNode): string {
  const label = readOptionalString(node, 'voice') ?? '1'
  if (!label) throw new Error('MusicXML의 voice 값이 비어 있습니다.')
  return label
}

function readNumericVoiceLabel(label: string): number | undefined {
  const number = Number(label)
  return /^\d+$/.test(label) && Number.isSafeInteger(number) && number > 0 ? number : undefined
}

function preferredStaffVoiceNumber(voice: number, staffNumber: number): number {
  return staffNumber > 1 && voice > 4 ? ((voice - 1) % 4) + 1 : voice
}

function indexStaffVoiceNumbers(measures: XmlNode[]): void {
  const staves = new Map<number, { nodes: XmlNode[]; noteVoices: Set<string> }>()
  for (const measure of measures) {
    const notes = toArray(measure.note as XmlNode | XmlNode[] | undefined)
    const directions = toArray(measure.direction as XmlNode | XmlNode[] | undefined)
    for (const [nodes, areNotes] of [[notes, true], [directions, false]] as const) {
      for (const node of nodes) {
        const staffNumber = readOptionalInteger(node, 'staff') ?? 1
        if (!areNotes && readOptionalString(node, 'voice') === undefined) continue
        let staff = staves.get(staffNumber)
        if (!staff) {
          staff = { nodes: [], noteVoices: new Set() }
          staves.set(staffNumber, staff)
        }
        staff.nodes.push(node)
        if (areNotes) staff.noteVoices.add(readSourceVoiceLabel(node))
      }
    }
  }

  for (const [staffNumber, { nodes, noteVoices }] of staves) {
    const voices = [...noteVoices].sort().map(label => ({ label, number: readNumericVoiceLabel(label) }))
      .sort((left, right) => (left.number ?? Infinity) - (right.number ?? Infinity) ||
        (left.number === undefined ? 0 : left.label.length - right.label.length))
    const assigned = new Map<string, number>()
    const occupied = new Set<number>()
    // Reserve the usual staff-local slots before filling gaps. A voice must
    // keep its identity even in measures where the other voice is absent.
    for (const { label, number } of voices) {
      if (number === undefined) continue
      const preferred = preferredStaffVoiceNumber(number, staffNumber)
      if (occupied.has(preferred)) continue
      assigned.set(label, preferred)
      occupied.add(preferred)
    }
    if (assigned.size === voices.length) continue
    let next = 1
    for (const { label } of voices) {
      if (assigned.has(label)) continue
      while (occupied.has(next)) next++
      assigned.set(label, next++)
    }
    for (const node of nodes) sourceStaffVoiceNumbers.set(node, assigned)
  }
}

function readVoiceId(node: XmlNode, staffNumber: number): string {
  const label = readSourceVoiceLabel(node)
  const mapped = sourceStaffVoiceNumbers.get(node)?.get(label)
  if (mapped !== undefined) return `voice-${mapped}`
  const number = readNumericVoiceLabel(label)
  if (number === undefined) throw new Error(`MusicXML에서 voice 참조와 일치하는 성부가 없습니다: ${label}`)
  return `voice-${preferredStaffVoiceNumber(number, staffNumber)}`
}

function compareVoiceIds(left: string, right: string): number {
  return readVoiceIdNumber(left) - readVoiceIdNumber(right) ||
    left.localeCompare(right)
}

function readVoiceIdNumber(voiceId: string): number {
  const match = /^voice-(\d+)$/.exec(voiceId)

  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

function assertSupportedNotePitch(node: XmlNode): void {
  if ('unpitched' in node) {
    throw new Error('현재 가져오기에서 지원하지 않는 무음정 음표입니다: unpitched')
  }
}

function readPitch(node: XmlNode): Pitch {
  assertSupportedNotePitch(node)
  const pitchNode = readNode(node, 'pitch')
  const step = readString(pitchNode, 'step').toUpperCase()

  if (!isPitchStep(step)) {
    throw new Error(`지원하지 않는 pitch step입니다: ${step}`)
  }

  const sourceAlter = readOptionalIntegralSemitones(pitchNode, 'alter')
  const alter = sourceAlter ?? (readOptionalString(node, 'accidental') === 'natural' ? 0 : undefined)

  if (
    alter !== undefined &&
    ![-2, -1, 0, 1, 2].includes(alter)
  ) {
    throw new Error(`지원하지 않는 alter 값입니다: ${alter}`)
  }

  return {
    step,
    octave: readInteger(pitchNode, 'octave'),
    alter: alter as -2 | -1 | 0 | 1 | 2 | undefined
  }
}

// A missing MusicXML alteration means natural. An undefined Studio alteration
// inherits from the voice, so pin a natural only when that would sound different.
function preserveImportedNaturals(events: VoiceEvent[], keySignature: KeySignature): void {
  const priorAlterations = new Map<string, NonNullable<Pitch['alter']>>()
  const preserveNatural = (pitch: Pitch): Pitch => {
    if (pitch.alter !== undefined) return pitch
    const inherited = priorAlterations.get(pitch.step + pitch.octave) ?? keySignatureAlter(keySignature, pitch.step)
    return inherited === 0 ? pitch : { ...pitch, alter: 0 }
  }

  for (const event of events) {
    if (event.type !== 'note') continue
    event.pitch = preserveNatural(event.pitch)
    event.pitches = event.pitches?.map(preserveNatural)
    event.graceNotes = event.graceNotes?.map(note => ({ ...note, pitch: preserveNatural(note.pitch) }))

    // Members of one event, including graces, all use the preceding context.
    // Only the main note or chord contributes accidentals to later events.
    for (const pitch of event.pitches ?? [event.pitch]) {
      if (pitch.alter !== undefined) priorAlterations.set(pitch.step + pitch.octave, pitch.alter)
    }
  }
}

function readGraceNote(node: XmlNode): GraceNote {
  const grace = readOptionalNode(node, 'grace')

  return {
    pitch: readPitch(node),
    slash: grace ? readOptionalString(grace, '@_slash') === 'yes' : undefined,
    ...('chord' in node ? { chord: true } : {})
  }
}

function readTremoloCandidates(node: XmlNode): unknown[] {
  return toArray(node.notations as XmlNode | XmlNode[] | undefined)
    .flatMap(notations => toArray(notations?.ornaments as XmlNode | XmlNode[] | undefined))
    .flatMap(ornaments => toArray(ornaments?.tremolo))
}

function readTremolo(node: XmlNode): TremoloMark | undefined {
  const candidates = readTremoloCandidates(node)

  // Keep the existing single-instruction model. Do not choose or merge
  // multiple instructions when their source containers happen to differ.
  if (candidates.length !== 1) {
    return undefined
  }

  // A mark with no attributes is a text scalar, not an XmlNode. MusicXML's
  // omitted type still means single and has the same supported-stroke checks.
  const candidate = candidates[0]
  const tremolo = candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    ? candidate as XmlNode : undefined
  const type = (tremolo ? readOptionalString(tremolo, '@_type') : undefined) ?? 'single'
  const marks = Number(tremolo ? readOptionalString(tremolo, '#text') : candidate)

  if (type !== 'single' || ![1, 2, 3].includes(marks)) {
    throw new Error(`지원하지 않는 tremolo 표시입니다: ${type} ${marks}`)
  }

  return {
    type: 'single',
    marks: marks as 1 | 2 | 3
  }
}

function readOrnaments(node: XmlNode): Extract<VoiceEvent, { type: 'note' }>['ornaments'] {
  const groups = toArray(node.notations as XmlNode | XmlNode[] | undefined)
    .flatMap(notations => toArray(notations?.ornaments as XmlNode | XmlNode[] | undefined))
    .filter(group => group && typeof group === 'object')
  const values: NonNullable<Extract<VoiceEvent, { type: 'note' }>['ornaments']> = []
  // Their array order is also their visible order in the renderer. Keep the
  // existing first-occurrence/deduplication policy across container boundaries.
  for (const group of groups) for (const key of Object.keys(group)) {
    const ornament = key === 'trill-mark' ? 'trill' : key
    if (ornament === 'trill' || ornament === 'mordent' || ornament === 'inverted-mordent' || ornament === 'turn') {
      if (!values.includes(ornament)) values.push(ornament)
    }
  }

  return values.length > 0 ? values : undefined
}

function readLyrics(node: XmlNode): Extract<VoiceEvent, { type: 'note' }>['lyrics'] {
  const lyrics = toArray(node.lyric as XmlNode | XmlNode[] | undefined).flatMap(
    (lyricNode) => {
      const text = readLyricText(lyricNode)

      if (!text) {
        return []
      }

      const syllabic = readOptionalString(lyricNode, 'syllabic')

      if (
        syllabic !== undefined &&
        !['single', 'begin', 'middle', 'end'].includes(syllabic)
      ) {
        throw new Error(`지원하지 않는 lyric syllabic 값입니다: ${syllabic}`)
      }

      return [
        {
          number: readOptionalInteger(lyricNode, '@_number'),
          syllabic: syllabic as 'single' | 'begin' | 'middle' | 'end' | undefined,
          text,
          extend: 'extend' in lyricNode ? true : undefined
        }
      ]
    }
  )

  return lyrics.length > 0 ? lyrics : undefined
}

function collectLyricFontWarnings(note: XmlNode, partNumber: number, measureNumber: number, eventIndex: number): MusicXmlImportWarning[] {
  const warnings: MusicXmlImportWarning[] = []
  toArray(note.lyric as XmlNode | XmlNode[] | undefined).forEach((lyric, lyricIndex) => {
    toArray(lyric.text as XmlNode | XmlNode[] | string | undefined).forEach((text, textIndex) => {
      if (typeof text !== 'object' || text === null || !readTextNode(text)) return
      for (const [attribute, lostValue] of [['font-style', 'italic'], ['font-weight', 'bold']] as const) {
        const value = readOptionalString(text, `@_${attribute}`)
        if (value !== lostValue) continue
        const facts = { lyricIndex: lyricIndex + 1, number: readOptionalString(lyric, '@_number'), textIndex: textIndex + 1, value }
        warnings.push({ code: 'unsupported-notation', partNumber, measureNumber, eventIndex,
          path: `part[${partNumber}].measure[${measureNumber}].note[${eventIndex}].lyric[${lyricIndex + 1}].text[${textIndex + 1}].@${attribute}`,
          message: `Unrepresented lyric ${attribute} ${JSON.stringify(facts)} is not retained by the current plain lyric model. Keep the original MusicXML and compare lyric content, formatting and re-export.` })
      }
    })
  })
  return warnings
}

function collectLyricElisionWarnings(note: XmlNode, partNumber: number, measureNumber: number, eventIndex: number): MusicXmlImportWarning[] {
  const warnings: MusicXmlImportWarning[] = []
  toArray(note.lyric as XmlNode | XmlNode[] | undefined).forEach((lyric, lyricIndex) => {
    if (!readLyricText(lyric)) return
    ;(sourceLyricElisions.get(lyric) ?? []).forEach((elision, index) => {
      // MusicXML gives text precedence over SMuFL. Neither means the existing
      // application-defined default, not an explicitly requested symbol.
      const source = elision.text.length > 0 ? 'text' : elision.smufl ? 'smufl' : undefined
      if (!source) return
      const value = source === 'text' ? elision.text : elision.smufl
      const facts = { lyricIndex: lyricIndex + 1, number: readOptionalString(lyric, '@_number'), elisionIndex: index + 1, source, value }
      warnings.push({ code: 'unsupported-notation', partNumber, measureNumber, eventIndex,
        path: `part[${partNumber}].measure[${measureNumber}].note[${eventIndex}].lyric[${lyricIndex + 1}].elision[${index + 1}]${source === 'smufl' ? '.@smufl' : ''}`,
        message: `Unrepresented lyric elision ${JSON.stringify(facts)} is not retained by the current plain lyric model. Keep the original MusicXML and compare lyric symbols and re-export.` })
    })
  })
  return warnings
}

function readLyricText(lyricNode: XmlNode): string | undefined {
  const sourceText = sourceLyricText.get(lyricNode)
  if (sourceText !== undefined) return sourceText
  const text = lyricNode.text
  const textParts = toArray(text as XmlNode | XmlNode[] | string | number | undefined)
    .map((textNode) => readTextNode(textNode))
    .filter((value): value is string => Boolean(value))

  if (textParts.length > 0) {
    return textParts.join(' ')
  }

  return readOptionalString(lyricNode, 'text')
}

function readTextNode(node: XmlNode | string | number): string | undefined {
  if (typeof node === 'string' || typeof node === 'number') {
    const text = String(node).trim()
    return text.length > 0 ? text : undefined
  }

  if ('#text' in node) {
    const text = String(node['#text']).trim()
    return text.length > 0 ? text : undefined
  }

  return undefined
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
  // This is the existing single Boolean/hold, even when editorial notation
  // containers repeat. Keep absence undefined and never multiply the hold.
  const present = toArray(node.notations as XmlNode | XmlNode[] | undefined)
    .some(notations => notations && typeof notations === 'object' &&
      !Array.isArray(notations) && 'fermata' in notations)
  return present ? true : undefined
}

function readArticulations(node: XmlNode): Articulation[] | undefined {
  const articulations = readNotationArticulations(node)

  if (!articulations) {
    return undefined
  }

  // The renderer stacks marks in model order, and the serializer emits that
  // order. Keep supported source tags in place so a safe save does not reorder
  // the stack or fail the existing round-trip signature check.
  const values: Articulation[] = []
  for (const name of Object.keys(articulations)) {
    if (name === 'strong-accent') {
      const marks = toArray(articulations[name] as XmlNode | XmlNode[] | undefined)
      if (marks.some(mark => ['up', undefined].includes(readOptionalString(mark, '@_type'))) && !values.includes('marcato')) values.push('marcato')
    } else if ((name === 'staccato' || name === 'accent' || name === 'tenuto' || name === 'marcato') && !values.includes(name)) {
      // Keep the legacy nonstandard tag readable, but emit only MusicXML's
      // strong-accent tag on the next save. Aliases must not duplicate marks.
      values.push(name)
    }
  }

  return values.length > 0 ? values : undefined
}

function readNotationArticulations(node: XmlNode): XmlNode | undefined {
  const groups = toArray(node.notations as XmlNode | XmlNode[] | undefined)
    .flatMap(notations => toArray(notations.articulations as XmlNode | XmlNode[] | undefined))
    .filter(group => group && typeof group === 'object')
  if (groups.length <= 1) return groups[0]

  // MusicXML permits multiple notation/editorial containers. Retain the first
  // occurrence order of the existing model's marks, including all strong-accent
  // candidates, so a later unsupported variant cannot erase an earlier one.
  const elements = new Map<string, unknown[]>()
  for (const group of groups) for (const [name, value] of Object.entries(group)) {
    elements.set(name, [...(elements.get(name) ?? []), ...toArray(value)])
  }
  return Object.fromEntries([...elements].map(([name, values]) =>
    [name, values.length === 1 ? values[0] : values]))
}

function readNotationTieNodes(node: XmlNode): XmlNode[] {
  return toArray(node.notations as XmlNode | XmlNode[] | undefined)
    .flatMap(notations => toArray(notations?.tied as XmlNode | XmlNode[] | undefined))
}

function readTieFlags(node: XmlNode) {
  const directTypes = toArray(
    node.tie as XmlNode | XmlNode[] | undefined
  ).map((tie) => readOptionalString(tie, '@_type'))
  const notationTypes = readNotationTieNodes(node)
    .map((tie) => readOptionalString(tie, '@_type'))
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

function readDuration(node: XmlNode, ticks: number): Duration {
  const type = 'type' in node ? readString(node, 'type') : undefined
  if (type !== undefined && !isDurationValue(type)) {
    throw new Error(`지원하지 않는 note type입니다: ${type}`)
  }

  const dots = toArray(node.dot as XmlNode | XmlNode[] | undefined).length
  const timeModification = readOptionalNode(node, 'time-modification')
  const tuplet = timeModification ? {
    actualNotes: readInteger(timeModification, 'actual-notes'),
    normalNotes: readInteger(timeModification, 'normal-notes')
  } : undefined

  const unscaledTicks = tuplet ? ticks * tuplet.actualNotes / tuplet.normalNotes : ticks
  const value = type ?? supportedDurationValues.find(value => durationToTicks({ value, dots }) === unscaledTicks)
  if (value === undefined) {
    throw new Error(`MusicXML type이 생략된 duration을 지원하는 음가로 표현할 수 없습니다: ${ticks} tick, 점 ${dots}개`)
  }
  return { value, dots, ...(tuplet ? { tuplet } : {}) }
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
      if (!active || active.eventIds.length === 0) {
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
  return new Set(
    toArray(node.notations as XmlNode | XmlNode[] | undefined)
      .flatMap(notations => toArray(notations?.tuplet as XmlNode | XmlNode[] | undefined))
      .map(tuplet => readOptionalString(tuplet, '@_type'))
  )
}

function createPartMeasureState(): PartMeasureState {
  return {
    clefs: new Map([[1, { ...defaultMeasureState.clef }]]),
    transpositions: new Map(),
    keySignatures: new Map(),
    timeSignatures: new Map(),
    keySignature: { ...defaultMeasureState.keySignature },
    staffCount: 1,
    timeSignature: { ...defaultMeasureState.timeSignature }
  }
}

function readPartMeasureState(
  attributes: XmlNode,
  previous: PartMeasureState,
  staffCount: number
): PartMeasureState {
  const clefs = new Map(previous.clefs)
  const transpositions = new Map(previous.transpositions)
  const keys = readPartKeys(toArray(attributes.key as XmlNode | XmlNode[] | undefined), previous, staffCount)
  const meters = readPartMeters(toArray(attributes.time as XmlNode | XmlNode[] | undefined), previous, staffCount)
  for (const node of toArray(attributes.transpose as XmlNode | XmlNode[] | undefined)) {
    const transposition = readInstrumentTransposition(node)
    for (const staff of scopedAttributeStaves(node, staffCount)) {
      transpositions.set(staff, transposition)
    }
  }

  for (const { node, staffNumber } of readNumberedClefNodes(attributes)) {
    validateStaffNumber(staffNumber, staffCount)
    clefs.set(staffNumber, readClef(node))
  }

  for (let staffNumber = 1; staffNumber <= staffCount; staffNumber += 1) {
    if (!clefs.has(staffNumber)) {
      clefs.set(staffNumber, { ...defaultMeasureState.clef })
    }
  }

  return {
    clefs,
    transpositions,
    ...keys,
    ...meters,
    staffCount
  }
}

type PartKeyState = Pick<PartMeasureState, 'keySignature' | 'keySignatures'>

function readPartKeys(keys: XmlNode[], previous: PartKeyState, staffCount: number): PartKeyState {
  const keySignatures = new Map(previous.keySignatures)
  let keySignature = previous.keySignature
  for (const key of keys) {
    const staves = scopedAttributeStaves(key, staffCount)
    const value = readKeySignature(key)
    // The unnumbered key is also the default for a staff introduced later.
    if (readOptionalInteger(key, '@_number') === undefined) keySignature = value
    for (const staff of staves) keySignatures.set(staff, value)
  }
  return { keySignature, keySignatures }
}

type PartMeterState = Pick<PartMeasureState, 'timeSignature' | 'timeSignatures'>

function readPartMeters(times: XmlNode[], previous: PartMeterState, staffCount: number): PartMeterState {
  const timeSignatures = new Map(previous.timeSignatures)
  let timeSignature = previous.timeSignature
  for (const time of times) {
    const staves = scopedAttributeStaves(time, staffCount)
    const value = readTimeSignature(time)
    if (readOptionalInteger(time, '@_number') === undefined) timeSignature = value
    for (const staff of staves) timeSignatures.set(staff, value)
  }
  return { timeSignature, timeSignatures }
}

function readInstrumentTransposition(node: XmlNode): NonNullable<Measure['transposition']> {
  const chromatic = readOptionalIntegralSemitones(node, 'chromatic')
  if (chromatic === undefined || 'double' in node) {
    throw new Error('MusicXML transpose: chromatic is required; doubled instruments are not supported.')
  }
  return {
    chromatic,
    diatonic: readOptionalInteger(node, 'diatonic'),
    octaveChange: readOptionalInteger(node, 'octave-change')
  }
}

function scopedAttributeStaves(node: XmlNode, staffCount: number): number[] {
  const number = readOptionalInteger(node, '@_number')
  if (number === undefined) return Array.from({ length: staffCount }, (_, index) => index + 1)
  validateStaffNumber(number, staffCount)
  return [number]
}

function isClosingStaffAttribute(
  staves: number[], state: PartMeasureState, tick: number, pickupDuration: number | undefined
): boolean {
  // A shared update must be at the boundary on every staff it addresses.
  return staves.every(staff => tick === (pickupDuration ??
    timeSignatureDurationTicks(state.timeSignatures.get(staff) ?? state.timeSignature)))
}

function readClosingStaffSettings(
  blocks: XmlNode[], state: PartMeasureState, pickupDuration: number | undefined,
  element: 'key' | 'time', validate: (node: XmlNode) => unknown
): Set<XmlNode> {
  const closing = new Set<XmlNode>()
  for (const attributes of blocks) {
    const tick = directionTicks.get(attributes) ?? 0
    if (tick <= 0) continue
    for (const node of toArray(attributes[element] as XmlNode | XmlNode[] | undefined)) {
      try {
        const staves = scopedAttributeStaves(node, state.staffCount)
        if (!isClosingStaffAttribute(staves, state, tick, pickupDuration)) continue
        validate(node)
        closing.add(node)
      } catch {
        // Unsupported positioned settings remain visible in the import report.
      }
    }
  }
  return closing
}

type PositionedTransposition = {
  node: XmlNode
  tick: number
  staves: number[]
  value: NonNullable<Measure['transposition']>
  closing: boolean
}

function readPositionedTranspositions(
  blocks: XmlNode[], state: PartMeasureState, pickupDuration: number | undefined
): PositionedTransposition[] {
  const changes: PositionedTransposition[] = []
  for (const attributes of blocks) {
    const tick = directionTicks.get(attributes) ?? 0
    if (tick <= 0) continue
    for (const node of toArray(attributes.transpose as XmlNode | XmlNode[] | undefined)) {
      const staves = scopedAttributeStaves(node, state.staffCount)
      changes.push({
        node, tick, staves,
        value: readInstrumentTransposition(node),
        closing: isClosingStaffAttribute(staves, state, tick, pickupDuration)
      })
    }
  }
  return changes.sort((left, right) => left.tick - right.tick)
}

export const inexactPositionedTranspositionPrefix = '마디 안 이조를 정확히 보존할 수 없습니다: '

function validatePositionedTranspositions({
  changes, noteNodes, state, openingTranspositions, partId, partName, measureNumber, hasNextMeasure
}: {
  changes: PositionedTransposition[]
  noteNodes: XmlNode[]
  state: PartMeasureState
  openingTranspositions: PartMeasureState['transpositions']
  partId: string
  partName: string
  measureNumber: number
  hasNextMeasure: boolean
}): PartMeasureState['transpositions'] {
  const following = new Map(state.transpositions)
  const semitones = (value: Measure['transposition']) =>
    (value?.chromatic ?? 0) + 12 * (value?.octaveChange ?? 0)

  for (let staff = 1; staff <= state.staffCount; staff++) {
    const staffChanges = changes.filter(change => change.staves.includes(staff))
    if (!staffChanges.length) continue
    const pitches = noteNodes.flatMap(note => {
      const tick = sourcePitchedNoteTicks.get(note)
      return tick !== undefined && readStaffNumber(note, state.staffCount) === staff ? [tick] : []
    }).sort((left, right) => left - right)
    const importedShift = semitones(state.transpositions.get(staff))
    let cursor = 0
    let active = openingTranspositions.get(staff)
    let previousShift = semitones(active)
    for (const tick of pitches) {
      while (cursor < staffChanges.length && staffChanges[cursor].tick <= tick) {
        previousShift = semitones(active)
        active = staffChanges[cursor++].value
      }
      if (semitones(active) === importedShift) continue

      const change = staffChanges[Math.max(0, cursor - 1)]
      const before = cursor === 0 ? semitones(active) : previousShift
      const beats = change.tick / TICKS_PER_QUARTER
      throw new Error(inexactPositionedTranspositionPrefix +
        `${partName} (${partId}), ${measureNumber}마디 ${staff}보표, ${beats}박 경과, 이조 ${before} → ${semitones(change.value)}반음`)
    }
    following.set(staff, staffChanges[staffChanges.length - 1].value)
  }
  if (hasNextMeasure) {
    for (const change of changes) {
      if (change.closing) importedClosingTranspositions.add(change.node)
    }
  }
  return following
}

function readLeadingRestTranspositions(
  changes: PositionedTransposition[], measure: XmlNode, state: PartMeasureState, pickupDuration: number | undefined
): PartMeasureState['transpositions'] {
  const result: PartMeasureState['transpositions'] = new Map()
  // This projection relies on explicit rests. A forward gap is not imported
  // as a rest at that position by the current voice reader.
  if ('forward' in measure) return result

  const positioned = changes.filter(change => !change.closing)
  if (!positioned.length) return result
  const changesPerStaff = new Map<number, number>()
  for (const { staves } of positioned) {
    for (const staff of staves) changesPerStaff.set(staff, (changesPerStaff.get(staff) ?? 0) + 1)
  }

  const firstPitchByStaff = new Map<number, number>()
  for (const note of toArray(measure.note as XmlNode | XmlNode[] | undefined)) {
    const tick = sourcePitchedNoteTicks.get(note)
    if (tick === undefined) continue
    const staff = readStaffNumber(note, state.staffCount)
    firstPitchByStaff.set(staff, Math.min(tick, firstPitchByStaff.get(staff) ?? Infinity))
  }
  // The current harmony model stores chords at measure level, without staff ownership.
  const firstHarmonyTick = toArray(measure.harmony as XmlNode | XmlNode[] | undefined)
    .reduce((first, node) => Math.min(first, directionTicks.get(node) ?? -1), Infinity)
  for (const { node, tick, staves, value } of positioned) {
    if (firstHarmonyTick < tick || !staves.every(staff =>
      changesPerStaff.get(staff) === 1 &&
      (firstPitchByStaff.get(staff) ?? -1) >= tick &&
      tick < (pickupDuration ?? timeSignatureDurationTicks(state.timeSignatures.get(staff) ?? state.timeSignature))
    )) continue

    for (const staff of staves) result.set(staff, value)
    relocatedLeadingRestTranspositions.add(node)
  }
  return result
}

function readNumberedClefNodes(attributes: XmlNode): { node: XmlNode; staffNumber: number }[] {
  const nodes = toArray(attributes.clef as XmlNode | XmlNode[] | undefined)
  return nodes.map((node, index) => ({
    node,
    staffNumber: readOptionalInteger(node, '@_number') ?? (nodes.length > 1 ? index + 1 : 1)
  }))
}

const pitchedClefSigns = new Set(['G', 'F', 'C'])

function readDeferredPitchedClefs(
  blocks: XmlNode[],
  openingClefs: ReadonlyMap<number, Clef>,
  staffCount: number
): Map<number, Clef> {
  const changes = new Map<number, { tick: number; node: XmlNode }>()
  for (const attributes of blocks) {
    const tick = directionTicks.get(attributes) ?? 0
    if (tick <= 0) continue
    for (const { node, staffNumber } of readNumberedClefNodes(attributes)) {
      // A backup can make source order differ from musical order.
      if (staffNumber >= 1 && staffNumber <= staffCount && tick >= (changes.get(staffNumber)?.tick ?? 0)) {
        changes.set(staffNumber, { tick, node })
      }
    }
  }

  const deferred = new Map<number, Clef>()
  for (const [staffNumber, { node }] of changes) {
    const opening = openingClefs.get(staffNumber) ?? defaultMeasureState.clef
    // Regular pitched clefs do not switch a staff into or out of MIDI export.
    const sign = readOptionalString(node, 'sign')
    if (sign && pitchedClefSigns.has(opening.sign) && pitchedClefSigns.has(sign)) {
      deferred.set(staffNumber, readClef(node))
    }
  }
  return deferred
}

type XmlDecimal = { text: string; units: bigint; scale: bigint }

function readXmlDecimal(text: string): XmlDecimal | undefined {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return undefined
  const [whole, fractional = ''] = text.split('.')
  const digits = fractional.replace(/0+$/, '')
  return {
    text,
    units: BigInt(whole + digits),
    scale: 10n ** BigInt(digits.length)
  }
}

function readDivisions(attributes: XmlNode, previous: XmlDecimal): XmlDecimal {
  const text = readOptionalString(attributes, 'divisions')
  if (text === undefined) return previous
  const value = readXmlDecimal(text)
  if (!value) throw new Error('MusicXML 소수 값이 올바르지 않습니다: divisions')
  if (value.units <= 0n) throw new Error(`MusicXML divisions는 0보다 커야 합니다: ${text}`)
  return value
}

function exactMusicXmlTicks(value: XmlDecimal, divisions: XmlDecimal): number | undefined {
  // Work in source decimal units. A rounded Number can both invent and hide fractional ticks.
  const numerator = value.units * divisions.scale * BigInt(TICKS_PER_QUARTER)
  const denominator = value.scale * divisions.units
  if (numerator % denominator !== 0n) return undefined
  const ticks = Number(numerator / denominator)
  return Number.isSafeInteger(ticks) ? ticks : undefined
}

function readMusicXmlDurationTicks(node: XmlNode, divisions: XmlDecimal): number {
  const text = readString(node, 'duration')
  const value = readXmlDecimal(text)
  if (!value) throw new Error('MusicXML 소수 값이 올바르지 않습니다: duration')
  const ticks = exactMusicXmlTicks(value, divisions)
  if (ticks === undefined || ticks <= 0) {
    throw new Error(
      `MusicXML duration을 정수 tick으로 변환할 수 없습니다: ${text}/${divisions.text}`
    )
  }
  return ticks
}

function readMusicXmlOffsetTick(cursor: number, text: string | undefined, divisions: XmlDecimal, message: string): number {
  const value = text === undefined ? undefined : readXmlDecimal(text)
  const offset = text === undefined ? 0 : value && exactMusicXmlTicks(value, divisions)
  if (offset === undefined) throw new Error(message)
  const tick = cursor + offset
  if (!Number.isSafeInteger(tick) || tick < 0) throw new Error(message)
  return tick
}

const defaultClefLines = { G: 2, F: 4, C: 3, percussion: 2 } as const

function readClef(node: XmlNode): Clef {
  const sign = readString(node, 'sign') as keyof typeof defaultClefLines
  if (!Object.hasOwn(defaultClefLines, sign)) {
    throw new Error(`지원하지 않는 clef sign입니다: ${sign}`)
  }

  return {
    sign,
    // MusicXML permits omission. Use the standard line for the clef family.
    line: 'line' in node ? readInteger(node, 'line') : defaultClefLines[sign],
    octaveChange: readOptionalInteger(node, 'clef-octave-change')
  }
}

function readKeySignature(node: XmlNode): KeySignature {
  if (!('fifths' in node) && 'key-step' in node) {
    throw new Error(`현재 가져오기에서 지원하지 않는 비전통 조표입니다: ${JSON.stringify({ 'key-step': node['key-step'], 'key-alter': node['key-alter'] })}`)
  }
  const mode = readOptionalString(node, 'mode')

  if (mode && !isKeyMode(mode)) {
    throw new Error(`지원하지 않는 key mode입니다: ${mode}`)
  }

  const key: KeySignature = {
    fifths: readInteger(node, 'fifths'),
    mode: mode && isKeyMode(mode) ? mode : undefined
  }
  // Resolve a closing key's owner before checking the editor's range. A key
  // placed after the final measure is reported as a position loss as usual.
  if (Math.abs(key.fifths) > 7) unsupportedKeyFifths.set(key, readString(node, 'fifths'))
  return key
}

function readTimeSignature(node: XmlNode): TimeSignature {
  const beats = node.beats
  const beatType = node['beat-type']
  const hasDistinctPairs = Array.isArray(beats) && Array.isArray(beatType) &&
    beats.length > 1 && beats.length === beatType.length
  const hasGroupedNumerator = /^\d+(?:\s*\+\s*\d+)+$/.test(readOptionalString(node, 'beats') ?? '')
  if (hasDistinctPairs || hasGroupedNumerator) {
    throw new Error(`현재 가져오기에서 지원하지 않는 묶음 박자표입니다: ${JSON.stringify({ beats, beatType })}`)
  }

  return {
    beats: readInteger(node, 'beats'),
    beatType: readInteger(node, 'beat-type')
  }
}

function readStaffCount(attributes: XmlNode, previous: number): number {
  const staffCount = readOptionalInteger(attributes, 'staves') ?? previous

  if (staffCount <= 0) {
    throw new Error(`MusicXML staves는 1 이상이어야 합니다: ${staffCount}`)
  }

  return staffCount
}

function readStaffNumber(node: XmlNode, staffCount: number): number {
  const staffNumber = readOptionalInteger(node, 'staff') ?? 1

  validateStaffNumber(staffNumber, staffCount)
  return staffNumber
}

function validateStaffNumber(staffNumber: number, staffCount: number): void {
  if (staffNumber < 1 || staffNumber > staffCount) {
    throw new Error(
      `MusicXML staff ${staffNumber}는 선언된 staff 수 ${staffCount} 범위를 벗어납니다.`
    )
  }
}

function musicXmlVoiceKey(staffNumber: number, voiceId: string): string {
  return `${staffNumber}:${voiceId}`
}

function readVoiceIdFromMusicXmlVoiceKey(voiceKey: string): string {
  return voiceKey.slice(voiceKey.indexOf(':') + 1)
}

function createImportedMeasureId(
  partId: string,
  staffNumber: number,
  measureNumber: number,
  preserveLegacyId: boolean
): string {
  return preserveLegacyId
    ? `measure-${measureNumber}`
    : `${partId}-staff-${staffNumber}-measure-${measureNumber}`
}

function createImportedEventId(
  partId: string,
  staffNumber: number,
  eventNumber: number,
  preserveLegacyId: boolean
): string {
  return preserveLegacyId
    ? `event-${eventNumber}`
    : `${partId}-staff-${staffNumber}-event-${eventNumber}`
}

function withImportedEventId(event: VoiceEvent, id: string): VoiceEvent {
  return {
    ...event,
    id
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
    // The document guard already checked syntax and the single actual root.
    // Timewise is valid MusicXML, but this importer only reads partwise scores.
    if (key === 'score-partwise' && Object.hasOwn(node, 'score-timewise')) {
      throw new Error('현재 가져오기에서 지원하지 않는 MusicXML 형식입니다: score-timewise')
    }
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

  if (!/^[+-]?\d+$/.test(value)) {
    throw new Error(`MusicXML 정수 값이 올바르지 않습니다: ${key}`)
  }

  const number = Number(value)

  if (!Number.isSafeInteger(number)) {
    throw new Error(`MusicXML 정수 값이 올바르지 않습니다: ${key}`)
  }

  return number
}

// MusicXML uses xs:decimal for semitones. Check the source digits before
// conversion so a value just below or above an integer is never rounded in.
function readOptionalIntegralSemitones(node: XmlNode, key: string): number | undefined {
  const value = readOptionalString(node, key)
  if (value === undefined) return undefined

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
    throw new Error(`MusicXML 정수 값이 올바르지 않습니다: ${key}`)
  }
  const fractionalDigits = value.split('.')[1]
  if (fractionalDigits && /[1-9]/.test(fractionalDigits)) {
    throw new Error(`현재 가져오기에서 지원하지 않는 미분음입니다: ${key}=${value}`)
  }
  const number = Number(value)
  if (!Number.isSafeInteger(number)) {
    throw new Error(`MusicXML 정수 값이 올바르지 않습니다: ${key}`)
  }
  return number === 0 ? 0 : number
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
  // The authoring control's 40–240 integer range must not rewrite an imported
  // value already supported by the native tempo model (positive, finite, <=1000).
  // Keep the existing fallback for values outside that model; this does not
  // extend the UI range or the separately guarded direct-measure sound reader.
  if (Number.isFinite(value) && value > 0 && value <= 1000) return value
  return Math.min(240, Math.max(40, Math.round(value)))
}

// These display directives do not replace the formal name used by the model.
// Report each lost directive, including empty or hidden ones, without inventing
// a flattened mixed-content order or modifying instrument inference.
function collectPartNameDisplayWarnings(
  definition: XmlNode, path: string, partNumber: number, measureNumber?: number
): MusicXmlImportWarning[] {
  // Legacy formal-label attributes remain valid MusicXML. They do not survive
  // in the string-only model either. An explicit visibility default alone is
  // equivalent to omission; keep it quiet while retaining explicit zero offsets.
  const formalWarnings = (['part-name', 'part-abbreviation'] as const).flatMap(field => {
    const label = definition[field]
    if (typeof label !== 'object' || label === null) return []
    const attributes = Object.fromEntries([
      'default-x', 'default-y', 'relative-x', 'relative-y',
      'font-family', 'font-style', 'font-size', 'font-weight',
      'color', 'justify', 'print-object'
    ].flatMap(attribute => {
      const value = readOptionalString(label as XmlNode, `@_${attribute}`)
      return value === undefined || (attribute === 'print-object' && value === 'yes')
        ? [] : [[attribute, value]]
    }))
    if (Object.keys(attributes).length === 0) return []
    return [{ code: 'unsupported-notation' as const, partNumber,
      path: `${path}.${field}`,
      message: `Unrepresented part name display ${JSON.stringify({field, attributes})} is not retained by the current formal name/abbreviation model. Keep the original MusicXML and compare part labels and re-export. This notice does not restore display content or formatting.` }]
  })
  return [...formalWarnings, ...(['part-name-display', 'part-abbreviation-display'] as const).flatMap(field => {
    if (!Object.prototype.hasOwnProperty.call(definition, field)) return []
    const value = definition[field]
    const display = typeof value === 'object' && value !== null ? value as XmlNode : {}
    const facts = {
      field,
      printObject: readOptionalString(display, '@_print-object') ?? 'yes',
      displayText: toArray(display['display-text']),
      accidentalText: toArray(display['accidental-text'])
    }
    return [{ code: 'unsupported-notation' as const, partNumber,
      ...(measureNumber === undefined ? {} : { measureNumber }), path: `${path}.${field}`,
      message: `Unrepresented part name display ${JSON.stringify(facts)} is not retained by the current formal name/abbreviation model. Keep the original MusicXML and compare part labels and re-export. This notice does not restore display content or formatting.` }]
  })]
}

function collectUnsupportedMusicXmlWarnings(
  root: XmlNode,
  score: Score
): MusicXmlImportWarning[] {
  const warnings: MusicXmlImportWarning[] = [...readMusicXmlPageDefaults(root).warnings, ...collectCreditImageWarnings(root), ...collectRightsNoticeWarnings(root), ...collectCreditContentWarnings(root), ...collectCreatorMetadataWarnings(root), ...collectWorkMovementMetadataWarnings(root),
    ...readGlobalSwingPlayback(toArray(root.part as XmlNode | XmlNode[] | undefined)).warnings]
  if (score.swingPlayback && globalSwingPlaybackUnavailableReason(score)) warnings.push({
    code: 'unsupported-direction', path: 'score.swingPlayback',
    message: 'Swing playback setting retained but staff meters or lengths differ. Playback stays straight. Keep the original MusicXML and compare playback.'
  })
  const parts = toArray(root.part as XmlNode | XmlNode[] | undefined)
  const partList = readOptionalNode(root, 'part-list')
  const scoreParts = toArray(partList?.['score-part'] as XmlNode | XmlNode[] | undefined)
  const repeatStaff = scoreRepeatSource(score)
  const unresolvedEnds = repeatStaff ? inspectAlternativeEndingRepeats(repeatStaff.measures).unresolvedEnds : undefined
  const repeatStarts = repeatStaff?.measures.filter(measure => measure.repeat?.start) ?? []
  const repeatEnds = repeatStaff?.measures.filter(measure => measure.repeat?.end) ?? []
  const repeatStartIndex = repeatStaff && repeatStarts.length ? repeatStaff.measures.indexOf(repeatStarts[0]) : 0
  const repeatEndIndex = repeatStaff?.measures.indexOf(repeatEnds[0]) ?? -1
  // A single closed repeat owns the passes from its start onward. Other
  // layouts can have more than one owner for an ending.
  const simpleRepeatCount = repeatStarts.length <= 1 && repeatEnds.length === 1 && repeatEndIndex >= repeatStartIndex
    ? Math.max(2, repeatEnds[0].repeat?.times ?? 2)
    : undefined

  // The score model retains parts/staves, not source grouping. One start
  // describes one lost group; stop children are ignored by MusicXML and must
  // not produce a duplicate diagnostic or an invented owning part/measure.
  toArray(partList?.['part-group'] as XmlNode | XmlNode[] | undefined).forEach((group, index) => {
    if (readOptionalString(group, '@_type') !== 'start') return
    const source = {
      number: readOptionalString(group, '@_number') ?? '1',
      name: readOptionalString(group, 'group-name'),
      abbreviation: readOptionalString(group, 'group-abbreviation'),
      symbol: readOptionalString(group, 'group-symbol'),
      barline: readOptionalString(group, 'group-barline')
    }
    warnings.push({ code: 'unsupported-notation', path: `part-list.part-group[${index + 1}]`,
      message: `Unrepresented part-group ${JSON.stringify(source)} is not retained by the current parts/staves model. Keep the original MusicXML and compare grouping and re-export. This notice does not restore brackets or braces.` })
  })

  parts.forEach((partNode,partIndex) => {
    const partId = readOptionalString(partNode, '@_id') ?? `part-${partIndex + 1}`
    const normalized = normalizedPartMeasureNumbers.get(partNode)
    if (normalized) warnings.push({
      code: 'unsupported-notation', partNumber: partIndex + 1, path: `part[${partIndex + 1}]`,
      message: `Source measure identifiers normalized to internal order (${JSON.stringify(normalized)}). Original displayed numbers are not preserved. Keep the original MusicXML and compare measure labels and re-export.`
    })
    const definition = findScorePartDefinition(partId, scoreParts, partIndex)
    if (definition.node) {
      warnings.push(...collectPartNameDisplayWarnings(definition.node,
        `part-list.score-part[${definition.index + 1}]`, partIndex + 1))
      warnings.push(...collectMidiInstrumentWarnings(definition.node,
        `part-list.score-part[${definition.index + 1}]`, partIndex + 1))
    }
    const measureNodes = toArray(
      partNode.measure as XmlNode | XmlNode[] | undefined
    )

    const ownsRepeats = repeatStaff !== undefined && score.parts[partIndex]?.staves.includes(repeatStaff)
    const repeatCount = ownsRepeats ? simpleRepeatCount : undefined
    let sourceStaffCount = 1
    measureNodes.forEach((measureNode, measureIndex) => {
      const firstWarning = warnings.length
      const measureNumber =
        readSourceMeasureNumber(measureNode, measureIndex)
      const noteNodes = toArray(
        measureNode.note as XmlNode | XmlNode[] | undefined
      )
      const directions = toArray(
        measureNode.direction as XmlNode | XmlNode[] | undefined
      )

      const sourcePickupTicks = sourceForwardPickupTicks.get(measureNode)
      const importedTiming = score.parts[partIndex]?.staves[0]?.measures[measureIndex]?.timing
      if (sourcePickupTicks !== undefined && importedTiming?.type === 'pickup' &&
          sourcePickupTicks > importedTiming.durationTicks) {
        const source = { sourceTicks: sourcePickupTicks, importedTicks: importedTiming.durationTicks }
        warnings.push({
          code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
          path: `part[${partIndex + 1}].measure[${measureNumber}].forward`,
          message: `Unrepresented pickup forward duration ${JSON.stringify(source)}. The imported pickup is shorter. Keep the original MusicXML and compare playback timing and re-export.`
        })
      }

      warnings.push(...collectFiguredBassWarnings(measureNode, partIndex + 1, measureNumber))
      warnings.push(...collectMeasureNumberAppearanceWarnings(measureNode, partIndex + 1, measureNumber))
      toArray(measureNode.print as XmlNode | XmlNode[] | undefined).forEach((print, printIndex) => {
        warnings.push(...collectPartNameDisplayWarnings(print,
          `part[${partIndex + 1}].measure[${measureNumber}].print[${printIndex + 1}]`,
          partIndex + 1, measureNumber))
      })

      // Labels/root/kind/bass survive independently of unrepresented degrees
      // and diagrams. Hidden degrees still carry structure not held by text.
      toArray(measureNode.harmony as XmlNode | XmlNode[] | undefined).forEach((harmony, harmonyIndex) => {
        if (readOptionalString(harmony, '@_print-object') === 'no') {
          warnings.push({code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
            path: `part[${partIndex + 1}].measure[${measureNumber}].harmony[${harmonyIndex + 1}]`,
            message: 'Unrepresented harmony visibility (print-object="no"). Hidden chord symbols may appear in Studio and re-export. Keep the original MusicXML and compare notation and output.'})
        }
        const kinds = toArray(harmony.kind as XmlNode | XmlNode[] | undefined)
        if (kinds.length > 1) {
          const roots = toArray(harmony.root as XmlNode | XmlNode[] | undefined)
          warnings.push({code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
            path: `part[${partIndex + 1}].measure[${measureNumber}].harmony[${harmonyIndex + 1}]`,
            message: `Unrepresented stacked harmony (chords="${kinds.length}", roots="${roots.map(root => readOptionalString(root, 'root-step') ?? '').join(',')}", root-alters="${roots.map(root => readOptionalString(root, 'root-alter') ?? '0').join(',')}", kinds="${kinds.map(kind => readOptionalString({kind}, 'kind') ?? '').join(',')}", arrangement="${readOptionalString(harmony, '@_arrangement') ?? 'unspecified'}"). Keep the original MusicXML and compare chord structure and re-export.`})
        }
        // Relative anchors cannot be recovered from an opaque display label.
        // Report them without inventing an absolute pitch or changing export's guard.
        toArray(harmony.function as XmlNode | XmlNode[] | undefined).forEach((value, index) => {
          warnings.push({code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
            path: `part[${partIndex + 1}].measure[${measureNumber}].harmony[${harmonyIndex + 1}].function[${index + 1}]`,
            message: `Unrepresented relative harmony (element="function", value="${readOptionalString({value}, 'value') ?? ''}"). Keep the original MusicXML and compare harmonic context and re-export.`})
        })
        toArray(harmony.numeral as XmlNode | XmlNode[] | undefined).forEach((numeral, index) => {
          warnings.push({code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
            path: `part[${partIndex + 1}].measure[${measureNumber}].harmony[${harmonyIndex + 1}].numeral[${index + 1}]`,
            message: `Unrepresented relative harmony (element="numeral", root="${readOptionalString(numeral, 'numeral-root') ?? ''}", text="${readOptionalString(numeral, 'numeral-root', '@_text') ?? ''}", alter="${readOptionalString(numeral, 'numeral-alter') ?? ''}", fifths="${readOptionalString(numeral, 'numeral-key', 'numeral-fifths') ?? ''}", mode="${readOptionalString(numeral, 'numeral-key', 'numeral-mode') ?? ''}"). Keep the original MusicXML and compare harmonic context and re-export.`})
        })
        toArray(harmony.degree as XmlNode | XmlNode[] | undefined).forEach((degree, degreeIndex) => {
          warnings.push({code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
            path: `part[${partIndex + 1}].measure[${measureNumber}].harmony[${harmonyIndex + 1}].degree[${degreeIndex + 1}]`,
            message: `Unrepresented chord degree (value="${readOptionalString(degree, 'degree-value') ?? ''}", alter="${readOptionalString(degree, 'degree-alter') ?? ''}", type="${readOptionalString(degree, 'degree-type') ?? ''}", print-object="${readOptionalString(degree, '@_print-object') ?? 'yes'}"). Keep the original MusicXML and compare chord structure and re-export.`})
        })
        const frame = readOptionalNode(harmony, 'frame')
        if (!frame) return
        warnings.push({code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
          path: `part[${partIndex + 1}].measure[${measureNumber}].harmony[${harmonyIndex + 1}].frame`,
          message: `Unrepresented fretboard diagram (strings="${readOptionalString(frame, 'frame-strings') ?? ''}", frets="${readOptionalString(frame, 'frame-frets') ?? ''}", first-fret="${readOptionalString(frame, 'first-fret') ?? '1'}", print-frame="${readOptionalString(harmony, '@_print-frame') ?? 'yes'}"). Keep the original MusicXML and compare chord diagrams and re-export.`})
      })

      // Repeat flags determine the supported repeat appearance. Other explicit
      // bar styles have no native field; report the loss without changing notes.
      toArray(measureNode.barline as XmlNode | XmlNode[] | undefined).forEach((barline, barlineIndex) => {
        warnings.push(...collectEditorialWarnings(barline, 'barline',
          `part[${partIndex + 1}].measure[${measureNumber}].barline[${barlineIndex + 1}]`,
          { partNumber: partIndex + 1, measureNumber }))
        if (ownsRepeats && unresolvedEnds?.has(measureIndex) &&
            readOptionalString(barline, 'repeat', '@_direction') === 'backward') {
          warnings.push({
            code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
            path: `part[${partIndex + 1}].measure[${measureNumber}].barline[${barlineIndex + 1}].repeat`,
            message: 'Multiple repeat ends with unresolved ending passes. Brackets and repeat marks are retained, but the performed sequence may differ.'
          })
        }
        const ending = readOptionalNode(barline, 'ending')
        if (ending) {
          const path = `part[${partIndex + 1}].measure[${measureNumber}].barline[${barlineIndex + 1}].ending`
          const location = { code: 'unsupported-notation' as const, partNumber: partIndex + 1, measureNumber, path }
          const number = readOptionalString(ending, '@_number')
          if (number === '') {
            warnings.push({
              ...location,
              message: 'Volta with unspecified repeat passes: the bracket is retained, but it does not restrict which passes are played.'
            })
          }
          const label = readOptionalString(ending, '#text')
          const labelNumbers = label?.split(',').map(pass => pass.trim().replace(/\.$/, '')).join(',')
          const printObject = readOptionalString(ending, '@_print-object')
          const type = readOptionalString(ending, '@_type')
          if (type === 'start' && repeatCount !== undefined && measureIndex >= repeatStartIndex) {
            const passes = repeatStaff?.measures[measureIndex]?.volta?.passes
            const unreachablePasses = [...new Set(passes?.filter(pass => pass > repeatCount))]
            if (unreachablePasses.length) {
              warnings.push({
                ...location,
                message: `Volta passes outside the repeat count: ${JSON.stringify({ passes: unreachablePasses, repeatCount })}. Keep the original MusicXML and compare playback.`
              })
            }
          }
          const appearance = {
            label: label && labelNumbers !== number?.replaceAll(' ', '') ? label : undefined,
            printObject: printObject === 'no' ? printObject : undefined,
            end: type === 'discontinue' ? type : undefined
          }
          if (appearance.label || appearance.printObject || appearance.end) {
            warnings.push({
              ...location,
              message: `Unrepresented volta appearance ${JSON.stringify(appearance)} is not retained. Studio uses its standard numbered, visible brackets with a closing hook. Keep the original MusicXML and compare the score and re-export.`
            })
          }
        }
        // A marker child and its optional target label belong to this barline.
        // Label attributes without the corresponding child are inert in MusicXML.
        const attributes = sourceBarlineAttributes.get(barline) ?? barline
        for (const kind of ['segno', 'coda'] as const) {
          const markers = sourceNotationFacts.get(barline)?.[kind] ??
            toArray(barline[kind] as XmlNode | XmlNode[] | undefined)
          markers.forEach((source, index) => warnings.push({
            code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
            path: `part[${partIndex + 1}].measure[${measureNumber}].barline[${barlineIndex + 1}].${kind}${markers.length > 1 ? `[${index + 1}]` : ''}`,
            message: `Unrepresented barline navigation marker ${JSON.stringify({ kind, location: readOptionalString(barline, '@_location') ?? 'right', label: attributes[`@_${kind}`] ?? null, divisions: attributes['@_divisions'] ?? null, source })} is not retained by the current measure/barline model. No jump or target is synthesized. Keep the original MusicXML and compare notation, navigation and re-export.`
          }))
        }
        // These marks belong to the barline, not a neighboring note. Diagnose
        // omission before style-specific early returns; never synthesize a hold.
        const fermatas = sourceNotationFacts.get(barline)?.fermata ??
          toArray(barline.fermata as XmlNode | XmlNode[] | undefined)
        fermatas.forEach((source, index) => warnings.push({
          code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
          path: `part[${partIndex + 1}].measure[${measureNumber}].barline[${barlineIndex + 1}].fermata${fermatas.length > 1 ? `[${index + 1}]` : ''}`,
          message: `Unrepresented barline fermata ${JSON.stringify({ location: readOptionalString(barline, '@_location') ?? 'right', source })} is not retained by the current measure/barline model. No note fermata or hold is synthesized. Keep the original MusicXML and compare notation, playback and re-export.`
        }))
        const style = readOptionalString(barline, 'bar-style')
        if (style === undefined) return
        const repeat = readOptionalNode(barline, 'repeat'), direction = repeat && readOptionalString(repeat, '@_direction')
        const location = readOptionalString(barline, '@_location') ?? 'right'
        const repeatStyle = direction === 'forward' && location === 'left' ? 'heavy-light'
          : direction === 'backward' && location === 'right' ? 'light-heavy' : undefined
        if ((!repeat && style === 'regular') || style === repeatStyle) return
        warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
          path: `part[${partIndex + 1}].measure[${measureNumber}].barline[${barlineIndex + 1}].bar-style`,
          message: `Explicit barline style "${style}" is not represented by the current barline model. Keep the original MusicXML and compare notation and re-export.` })
      })

      // The current model stores one clef per measure, not positioned clefs.
      // Use the ordered musical cursor: source order after a backup can be tick0.
      toArray(measureNode.attributes as XmlNode | XmlNode[] | undefined).forEach((attributes, attributeIndex) => {
        warnings.push(...collectMeasureStyleWarnings(attributes, partIndex + 1, measureNumber, attributeIndex + 1))
        toArray(attributes['for-part'] as XmlNode | XmlNode[] | undefined).forEach((settings, index) => {
          warnings.push({
            code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
            path: `part[${partIndex + 1}].measure[${measureNumber}].attributes[${attributeIndex + 1}].for-part[${index + 1}]`,
            message: `Unrepresented concert-score part settings ${JSON.stringify(settings)} are not retained for written part extraction. Source note pitches and ordinary transpose elements are handled separately. Keep the original MusicXML and compare written parts and re-export.`
          })
        })
        // Individual staff appearance has no model fields. Keep redundant
        // five-line/100% defaults quiet and report explicit differences.
        toArray(attributes['staff-details'] as XmlNode | XmlNode[] | undefined).forEach((details, detailsIndex) => {
          const size = readOptionalString(details, 'staff-size')
          const scaling = readOptionalString(readOptionalNode(details, 'staff-size') ?? {}, '@_scaling')
          if ((size !== undefined && Number(size) !== 100) || (scaling !== undefined && Number(scaling) !== 100)) {
            const source = { staffNumber: readOptionalString(details, '@_number') ?? '1', size, scaling }
            warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
              path: 'part[' + (partIndex + 1) + '].measure[' + measureNumber + '].attributes[' + (attributeIndex + 1) + '].staff-details[' + (detailsIndex + 1) + '].staff-size',
              message: 'Unrepresented individual staff size ' + JSON.stringify(source) + ' is not retained by the current staff model. Individual staff-space and notation scaling differ from score-wide PDF size. Keep the original MusicXML and compare staff appearance and re-export.' })
          }
          const staffType = readOptionalString(details, 'staff-type')
          if (staffType !== undefined && staffType !== 'regular') {
            const source = { staffNumber: readOptionalString(details, '@_number') ?? '1', staffType }
            warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
              path: 'part[' + (partIndex + 1) + '].measure[' + measureNumber + '].attributes[' + (attributeIndex + 1) + '].staff-details[' + (detailsIndex + 1) + '].staff-type',
              message: 'Unrepresented staff usage ' + JSON.stringify(source) + ' is not retained by the current staff model. Alternate, cue, editorial, and ossia staff semantics may differ in playback, display, and re-export. Keep the original MusicXML and compare playback and output.' })
          }
          const printObject = readOptionalString(details, '@_print-object')
          if (printObject === 'no') {
            const source = { staffNumber: readOptionalString(details, '@_number') ?? '1', printObject,
              printSpacing: readOptionalString(details, '@_print-spacing') }
            warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
              path: 'part[' + (partIndex + 1) + '].measure[' + measureNumber + '].attributes[' + (attributeIndex + 1) + '].staff-details[' + (detailsIndex + 1) + '].@print-object',
              message: 'Unrepresented staff visibility ' + JSON.stringify(source) + ' is not retained by the current staff model. Hidden staff display and spacing may differ in Studio and re-export. Keep the original MusicXML and compare staff appearance and output.' })
          }
          const lines = readOptionalString(details, 'staff-lines')
          if (lines === undefined || Number(lines) === 5) return
          const source = { staffNumber: readOptionalString(details, '@_number') ?? '1', lines }
          warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
            path: 'part[' + (partIndex + 1) + '].measure[' + measureNumber + '].attributes[' + (attributeIndex + 1) + '].staff-details[' + (detailsIndex + 1) + '].staff-lines',
            message: 'Unrepresented staff line count ' + JSON.stringify(source) + ' is not retained by the current staff model. The current rendering uses five staff lines. Keep the original MusicXML and compare notation and re-export.' })
        })
        // A part-symbol spans staves inside one part, not a part-list group.
        // Only diagnose non-default shape/range loss; plain full-part brace
        // omission still has the standard default meaning in re-export.
        sourceStaffCount = readOptionalInteger(attributes, 'staves') ?? sourceStaffCount
        const symbol = readOptionalString(attributes, 'part-symbol')
        const symbolNode = readOptionalNode(attributes, 'part-symbol') ?? {}
        const topStaff = readOptionalString(symbolNode, '@_top-staff') ?? '1'
        const bottomStaff = readOptionalString(symbolNode, '@_bottom-staff') ?? String(sourceStaffCount)
        if (symbol !== undefined && (symbol !== 'brace' || Number(topStaff) !== 1 || Number(bottomStaff) !== sourceStaffCount)) {
          const source = { symbol, topStaff, bottomStaff, staffCount: sourceStaffCount }
          warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
            path: 'part[' + (partIndex + 1) + '].measure[' + measureNumber + '].attributes[' + (attributeIndex + 1) + '].part-symbol',
            message: 'Unrepresented part-symbol ' + JSON.stringify(source) + ' is not retained by the current parts/staves model. Keep the original MusicXML and compare the staff grouping and common barlines in re-export. This notice does not restore the original symbol or range.' })
        }
        warnings.push(...collectSignatureDisplayWarnings(attributes, partIndex + 1, measureNumber, attributeIndex + 1))
        const tick = directionTicks.get(attributes) ?? 0
        if (tick <= 0) return
        toArray(attributes.key as XmlNode | XmlNode[] | undefined).forEach((key, keyIndex) => {
          if (importedClosingKeys.has(key)) return
          const source = {
            tick, staff: readOptionalString(key, '@_number'),
            fifths: readOptionalString(key, 'fifths'), mode: readOptionalString(key, 'mode')
          }
          warnings.push({
            code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
            path: `part[${partIndex + 1}].measure[${measureNumber}].attributes[${attributeIndex + 1}].key[${keyIndex + 1}]`,
            message: `Unrepresented positioned key signature ${JSON.stringify(source)}. Studio stores a key signature at the beginning of each measure and staff. Keep the source MusicXML and compare notation and re-export.`
          })
        })
        toArray(attributes.time as XmlNode | XmlNode[] | undefined).forEach((time, timeIndex) => {
          if (importedClosingMeters.has(time)) return
          const source = {
            tick, staff: readOptionalString(time, '@_number'),
            beats: readOptionalString(time, 'beats'), beatType: readOptionalString(time, 'beat-type')
          }
          warnings.push({
            code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
            path: `part[${partIndex + 1}].measure[${measureNumber}].attributes[${attributeIndex + 1}].time[${timeIndex + 1}]`,
            message: `Unrepresented positioned time signature ${JSON.stringify(source)}. Studio stores a time signature at the beginning of each measure and staff. Keep the source MusicXML and compare measure lengths and re-export.`
          })
        })
        toArray(attributes.transpose as XmlNode | XmlNode[] | undefined).forEach((transpose, transposeIndex) => {
          if (importedClosingTranspositions.has(transpose)) return
          const source = {
            tick,
            staff: readOptionalString(transpose, '@_number'),
            diatonic: readOptionalString(transpose, 'diatonic'),
            chromatic: readOptionalString(transpose, 'chromatic'),
            octaveChange: readOptionalString(transpose, 'octave-change')
          }
          warnings.push({
            code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
            path: `part[${partIndex + 1}].measure[${measureNumber}].attributes[${attributeIndex + 1}].transpose[${transposeIndex + 1}]`,
            message: relocatedLeadingRestTranspositions.has(transpose)
              ? `Moved transposition before first pitched content ${JSON.stringify(source)}. Studio applied this setting at the start of the measure and retained the sounding pitches.`
              : `Unrepresented in-measure transposition ${JSON.stringify(source)}. Studio stores transposition per measure and staff. Keep the original MusicXML and compare playback and re-export.`
          })
        })
        toArray(attributes.clef as XmlNode | XmlNode[] | undefined).forEach((_clef, clefIndex) => {
          warnings.push({code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
            path: `part[${partIndex + 1}].measure[${measureNumber}].attributes[${attributeIndex + 1}].clef[${clefIndex + 1}]`,
            message: '마디 안 음자리표 변경의 위치는 보존하지 못합니다. 가져온 악보의 음자리표를 원본과 비교하세요.'})
        })
      })

      warnings.push(...collectChordMemberTieWarnings(noteNodes, partIndex + 1, measureNumber))

      noteNodes.forEach((noteNode, noteIndex) => {
        const chordDuration = sourceChordMemberDurations.get(noteNode)
        if (chordDuration?.appliedTicks !== undefined) {
          const { sourceTicks, appliedTicks, duration, divisions } = chordDuration
          const source = { sourceTicks, appliedTicks, duration, divisions }
          warnings.push({
            code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber, eventIndex: noteIndex + 1,
            path: `part[${partIndex + 1}].measure[${measureNumber}].note[${noteIndex + 1}].duration`,
            message: `Unrepresented chord member duration ${JSON.stringify(source)}. The chord uses a shared duration. Keep the original MusicXML and compare playback and re-export.`
          })
        }
        const sourceRestTicks = readOptionalString(noteNode, 'rest', '@_measure') === 'yes'
          ? sourceNoteDurationTicks.get(noteNode)
          : undefined
        if (sourceRestTicks !== undefined) {
          const staffNumber = readStaffNumber(noteNode, score.parts[partIndex].staves.length)
          const representedMeasure = score.parts[partIndex].staves[staffNumber - 1]?.measures[measureIndex]
          if (representedMeasure && sourceRestTicks !== measureDurationTicks(representedMeasure)) {
            const representedTicks = measureDurationTicks(representedMeasure)
            warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber, eventIndex: noteIndex + 1,
              path: `part[${partIndex + 1}].measure[${measureNumber}].note[${noteIndex + 1}].duration`,
              message: `Full-measure rest duration ${sourceRestTicks} ticks is represented as ${representedTicks} ticks by the current measure timing. Keep the source MusicXML and compare actual bar lengths and playback.` })
          }
        }
        const rest = readOptionalNode(noteNode, 'rest')
        if (rest) {
          const displayStep = readOptionalString(rest, 'display-step')
          const displayOctave = readOptionalString(rest, 'display-octave')
          if (displayStep !== undefined || displayOctave !== undefined) {
            const source = { displayStep, displayOctave, staff: readOptionalString(noteNode, 'staff') ?? '1',
              voice: readOptionalString(noteNode, 'voice') ?? '1' }
            warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber, eventIndex: noteIndex + 1,
              path: `part[${partIndex + 1}].measure[${measureNumber}].note[${noteIndex + 1}].rest`,
              message: `Unrepresented rest staff placement ${JSON.stringify(source)}. Studio uses its automatic rest position. Keep the source MusicXML and compare notation and re-export.` })
          }
        }
        // Display visibility is not part of the note/rest model. Diagnose its
        // loss without treating an invisible sounding note as a rest or edit.
        if (readOptionalString(noteNode, '@_print-object') === 'no') {
          const facts = { printObject: 'no', printSpacing: readOptionalString(noteNode, '@_print-spacing'),
            printLeger: readOptionalString(noteNode, '@_print-leger'), printDot: readOptionalString(noteNode, '@_print-dot') }
          warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber, eventIndex: noteIndex + 1,
            path: `part[${partIndex + 1}].measure[${measureNumber}].note[${noteIndex + 1}].@print-object`,
            message: `Unrepresented note visibility ${JSON.stringify(facts)} is not retained by the current note/rest model. Hidden notes or rests may appear in Studio and re-export. Keep the original MusicXML and compare notation and output.` })
        } else if (!('rest' in noteNode) && readOptionalString(noteNode, '@_print-leger') === 'no') {
          // Rests ignore print-leger. A hidden note already has the combined
          // notice above; diagnose independently suppressed visible ledgers once.
          warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber, eventIndex: noteIndex + 1,
            path: `part[${partIndex + 1}].measure[${measureNumber}].note[${noteIndex + 1}].@print-leger`,
            message: 'Unrepresented note ledger visibility {"printLeger":"no"} is not retained by the current note model. Ledger lines may appear in Studio and re-export. Keep the original MusicXML and compare notation and output.' })
        }
        // Display suppression does not change the rhythmic dot. Grace notes
        // currently retain pitch/slash only; their type/dot appearance loss is
        // a separate contract, not represented augmentation-dot visibility.
        if (!('grace' in noteNode) && 'dot' in noteNode &&
            readOptionalString(noteNode, '@_print-object') !== 'no' &&
            readOptionalString(noteNode, '@_print-dot') === 'no') {
          warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber, eventIndex: noteIndex + 1,
            path: `part[${partIndex + 1}].measure[${measureNumber}].note[${noteIndex + 1}].@print-dot`,
            message: 'Unrepresented note dot visibility {"printDot":"no"} is not retained by the current note/rest model. Augmentation dots may appear in Studio and re-export. Keep the original MusicXML and compare notation and output.' })
        }
        // A cue child carries silence/kind semantics, unlike type size="cue".
        // Keep the current projected model and diagnose loss per source member;
        // muting an entire chord would also remove its ordinary members.
        if ('cue' in noteNode) {
          const facts = { cue: true, grace: 'grace' in noteNode, rest: 'rest' in noteNode,
            chord: 'chord' in noteNode, typeSize: readOptionalString(readOptionalNode(noteNode, 'type') ?? {}, '@_size') }
          warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber, eventIndex: noteIndex + 1,
            path: `part[${partIndex + 1}].measure[${measureNumber}].note[${noteIndex + 1}].cue`,
            message: `Unrepresented cue note kind ${JSON.stringify(facts)} is not retained by the current note/rest model. Cue kind and graphic size may differ in Studio and re-export. Keep the original MusicXML and compare playback, notation and output.` })
        }
        // Grace pitch/slash are retained, but graphic type and dots are not.
        // Do not infer performed duration from their printed appearance.
        if ('grace' in noteNode) {
          const type = readOptionalString(noteNode, 'type')
          const dots = toArray(noteNode.dot as XmlNode | XmlNode[] | undefined).length
          if ((type !== undefined && type !== 'eighth') || dots > 0) {
            const facts = { type, dots, printDot: readOptionalString(noteNode, '@_print-dot') }
            const sourceField = type !== undefined && type !== 'eighth' ? 'type' : 'dot[1]'
            warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber, eventIndex: noteIndex + 1,
              path: `part[${partIndex + 1}].measure[${measureNumber}].note[${noteIndex + 1}].${sourceField}`,
              message: `Unrepresented grace appearance ${JSON.stringify(facts)} is not retained by the current grace model. Grace notes use the default eighth appearance in Studio and re-export. Keep the original MusicXML and compare grace notation and output.` })
          }
        }
        // Timing attributes are distinct from the grace graphic type. Retain
        // source values (including explicit zero) in diagnostics, not playback.
        if ('grace' in noteNode) {
          const graceNode = readOptionalNode(noteNode, 'grace') ?? {}
          const stealTimePrevious = readOptionalString(graceNode, '@_steal-time-previous')
          const stealTimeFollowing = readOptionalString(graceNode, '@_steal-time-following')
          const makeTime = readOptionalString(graceNode, '@_make-time')
          if (stealTimePrevious !== undefined || stealTimeFollowing !== undefined || makeTime !== undefined) {
            const facts = { stealTimePrevious, stealTimeFollowing, makeTime,
              stealTimeUnit: 'percent', makeTimeUnit: 'divisions' }
            const sourceField = stealTimePrevious !== undefined ? 'steal-time-previous'
              : stealTimeFollowing !== undefined ? 'steal-time-following' : 'make-time'
            warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber, eventIndex: noteIndex + 1,
              path: `part[${partIndex + 1}].measure[${measureNumber}].note[${noteIndex + 1}].grace.@${sourceField}`,
              message: `Unrepresented grace timing ${JSON.stringify(facts)} is not retained by the current grace model. Original time stealing and make-time are not applied to playback or re-export. Keep the original MusicXML and compare grace playback and output.` })
          }
        }
        // A lyric's own print-object overrides note-level print-lyric and its
        // print-object default. Report only effective hidden, represented text.
        toArray(noteNode.lyric as XmlNode | XmlNode[] | undefined).forEach((lyricNode, lyricIndex) => {
          if (!readLyricText(lyricNode)) return
          const printObject = readOptionalString(lyricNode, '@_print-object')
          const notePrintLyric = readOptionalString(noteNode, '@_print-lyric')
          const notePrintObject = readOptionalString(noteNode, '@_print-object')
          const effectivePrintObject = printObject ?? notePrintLyric ?? notePrintObject ?? 'yes'
          if (effectivePrintObject !== 'no') return
          const notePath = `part[${partIndex + 1}].measure[${measureNumber}].note[${noteIndex + 1}]`
          const path = `${notePath}.lyric[${lyricIndex + 1}]`
          const visibilitySource = printObject !== undefined ? `${path}.@print-object`
            : notePrintLyric !== undefined ? `${notePath}.@print-lyric` : `${notePath}.@print-object`
          const facts = { lyricIndex: lyricIndex + 1, number: readOptionalString(lyricNode, '@_number'),
            printObject, notePrintLyric, notePrintObject, effectivePrintObject, visibilitySource }
          warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber,
            eventIndex: noteIndex + 1, path,
            message: `Unrepresented lyric visibility ${JSON.stringify(facts)} is not retained by the current lyric model. Hidden lyrics may appear in Studio and re-export. Keep the original MusicXML and compare the verses and output.` })
        })
        warnings.push(...collectLyricFontWarnings(noteNode, partIndex + 1, measureNumber, noteIndex + 1))
        warnings.push(...collectLyricElisionWarnings(noteNode, partIndex + 1, measureNumber, noteIndex + 1))
        // The native note model has no stem-hiding override. Whole notes and
        // rests already have no regular stem; keep this warning scoped to
        // the visible pitched-note loss rather than every explicit direction.
        if (readOptionalString(noteNode, 'stem') === 'none' && !('rest' in noteNode) && readOptionalString(noteNode, 'type') !== 'whole') {
          warnings.push({ code: 'unsupported-notation', partNumber: partIndex + 1, measureNumber, eventIndex: noteIndex + 1,
            path: `part[${partIndex + 1}].measure[${measureNumber}].note[${noteIndex + 1}].stem`,
            message: 'Explicit stem hiding is not represented by the current note model. Keep the original MusicXML and compare notation and re-export.' })
        }
        warnings.push(...collectAccidentalAppearanceWarnings(noteNode, partIndex + 1, measureNumber, noteIndex + 1))
        warnings.push(...collectNoteheadWarnings(noteNode,partIndex + 1,measureNumber,noteIndex + 1))
        warnings.push(...collectNoteheadTextWarnings(noteNode, partIndex + 1, measureNumber, noteIndex + 1))
        warnings.push(...collectAdditionalNotationWarnings(noteNode, partIndex + 1, measureNumber, noteIndex + 1))
        warnings.push(...collectNoteVelocityWarnings(noteNode,partIndex + 1,measureNumber,noteIndex + 1))
        warnings.push(...collectNoteDynamicMarkingWarnings(noteNode,partIndex + 1,measureNumber,noteIndex + 1))
        warnings.push(...collectNoteInstrumentWarnings(noteNode, partIndex + 1, measureNumber, noteIndex + 1))
        warnings.push(...collectPlaybackTechniqueWarnings(noteNode, 'note',
          `part[${partIndex + 1}].measure[${measureNumber}].note[${noteIndex + 1}]`, partIndex + 1, measureNumber, noteIndex + 1))
        warnings.push(...collectConditionalTieWarnings(noteNode, partIndex + 1, measureNumber, noteIndex + 1))
        warnings.push(...collectConditionalNoteWarnings(noteNode, partIndex + 1, measureNumber, noteIndex + 1))
        warnings.push(...collectNotePerformanceWarnings(noteNode, partIndex + 1, measureNumber, noteIndex + 1))
        warnings.push(...collectPizzicatoWarnings(noteNode, 'note',
          `part[${partIndex + 1}].measure[${measureNumber}].note[${noteIndex + 1}]`, partIndex + 1, measureNumber, noteIndex + 1))
        warnings.push(...collectLetRingWarnings(noteNode, partIndex + 1, measureNumber, noteIndex + 1))
        warnings.push(
          ...collectUnsupportedNoteWarnings(
            noteNode,
            measureNumber,
            noteIndex + 1
          )
        )
      })

      directions.forEach((direction, directionIndex) => {
        warnings.push(
          ...collectUnsupportedDirectionWarnings(
            direction,
            measureNumber,
            directionIndex + 1,
            partIndex + 1
          )
        )
      })
      toArray(measureNode.sound as XmlNode | XmlNode[] | undefined).forEach((sound, soundIndex) => {
        const tempo = readOptionalString(sound, '@_tempo')
        const represented = partIndex === 0 && readDirectSoundTempo(sound, score.parts[0]?.staves[0]?.measures[measureIndex])
        if (tempo !== undefined && !represented) warnings.push({
          code: 'unsupported-direction', measureNumber,
          path: `part[${partIndex + 1}].measure[${measureNumber}].sound[${soundIndex + 1}].tempo`,
          message: `Direct measure sound tempo is not represented separately (${tempo} quarter BPM). Keep the original MusicXML and compare playback tempo.`
        })
        warnings.push(...collectSoundDynamicsWarnings(sound,
          `part[${partIndex + 1}].measure[${measureNumber}].sound[${soundIndex + 1}]`,measureNumber))
        warnings.push(...collectUnrepresentedSoundPedalWarnings(sound,
          `part[${partIndex + 1}].measure[${measureNumber}].sound[${soundIndex + 1}]`, partIndex + 1, measureNumber))
        warnings.push(...collectPizzicatoWarnings(sound, 'sound',
          `part[${partIndex + 1}].measure[${measureNumber}].sound[${soundIndex + 1}]`, partIndex + 1, measureNumber))
        warnings.push(...collectMidiInstrumentWarnings(sound,
          `part[${partIndex + 1}].measure[${measureNumber}].sound[${soundIndex + 1}]`, partIndex + 1, measureNumber))
        warnings.push(...collectPlaybackTechniqueWarnings(sound, 'sound',
          `part[${partIndex + 1}].measure[${measureNumber}].sound[${soundIndex + 1}]`, partIndex + 1, measureNumber))
        warnings.push(...collectPlaybackNavigationSoundWarnings(sound,
          `part[${partIndex + 1}].measure[${measureNumber}].sound[${soundIndex + 1}]`, partIndex + 1, measureNumber))
      })
      // Location-only legacy warnings must retain the owning part before
      // deduplication; equal measure/note numbers in two parts are distinct.
      for (let index = firstWarning; index < warnings.length; index++) {
        const warning = warnings[index]
        if (warning.path.startsWith('measure[')) {
          warnings[index] = { ...warning, path: `part[${partIndex + 1}].${warning.path}` }
        }
      }
    })
  })

  return dedupeWarnings(warnings)
}

// The score has event-level ties. Detect valid XML whose chord members disagree
// before callers mistake the unchanged legacy conversion for lossless import.
function collectChordMemberTieWarnings(nodes: XmlNode[], partNumber: number, measureNumber: number): MusicXmlImportWarning[] {
  const anchors = new Map<string, { mask: string; warned: boolean }>()
  const warnings: MusicXmlImportWarning[] = []
  nodes.forEach((node, index) => {
    if ('grace' in node) return
    const lane = `${readOptionalInteger(node, 'staff') ?? 1}:${readOptionalString(node, 'voice') ?? '1'}`
    // Sound (<tie>) and notation (<tied>) are independent channels. Their
    // union can hide a partial member in one channel behind a whole chord
    // in the other. Keep conversion unchanged, but report either loss.
    const maskFor = (value: XmlNode | XmlNode[] | undefined) => {
      const types = toArray(value).map(tie => readOptionalString(tie, '@_type'))
      return `${types.includes('start')}:${types.includes('stop')}`
    }
    const mask = `${maskFor(node.tie as XmlNode | XmlNode[] | undefined)}:${maskFor(readNotationTieNodes(node))}`
    if (!('chord' in node)) {
      anchors.set(lane, { mask, warned: false })
      return
    }
    const anchor = anchors.get(lane)
    if (!anchor || anchor.warned || anchor.mask === mask) return
    anchor.warned = true
    warnings.push({
      code: 'unsupported-notation', measureNumber, eventIndex: index + 1,
      path: `part[${partNumber}].measure[${measureNumber}].note[${index + 1}].ties`,
      message: 'Member-specific chord ties are not represented by the event-level tie model. Keep the original MusicXML and compare imported ties and playback.'
    })
  })
  return warnings
}

function collectPizzicatoWarnings(node: XmlNode | undefined, scope: 'note' | 'sound', path: string,
  partNumber: number, measureNumber: number, eventIndex?: number): MusicXmlImportWarning[] {
  const value = node ? readOptionalString(node, '@_pizzicato') : undefined
  if (value === undefined) return []
  // Retain the original instruction, including an explicit no. Note-local
  // overrides and subsequent-note sound changes are different source scopes.
  return [{
    code: scope === 'note' ? 'unsupported-notation' : 'unsupported-direction',
    partNumber, measureNumber, ...(eventIndex === undefined ? {} : { eventIndex }),
    path: `${path}.@pizzicato`,
    message: `Unrepresented ${scope} pizzicato=${JSON.stringify(value)} is not retained by the current playback model. Keep the original MusicXML and compare playing technique and re-export. Written text is separate from this sound instruction.`
  }]
}

function collectNotePerformanceWarnings(node: XmlNode, partNumber: number, measureNumber: number, eventIndex: number): MusicXmlImportWarning[] {
  return ['attack', 'release'].flatMap(attribute => {
    const value = readOptionalString(node, `@_${attribute}`)
    // Explicit zero has the same musical timing as the current default. These
    // diagnostics describe lost performance changes, not byte-for-byte storage.
    if (value === undefined || Number(value) === 0) return []
    return [{
      code: 'unsupported-notation' as const, partNumber, measureNumber, eventIndex,
      path: `part[${partNumber}].measure[${measureNumber}].note[${eventIndex}].@${attribute}`,
      message: `Unrepresented note performance ${attribute}="${value}" in divisions. The current note model does not preserve this performance time adjustment. Keep the original MusicXML and compare playback timing and re-export.`
    }]
  })
}

function collectSignatureDisplayWarnings(
  attributes: XmlNode, partNumber: number, measureNumber: number, attributeNumber: number
): MusicXmlImportWarning[] {
  const warnings: MusicXmlImportWarning[] = []
  const path = `part[${partNumber}].measure[${measureNumber}].attributes[${attributeNumber}]`

  toArray(attributes.key as XmlNode | XmlNode[] | undefined).forEach((key, index) => {
    const hidden = readOptionalString(key, '@_print-object') === 'no'
    const octaves = toArray(key['key-octave'] as XmlNode | XmlNode[] | undefined).map(octave => ({
      number: readOptionalString(octave, '@_number'),
      octave: readOptionalString(octave, '#text'),
      cancel: readOptionalString(octave, '@_cancel')
    }))
    const cancelledFifths = readOptionalString(key, 'cancel')
    const location = readOptionalString(key, 'cancel', '@_location') ?? 'left'
    // Only the standard cancellation to a neutral key is reproduced by
    // Studio's engraving. A nonzero new key or a different placement loses
    // source appearance even when the imported notes still sound the same.
    const cancellation = cancelledFifths !== undefined && Number(cancelledFifths) !== 0 &&
      (Number(readOptionalString(key, 'fifths')) !== 0 || location !== 'left')
      ? { fifths: cancelledFifths, location }
      : undefined
    if (!hidden && !octaves.length && !cancellation) return

    const appearance = {
      staff: readOptionalString(key, '@_number'),
      cancellation,
      printObject: hidden ? 'no' : undefined,
      octaves: octaves.length ? octaves : undefined
    }
    warnings.push({
      code: 'unsupported-notation', partNumber, measureNumber,
      path: `${path}.key[${index + 1}]`,
      message: `Unrepresented key signature appearance ${JSON.stringify(appearance)}. Studio uses standard visible key signatures. Keep the source MusicXML and compare notation and re-export.`
    })
  })

  toArray(attributes.time as XmlNode | XmlNode[] | undefined).forEach((time, index) => {
    const hidden = readOptionalString(time, '@_print-object') === 'no'
    const symbol = readOptionalString(time, '@_symbol')
    if (!hidden && (symbol === undefined || symbol === 'normal')) return

    const appearance = {
      staff: readOptionalString(time, '@_number'),
      printObject: hidden ? 'no' : undefined,
      symbol
    }
    warnings.push({
      code: 'unsupported-notation', partNumber, measureNumber,
      path: `${path}.time[${index + 1}]`,
      message: `Unrepresented time signature appearance ${JSON.stringify(appearance)}. Studio uses visible numeric time signatures. Keep the source MusicXML and compare notation and re-export.`
    })
  })

  return warnings
}

function collectConditionalNoteWarnings(node: XmlNode, partNumber: number, measureNumber: number, eventIndex: number): MusicXmlImportWarning[] {
  const condition = readOptionalString(node, '@_time-only')
  return condition === undefined ? [] : [{
    code: 'unsupported-notation', partNumber, measureNumber, eventIndex,
    path: `part[${partNumber}].measure[${measureNumber}].note[${eventIndex}].@time-only`,
    message: `Pass-specific note time-only="${condition}" is not represented by the current note model. Keep the original MusicXML and compare repeated playback and re-export.`
  }]
}

function collectConditionalTieWarnings(node: XmlNode, partNumber: number, measureNumber: number, eventIndex: number): MusicXmlImportWarning[] {
  return toArray(node.tie as XmlNode | XmlNode[] | undefined).flatMap((tie, index) => {
    const condition = readOptionalString(tie, '@_time-only')
    return condition === undefined ? [] : [{
      code: 'unsupported-notation' as const,
      measureNumber, eventIndex,
      path: `part[${partNumber}].measure[${measureNumber}].note[${eventIndex}].tie[${index + 1}].time-only`,
      message: `Pass-specific tie time-only="${condition}" is not represented by the unconditional tie model. Keep the original MusicXML and compare repeated playback.`
    }]
  })
}

function collectLetRingWarnings(node: XmlNode, partNumber: number, measureNumber: number, eventIndex: number): MusicXmlImportWarning[] {
  return toArray(node.notations as XmlNode | XmlNode[] | undefined).flatMap((notations, group) =>
    toArray(notations.tied as XmlNode | XmlNode[] | undefined).flatMap((tied, index) =>
      readOptionalString(tied, '@_type') !== 'let-ring' ? [] : [{
        code: 'unsupported-notation' as const,
        measureNumber, eventIndex,
        path: `part[${partNumber}].measure[${measureNumber}].note[${eventIndex}].notations[${group + 1}].tied[${index + 1}]`,
        message: 'let-ring tie notation is not imported yet.'
      }]))
}

// Explicit note-to-instrument references are not held by the event model.
// Diagnose each source reference without assigning a new sound or changing notes.
function collectNoteInstrumentWarnings(note: XmlNode, partNumber: number, measureNumber: number, eventIndex: number): MusicXmlImportWarning[] {
  return toArray(note.instrument as XmlNode | XmlNode[] | undefined).map((instrument, index) => ({
    code: 'unsupported-notation' as const,
    partNumber, measureNumber, eventIndex,
    path: `part[${partNumber}].measure[${measureNumber}].note[${eventIndex}].instrument[${index + 1}]`,
    message: `Unrepresented note instrument (id=${JSON.stringify(readOptionalString(instrument, '@_id') ?? '')}). Explicit per-note instrument assignments are not preserved. Keep the original MusicXML and compare instrument sounds and re-export.`
  }))
}

// Source note techniques and forward-going sound techniques are not local
// mixer mute/volume settings. Diagnose their loss without changing playback.
function collectPlaybackTechniqueWarnings(source: XmlNode | undefined, owner: 'note' | 'sound', path: string,
  partNumber: number, measureNumber: number, eventIndex?: number): MusicXmlImportWarning[] {
  return toArray(source?.play as XmlNode | XmlNode[] | undefined).flatMap((play, index) => {
    if (!play || typeof play !== 'object' ||
      !['ipa', 'mute', 'semi-pitched', 'other-play'].some(kind => play[kind] !== undefined)) return []
    return [{
      code: owner === 'note' ? 'unsupported-notation' as const : 'unsupported-direction' as const,
      partNumber, measureNumber,
      ...(eventIndex === undefined ? {} : { eventIndex }),
      path: `${path}.play[${index + 1}]`,
      message: `Unrepresented playback technique (owner="${owner}", instrument=${JSON.stringify(readOptionalString(play, '@_id') ?? null)}, source=${JSON.stringify(play)}). Original ${owner === 'note' ? 'note-specific' : 'forward-going sound'} playback techniques are not retained. Current notes, playback and local mixer settings are unchanged. Keep the original MusicXML and compare instrument sounds and re-export.`
    }]
  })
}

function collectMidiInstrumentWarnings(source: XmlNode | undefined, path: string, partNumber: number, measureNumber?: number): MusicXmlImportWarning[] {
  const result = toArray(source?.['midi-instrument'] as XmlNode | XmlNode[] | undefined).flatMap((instrument, index) => {
    const warnings: MusicXmlImportWarning[] = []
    const value = readOptionalString(instrument, 'midi-program')
    if (value !== undefined) warnings.push({
      code: 'unsupported-direction', partNumber,
      ...(measureNumber === undefined ? {} : { measureNumber }),
      path: `${path}.midi-instrument[${index + 1}].midi-program`,
      message: `Explicit MIDI instrument program (${value}) is not imported separately. MIDI copies use the instrument inferred from the part name. Keep the original MusicXML and compare instrument sounds.`
    })
    const bank = readOptionalString(instrument, 'midi-bank')
    if (bank !== undefined) warnings.push({
      code: 'unsupported-direction', partNumber,
      ...(measureNumber === undefined ? {} : { measureNumber }),
      path: `${path}.midi-instrument[${index + 1}].midi-bank`,
      message: `Unrepresented MIDI instrument bank (value=${JSON.stringify(bank)}, instrument=${JSON.stringify(readOptionalString(instrument, '@_id') ?? '')}). Original MIDI bank assignment is not retained. Current part-name sound and local mixer settings are unchanged. Keep the original MusicXML and compare playback and re-export.`
    })
    const channel = readOptionalString(instrument, 'midi-channel')
    if (channel !== undefined) warnings.push({
      code: 'unsupported-direction', partNumber,
      ...(measureNumber === undefined ? {} : { measureNumber }),
      path: `${path}.midi-instrument[${index + 1}].midi-channel`,
      message: `Unrepresented MIDI instrument channel (value=${JSON.stringify(channel)}, instrument=${JSON.stringify(readOptionalString(instrument, '@_id') ?? '')}). Original MIDI channel assignment is not retained. MIDI copies use the current part-order channel mapping. Keep the original MusicXML and compare channel routing and playback.`
    })
    const unpitched = readOptionalString(instrument, 'midi-unpitched')
    if (unpitched !== undefined) warnings.push({
      code: 'unsupported-direction', partNumber,
      ...(measureNumber === undefined ? {} : { measureNumber }),
      path: `${path}.midi-instrument[${index + 1}].midi-unpitched`,
      message: `Unrepresented MIDI instrument unpitched (value=${JSON.stringify(unpitched)}, instrument=${JSON.stringify(readOptionalString(instrument, '@_id') ?? null)}). Original percussion MIDI note assignment is not retained. Current playback and local mixer settings are unchanged. Keep the original MusicXML and compare percussion mapping and re-export.`
    })
    const names = sourceMidiFacts.get(instrument)?.['midi-name'] ?? toArray(instrument['midi-name'] as XmlNode | string | (XmlNode | string)[] | undefined)
    for (const name of names) warnings.push({
      code: 'unsupported-direction', partNumber,
      ...(measureNumber === undefined ? {} : { measureNumber }),
      path: `${path}.midi-instrument[${index + 1}].midi-name`,
      message: `Unrepresented MIDI instrument name (value=${JSON.stringify(midiFactText(name))}, instrument=${JSON.stringify(readOptionalString(instrument, '@_id') ?? null)}). Original MIDI ProgramName is not retained. Current playback and local mixer settings are unchanged. Keep the original MusicXML and compare instrument names, sounds and re-export.`
    })
    // Source instrument playback instructions are separate from the local mixer.
    // Preserve explicit zero and report every lost field without changing sound.
    for (const field of ['volume', 'pan', 'elevation'] as const) {
      const mixerValue = readOptionalString(instrument, field)
      if (mixerValue === undefined) continue
      warnings.push({
        code: 'unsupported-direction', partNumber,
        ...(measureNumber === undefined ? {} : { measureNumber }),
        path: `${path}.midi-instrument[${index + 1}].${field}`,
        message: `Unrepresented MIDI instrument mixer (field="${field}", value=${JSON.stringify(mixerValue)}, instrument=${JSON.stringify(readOptionalString(instrument, '@_id') ?? '')}). Original instrument-specific volume and spatial placement are not retained. Local mixer settings are unchanged. Keep the original MusicXML and compare playback and re-export.`
      })
    }
    return warnings
  })
  const devices = source && typeof source === 'object'
    ? sourceMidiFacts.get(source)?.['midi-device'] ?? toArray(source['midi-device'] as XmlNode | string | (XmlNode | string)[] | undefined) : []
  devices.forEach((device, index) => {
    const attributes = typeof device === 'object' ? device : {}
    result.push({
      code: 'unsupported-direction', partNumber,
      ...(measureNumber === undefined ? {} : { measureNumber }),
      path: `${path}.midi-device[${index + 1}]`,
      message: `Unrepresented MIDI device (name=${JSON.stringify(midiFactText(device))}, port=${JSON.stringify(readOptionalString(attributes, '@_port') ?? null)}, instrument=${JSON.stringify(readOptionalString(attributes, '@_id') ?? null)}). Original device and port assignments are not retained. Current playback and local mixer settings are unchanged. Keep the original MusicXML and compare device routing and re-export.`
    })
  })
  return result
}

// Source display labels/settings are distinct from the internal numeric identity.
// Report unsupported appearance without renumbering or changing musical content.
function collectMeasureNumberAppearanceWarnings(measure: XmlNode, partNumber: number, measureNumber: number): MusicXmlImportWarning[] {
  const warnings: MusicXmlImportWarning[] = []
  const text = readOptionalString(measure, '@_text')
  if (text !== undefined && text !== String(measureNumber)) {
    warnings.push({code: 'unsupported-notation', partNumber, measureNumber,
      path: `part[${partNumber}].measure[${measureNumber}].@text`,
      message: `Unrepresented measure number text (text="${text}") is not preserved by the current score model. Keep the original MusicXML and compare displayed labels and re-export.`})
  }
  toArray(measure.print as XmlNode | XmlNode[] | undefined).forEach((print, printIndex) => {
    toArray(print['measure-numbering'] as XmlNode | string | (XmlNode | string)[] | undefined).forEach((mark, markIndex) => {
      const value = typeof mark === 'string' ? mark : readOptionalString(mark, '#text') ?? ''
      const facts = [`value="${value}"`, ...['font-size', 'color', 'staff', 'system', 'multiple-rest-always', 'multiple-rest-range'].flatMap(key => {
        const attribute = typeof mark === 'object' ? readOptionalString(mark, `@_${key}`) : undefined
        return attribute === undefined ? [] : [`${key}="${attribute}"`]
      })]
      warnings.push({code: 'unsupported-notation', partNumber, measureNumber,
        path: `part[${partNumber}].measure[${measureNumber}].print[${printIndex + 1}].measure-numbering[${markIndex + 1}]`,
        message: `Unrepresented measure numbering setting (${facts.join(', ')}) is not preserved by the current score model. Keep the original MusicXML and compare number visibility and re-export.`})
    })
  })
  return warnings
}

function collectRightsNoticeWarnings(root: XmlNode): MusicXmlImportWarning[] {
  const identification = readOptionalNode(root, 'identification')
  const warnings: MusicXmlImportWarning[] = []
  toArray(identification?.rights as XmlNode | string | number | (XmlNode | string | number)[] | undefined).forEach((notice, index) => {
    if (!readTextNode(notice)) return
    const type = typeof notice === 'object' ? readOptionalString(notice, '@_type') : undefined
    warnings.push({code: 'unsupported-notation', path: `identification.rights[${index + 1}]`,
      message: `Unrepresented rights notice (scope="identification", type=${JSON.stringify(type ?? 'unspecified')}) is not preserved by the current score model. Keep the original MusicXML and compare rights metadata and re-export.`})
  })
  toArray(root.credit as XmlNode | XmlNode[] | undefined).forEach((credit, index) => {
    const types = toArray(credit['credit-type'] as XmlNode | string | number | (XmlNode | string | number)[] | undefined).map(readTextNode)
    if (!types.includes('rights')) return
    const page = readOptionalString(credit, '@_page') ?? '1'
    toArray(credit['credit-words'] as XmlNode | string | number | (XmlNode | string | number)[] | undefined).forEach((words, wordIndex) => {
      if (!readTextNode(words)) return
      warnings.push({code: 'unsupported-notation', path: `credit[${index + 1}].credit-words[${wordIndex + 1}]`,
        message: `Unrepresented rights notice (scope="credit", page=${JSON.stringify(page)}, type="rights") is not preserved by the current score model. Keep the original MusicXML and compare printed credits and re-export.`})
    })
  })
  return warnings
}

function collectCreatorMetadataWarnings(root: XmlNode): MusicXmlImportWarning[] {
  const identification = readOptionalNode(root, 'identification')
  const composer = readComposer(root)
  const warnings: MusicXmlImportWarning[] = []
  toArray(identification?.creator as XmlNode | string | number | (XmlNode | string | number)[] | undefined)
    .forEach((creator, index) => {
      const name = readTextNode(creator)
      if (!name) return
      const role = typeof creator === 'object' ? readOptionalString(creator, '@_type') : undefined
      // A matching composer name is represented. An arranger with that same
      // name still loses its role; never merge or relabel source authors.
      if (role === 'composer' && name === composer) return
      warnings.push({
        code: 'unsupported-notation', path: `identification.creator[${index + 1}]`,
        message: `Unrepresented creator metadata (type=${JSON.stringify(role ?? 'unspecified')}, name=${JSON.stringify(name)}) is not preserved by the current score model. Keep the original MusicXML and compare author names and roles before re-export.`
      })
    })
  return warnings
}

function collectWorkMovementMetadataWarnings(root: XmlNode): MusicXmlImportWarning[] {
  const workTitle = readOptionalString(root, 'work', 'work-title')
  const movementTitle = readOptionalString(root, 'movement-title')
  // Content already used as the scalar title is represented. Do not change the
  // existing nullish (including empty work-title) precedence or invent sections.
  const title = workTitle ?? movementTitle
  const sources = [
    { path: 'work.work-number', value: readOptionalString(root, 'work', 'work-number') },
    { path: 'movement-number', value: readOptionalString(root, 'movement-number') },
    { path: 'movement-title', value: movementTitle !== title ? movementTitle : undefined }
  ]
  const warnings = sources.flatMap(({ path, value }): MusicXmlImportWarning[] => value ? [{
    code: 'unsupported-notation', path,
    message: `Unrepresented work or movement metadata (field="${path}", value=${JSON.stringify(value)}) is not preserved by the current score model. Keep the original MusicXML and compare work/movement numbers and titles before re-export.`
  }] : [])
  const work = readOptionalNode(root, 'work')
  const opus = work && readOptionalNode(work, 'opus')
  if (opus) warnings.push({
    code: 'unsupported-notation', path: 'work.opus',
    message: `Unrepresented work or movement metadata (field="work.opus", value=${JSON.stringify(opus)}) is not preserved by the current score model. Keep the original MusicXML and its linked collection document before re-export.`
  })
  return warnings
}

function collectCreditContentWarnings(root: XmlNode): MusicXmlImportWarning[] {
  const warnings: MusicXmlImportWarning[] = []
  // Compare actual imported metadata, never the synthetic "Imported score"
  // fallback. This is a content diagnostic, not credit layout restoration.
  const title = readOptionalString(root, 'work', 'work-title') ?? readOptionalString(root, 'movement-title')
  const composer = readComposer(root)
  toArray(root.credit as XmlNode | XmlNode[] | undefined).forEach((credit, index) => {
    const types = toArray(credit['credit-type'] as XmlNode | string | number | (XmlNode | string | number)[] | undefined)
      .map(readTextNode).filter((value): value is string => Boolean(value))
    const page = readOptionalString(credit, '@_page') ?? '1'
    for (const kind of ['credit-words', 'credit-symbol'] as const) {
      toArray(credit[kind] as XmlNode | string | number | (XmlNode | string | number)[] | undefined).forEach((node, nodeIndex) => {
        const text = readTextNode(node)
        if (!text) return
        if (kind === 'credit-words' && (types.includes('rights') ||
          (types.includes('title') && title !== undefined && text === title) ||
          (types.includes('composer') && composer !== undefined && text === composer))) return
        warnings.push({ code: 'unsupported-notation',
          path: `credit[${index + 1}].${kind}[${nodeIndex + 1}]`,
          message: `Unrepresented credit content (page=${JSON.stringify(page)}, type=${JSON.stringify(types.length ? types.join(', ') : 'unspecified')}, kind="${kind}", text=${JSON.stringify(text)}) is not preserved by the current score model. Keep the original MusicXML and compare printed credits and re-export.` })
      })
    }
  })
  return warnings
}

function collectCreditImageWarnings(root: XmlNode): MusicXmlImportWarning[] {
  return toArray(root.credit as XmlNode | XmlNode[] | undefined).flatMap((credit, creditIndex) =>
    toArray(credit['credit-image'] as XmlNode | XmlNode[] | undefined).map((image, imageIndex) => {
      const facts = [`page="${readOptionalString(credit, '@_page') ?? '1'}"`,
        ...['type', 'width', 'height'].flatMap(key => {
          const value = readOptionalString(image, `@_${key}`)
          return value === undefined ? [] : [`${key}="${value}"`]
        })]
      // Source URIs are not fetched or copied into diagnostics.
      return {code: 'unsupported-notation' as const,
        path: `credit[${creditIndex + 1}].credit-image[${imageIndex + 1}]`,
        message: `Unrepresented credit image (${facts.join(', ')}) is not preserved by the current score model. Keep the original MusicXML and image files and compare notation and re-export.`}
    }))
}

function collectFiguredBassWarnings(measure: XmlNode, partNumber: number, measureNumber: number): MusicXmlImportWarning[] {
  return toArray(measure['figured-bass'] as XmlNode | XmlNode[] | undefined).map((node, index) => {
    const facts = [`figures="${toArray(node.figure as XmlNode | XmlNode[] | undefined).length}"`,
      ...['duration', '@_print-object', '@_parentheses', '@_placement'].flatMap(key => {
        const value = readOptionalString(node, key)
        return value === undefined ? [] : [`${key.replace(/^@_/, '')}="${value}"`]
      })]
    return { code: 'unsupported-notation', partNumber, measureNumber,
      path: `part[${partNumber}].measure[${measureNumber}].figured-bass[${index + 1}]`,
      message: `Unrepresented figured-bass (${facts.join(', ')}) is not preserved by the current score model. Keep the original MusicXML and compare notation and re-export.` }
  })
}

function collectMeasureStyleWarnings(attributes: XmlNode, partNumber: number, measureNumber: number, attributeIndex: number): MusicXmlImportWarning[] {
  return toArray(attributes['measure-style'] as XmlNode | XmlNode[] | undefined).flatMap((style, index) => {
    const staff = readOptionalString(style, '@_number')
    // This notation directive does not supply music: the repeated notes are
    // already explicit in MusicXML. Diagnose its loss without expanding them.
    const repeatWarnings: MusicXmlImportWarning[] = toArray(style['measure-repeat'] as XmlNode | XmlNode[] | undefined).map((mark, repeatIndex) => {
      const facts = { type: readOptionalString(mark, '@_type'), count: readOptionalString(mark, '#text'),
        slashes: readOptionalString(mark, '@_slashes'), staff }
      return { code: 'unsupported-notation', partNumber, measureNumber,
        path: `part[${partNumber}].measure[${measureNumber}].attributes[${attributeIndex}].measure-style[${index + 1}].measure-repeat[${repeatIndex + 1}]`,
        message: `Unrepresented measure repeat ${JSON.stringify(facts)} is not retained by the current measure model. The explicit notes remain unchanged. Keep the original MusicXML and compare repeat symbols, playback and re-export.` }
    })
    const displayStyleWarnings: MusicXmlImportWarning[] = (['beat-repeat', 'slash'] as const).flatMap(kind =>
      toArray(style[kind] as XmlNode | XmlNode[] | undefined).map((mark, markIndex) => {
        const facts = { type: readOptionalString(mark, '@_type'), staff,
          slashes: readOptionalString(mark, '@_slashes'), useDots: readOptionalString(mark, '@_use-dots'),
          useStems: readOptionalString(mark, '@_use-stems'), slashType: readOptionalString(mark, 'slash-type'),
          slashDots: mark['slash-dot'] === undefined ? undefined : toArray(mark['slash-dot']).length,
          exceptVoices: mark['except-voice'] === undefined ? undefined : toArray(mark['except-voice']).map(value => readOptionalString({ value }, 'value')) }
        // Keep omitted defaults and excluded-voice order as source facts. This
        // reports unsupported display style; it does not create new music.
        const label = kind === 'beat-repeat' ? 'beat repeat' : 'slash notation'
        return { code: 'unsupported-notation', partNumber, measureNumber,
          path: `part[${partNumber}].measure[${measureNumber}].attributes[${attributeIndex}].measure-style[${index + 1}].${kind}[${markIndex + 1}]`,
          message: `Unrepresented ${label} ${JSON.stringify(facts)} is not retained by the current measure model. The explicit notes remain unchanged. Keep the original MusicXML and compare notation, playback and re-export.` }
      }))
    const styleWarnings = [...repeatWarnings, ...displayStyleWarnings]
    const count = readOptionalString(style, 'multiple-rest')
    if (count === undefined) return styleWarnings
    const mark = readOptionalNode(style, 'multiple-rest')
    const symbols = mark && readOptionalString(mark, '@_use-symbols')
    const facts = [`count="${count}"`, ...(symbols ? [`use-symbols="${symbols}"`] : []), ...(staff ? [`staff="${staff}"`] : [])]
    return [...styleWarnings, {code: 'unsupported-notation' as const, partNumber, measureNumber,
      path: `part[${partNumber}].measure[${measureNumber}].attributes[${attributeIndex}].measure-style[${index + 1}].multiple-rest`,
      message: `Unrepresented multimeasure rest grouping (${facts.join(', ')}) is not retained by the current measure model. Measures are displayed individually. Keep the original MusicXML and compare grouped rests and re-export.`}]
  })
}

// Keep each raw note/container occurrence; do not map it to a tie or slur.
function collectAdditionalNotationWarnings(note: XmlNode, partNumber: number, measureNumber: number, eventIndex: number): MusicXmlImportWarning[] {
  return toArray(note.notations as XmlNode | XmlNode[] | undefined).flatMap((notations, containerIndex) =>
    (['arpeggiate', 'non-arpeggiate', 'glissando', 'slide', 'accidental-mark', 'other-notation'] as const).flatMap(kind =>
      toArray(notations[kind] as XmlNode | XmlNode[] | undefined).map((mark, index) => {
        const facts = ['type', 'direction', 'number', 'line-type'].flatMap(name => {
          const value = readOptionalString(mark, `@_${name}`)
          return value === undefined ? [] : [`${name}="${value}"`]
        })
        if (kind === 'accidental-mark' || kind === 'other-notation') facts.push(`source=${JSON.stringify(mark)}`)
        return {code: 'unsupported-notation' as const, partNumber, measureNumber, eventIndex,
          path: `part[${partNumber}].measure[${measureNumber}].note[${eventIndex}].notations[${containerIndex + 1}].${kind}[${index + 1}]`,
          message: `Unrepresented additional notation (${[kind, ...facts].join(', ')}) is not preserved by the current note model. Keep the original MusicXML and compare notation, playback and re-export.`}
      })
    )
  )
}

const standardAccidentals = new Map([
  ['flat-flat', { glyph: 'accidentalDoubleFlat', alter: -2 }],
  ['flat', { glyph: 'accidentalFlat', alter: -1 }],
  ['natural', { glyph: 'accidentalNatural', alter: 0 }],
  ['sharp', { glyph: 'accidentalSharp', alter: 1 }],
  ['double-sharp', { glyph: 'accidentalDoubleSharp', alter: 2 }]
])

function collectAccidentalAppearanceWarnings(note: XmlNode, partNumber: number, measureNumber: number, eventIndex: number): MusicXmlImportWarning[] {
  const value = readOptionalString(note, 'accidental')
  if (value === undefined) return []
  const accidental = readOptionalNode(note, 'accidental') ?? {}
  const standard = standardAccidentals.get(value)
  const pitch = readOptionalNode(note, 'pitch')
  const conflictingPitch = pitch && standard && (readOptionalIntegralSemitones(pitch, 'alter') ?? 0) !== standard.alter
  const facts = { value, smufl: readOptionalString(accidental, '@_smufl'),
    ...(conflictingPitch ? { pitchAlter: readOptionalString(pitch, 'alter') ?? null } : {}),
    parentheses: readOptionalString(accidental, '@_parentheses'), bracket: readOptionalString(accidental, '@_bracket'),
    editorial: readOptionalString(accidental, '@_editorial'), cautionary: readOptionalString(accidental, '@_cautionary'),
    size: readOptionalString(accidental, '@_size') }
  // Display/editorial metadata is separate from pitch/alter.
  const customGlyph = standard === undefined || (facts.smufl !== undefined && facts.smufl !== standard.glyph)
  const nonDefault = conflictingPitch || customGlyph ||
    [facts.parentheses, facts.bracket, facts.editorial, facts.cautionary].some(value => value === 'yes') ||
    (facts.size !== undefined && facts.size !== 'full')
  if (!nonDefault) return []
  return [{ code: 'unsupported-notation', partNumber, measureNumber, eventIndex,
    path: `part[${partNumber}].measure[${measureNumber}].note[${eventIndex}].accidental`,
    message: `Unrepresented accidental appearance ${JSON.stringify(facts)} is not retained by the current note model. Original glyph, parentheses, size and cautionary/editorial indications may differ in Studio and re-export. Keep the original MusicXML and compare notation and output.` }]
}

function collectNoteheadWarnings(note: XmlNode, partNumber: number, measureNumber: number, eventIndex: number): MusicXmlImportWarning[] {
  const shape = readOptionalString(note, 'notehead')
  if (shape === undefined || 'rest' in note) return []
  const head = readOptionalNode(note, 'notehead')
  const filled = head && readOptionalString(head, '@_filled')
  const parentheses = head && readOptionalString(head, '@_parentheses')
  const smufl = head && readOptionalString(head, '@_smufl')
  // Attached grace notes currently render as eighths; regular notes keep type.
  const normallyFilled = 'grace' in note || !['half', 'whole'].includes(readOptionalString(note, 'type') ?? '')
  const fillOverride = filled !== undefined && filled !== (normallyFilled ? 'yes' : 'no')
  if (shape === 'normal' && !fillOverride && parentheses !== 'yes' && !smufl) return []
  const facts = [`shape="${shape}"`, ...(filled ? [`filled="${filled}"`] : []),
    ...(parentheses ? [`parentheses="${parentheses}"`] : []), ...(smufl ? [`smufl="${smufl}"`] : [])].join(', ')
  return [{ code: 'unsupported-notation', partNumber, measureNumber, eventIndex,
    path: `part[${partNumber}].measure[${measureNumber}].note[${eventIndex}].notehead`,
    message: `Explicit notehead appearance (${facts}) is not represented by the current note model. Keep the original MusicXML and compare noteheads and re-export.` }]
}

// This text is an appearance override, not a lyric or a change of sounding pitch.
function collectNoteheadTextWarnings(note: XmlNode, partNumber: number, measureNumber: number, eventIndex: number): MusicXmlImportWarning[] {
  const text = readOptionalNode(note, 'notehead-text')
  if (!text) return []
  const displayCount = toArray(text['display-text'] as XmlNode | XmlNode[] | undefined).length
  const accidentalCount = toArray(text['accidental-text'] as XmlNode | XmlNode[] | undefined).length
  return [{ code: 'unsupported-notation', partNumber, measureNumber, eventIndex,
    path: `part[${partNumber}].measure[${measureNumber}].note[${eventIndex}].notehead-text`,
    message: `Unrepresented notehead text (display-text=${displayCount}, accidental-text=${accidentalCount}) is not preserved by the current note model. Keep the original MusicXML and compare noteheads and re-export.` }]
}

function collectNoteVelocityWarnings(note:XmlNode,partNumber:number,measureNumber:number,eventIndex:number):MusicXmlImportWarning[]{
  return(['dynamics','end-dynamics']as const).flatMap(attribute=>{
    const value=readOptionalString(note,`@_${attribute}`)
    return value===undefined?[]:[{code:'unsupported-notation' as const,measureNumber,eventIndex,
      path:`part[${partNumber}].measure[${measureNumber}].note[${eventIndex}].${attribute}`,
      message:`Explicit note ${attribute} (${value}% of default forte) is not imported separately. Keep the original MusicXML and compare playback loudness.`}]
  })
}

// Preserve the current scalar/measure projection. These source components are
// diagnostic facts, not a synthesized compound dynamic or an ordered playback model.
function dynamicMarkingComponents(node: unknown): Array<{kind:string;text?:string}> {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return []
  const components:Array<{kind:string;text?:string}>=[]
  for (const [kind, value] of Object.entries(node as XmlNode)) {
    if (kind.startsWith('@_') || kind === '#text') continue
    for (const item of toArray(value as XmlNode | string | number | (XmlNode | string | number)[] | undefined)) {
      if (kind === 'other-dynamics') {
        const text=readTextNode(item)
        if (text) components.push({kind,text})
      } else components.push({kind})
    }
  }
  return components
}

function collectDynamicMarkingWarnings(direction:XmlNode,partNumber:number,measureNumber:number,directionIndex:number):MusicXmlImportWarning[] {
  return readDirectionTypes(direction).flatMap((type,typeIndex)=>{
    const elements=toArray(type.dynamics as XmlNode | XmlNode[] | undefined)
    const components=elements.flatMap(dynamicMarkingComponents)
    if (!components.length) return []
    const scalar=readOptionalNode(type,'dynamics')
    const retainedValue=scalar?Object.keys(scalar).find(key=>supportedDynamicValues.includes(key as DynamicValue)):undefined
    if (!Array.isArray(type.dynamics) && components.length===1 && retainedValue!==undefined &&
      supportedDynamicValues.includes(components[0].kind as DynamicValue)) return []
    return [{code:'unsupported-direction' as const,partNumber,measureNumber,
      path:`part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].direction-type[${typeIndex+1}].dynamics`,
      message:`Unrepresented dynamic marking ${JSON.stringify({elements:elements.length,components,retainedValue:retainedValue??null})} is not retained intact by the current scalar measure model. Existing imported values and playback are unchanged. Keep the original MusicXML and compare dynamic markings and re-export.`}]
  })
}

function collectNoteDynamicMarkingWarnings(note:XmlNode,partNumber:number,measureNumber:number,eventIndex:number):MusicXmlImportWarning[] {
  return toArray(note.notations as XmlNode | XmlNode[] | undefined).flatMap((notations,containerIndex)=>
    toArray(notations.dynamics as XmlNode | XmlNode[] | undefined).flatMap((mark,index)=>{
      const components=dynamicMarkingComponents(mark)
      return components.length?[{code:'unsupported-notation' as const,partNumber,measureNumber,eventIndex,
        path:`part[${partNumber}].measure[${measureNumber}].note[${eventIndex}].notations[${containerIndex+1}].dynamics[${index+1}]`,
        message:`Unrepresented note-attached dynamics ${JSON.stringify({components})} is not imported by the current measure-only dynamic model. Existing note loudness diagnostics and playback are unchanged. Keep the original MusicXML and compare note or rest markings and re-export.`}]:[]
    })
  )
}

function collectUnsupportedNoteWarnings(
  noteNode: XmlNode,
  measureNumber: number,
  eventIndex: number
): MusicXmlImportWarning[] {
  const containers = toArray(noteNode.notations as XmlNode | XmlNode[] | undefined)
  return containers.flatMap((notations, index) => {
    const warnings = collectUnsupportedNotationWarnings(noteNode, notations, measureNumber, eventIndex)
    // Preserve legacy single-container paths. Multiple containers need their
    // own addresses before the existing part-prefix/deduplication pass.
    return containers.length === 1 ? warnings : warnings.map(warning => ({
      ...warning, path: warning.path.replace('.notations', `.notations[${index + 1}]`)
    }))
  })
}

function hasNotationMarks(notations: XmlNode): boolean {
  return Object.entries(notations).some(([key, value]) => {
    if (key.startsWith('@_') || ['#text', 'footnote', 'level'].includes(key)) return false
    if (['technical', 'articulations', 'ornaments', 'dynamics'].includes(key)) {
      return toArray(value as XmlNode | XmlNode[] | undefined).some(group =>
        group && typeof group === 'object' && !Array.isArray(group) &&
        Object.keys(group).some(child => !child.startsWith('@_') && child !== '#text'))
    }
    // Empty scalar marks such as <fermata/> are meaningful; an empty
    // editorial/container group above does not itself create a printed mark.
    return value !== undefined && value !== null
  })
}

function collectEditorialWarnings(
  node: XmlNode,
  owner: 'notation' | 'barline',
  path: string,
  address: Pick<MusicXmlImportWarning, 'measureNumber' | 'eventIndex' | 'partNumber'>
): MusicXmlImportWarning[] {
  const warnings: MusicXmlImportWarning[] = []
  if (!node || typeof node !== 'object') return warnings
  for (const kind of ['footnote', 'level'] as const) {
    const sources = sourceNotationFacts.get(node)?.[kind] ??
      toArray(node[kind] as XmlNode | XmlNode[] | undefined)
    sources.forEach((source, index) => {
      const meaningful = typeof source === 'object' ? Object.entries(source).some(([key, value]) => {
        if (key === '#text') return String(value).length > 0
        if (kind === 'level' && ((key === '@_reference' && String(value).trim() === 'no') ||
          (key === '@_type' && String(value).trim() === 'single'))) return false
        return true
      }) : String(source).length > 0
      if (!meaningful) return
      const reference = kind === 'level' && typeof source === 'object' && readOptionalString(source, '@_reference') === 'yes'
      warnings.push({
        code: 'unsupported-notation', ...address,
        path: `${path}.${kind}${sources.length > 1 ? `[${index + 1}]` : ''}`,
        message: `Unrepresented ${owner} editorial ${reference ? 'reference ' : ''}${JSON.stringify({ kind, source })}${owner === 'barline' ? ` (location=${JSON.stringify(readOptionalString(node, '@_location') ?? 'right')})` : ''} is not retained by the current ${owner === 'barline' ? 'measure/barline' : 'notation'} model. Editorial display or playback scope and re-export may differ. Keep the original MusicXML and compare notation, playback and output.`
      })
    })
  }
  return warnings
}

function collectUnsupportedNotationWarnings(
  noteNode: XmlNode,
  notations: XmlNode,
  measureNumber: number,
  eventIndex: number
): MusicXmlImportWarning[] {
  const warnings: MusicXmlImportWarning[] = []
  if (!notations || typeof notations !== 'object') return warnings

  const notationPath = `measure[${measureNumber}].note[${eventIndex}].notations`
  warnings.push(...collectEditorialWarnings(notations, 'notation', notationPath, { measureNumber, eventIndex }))
  const fermatas = sourceNotationFacts.get(notations)?.fermata ??
    toArray(notations.fermata as XmlNode | XmlNode[] | undefined)
  const fermataCount = toArray(noteNode.notations as XmlNode | XmlNode[] | undefined)
    .reduce((count, group) => count + (group && typeof group === 'object'
      ? toArray(group.fermata as XmlNode | XmlNode[] | undefined).length : 0), 0)
  fermatas.forEach((source, index) => {
    const shape = (typeof source === 'object' ? readOptionalString(source, '#text') : String(source).trim()) || 'normal'
    const type = (typeof source === 'object' ? readOptionalString(source, '@_type') : undefined) ?? 'upright'
    if (shape === 'normal' && type === 'upright' && fermataCount === 1) return
    warnings.push({
      code: 'unsupported-notation', measureNumber, eventIndex,
      path: `${notationPath}.fermata${fermatas.length > 1 ? `[${index + 1}]` : ''}`,
      message: `Unrepresented fermata appearance ${JSON.stringify({ shape, type, count: fermataCount, source })} is reduced to one normal upright fermata by the current Boolean model. Existing imported music and hold timing are unchanged. Keep the original MusicXML and compare notation, playback and re-export.`
    })
  })
  // The current attachment model does not retain container visibility.
  // Diagnose this independently of note visibility without hiding marks or
  // changing their existing performance projection.
  if (readOptionalString(notations, '@_print-object') === 'no' && hasNotationMarks(notations)) {
    warnings.push({
      code: 'unsupported-notation',
      message: 'Unrepresented notation visibility {"printObject":"no"} is not retained by the current notation model. Hidden marks may appear in Studio and re-export. Keep the original MusicXML and compare notation and output.',
      measureNumber,
      eventIndex,
      path: `${notationPath}.@print-object`
    })
  }
  const technicalGroups = toArray(notations.technical as XmlNode | XmlNode[] | undefined)
  technicalGroups.forEach((technical, index) => {
    if (!technical || typeof technical !== 'object' || Array.isArray(technical)) return
    warnings.push({
      code: 'unsupported-notation',
      message: 'technical playing instructions are not imported yet.',
      measureNumber,
      eventIndex,
      path: `${notationPath}.technical${technicalGroups.length > 1 ? `[${index + 1}]` : ''}`
    })
  })

  const articulationGroups = toArray(notations.articulations as XmlNode | XmlNode[] | undefined)
  const supportedArticulations = new Set([
    'accent',
    'breath-mark',
    'caesura',
    'marcato',
    'strong-accent',
    'staccato',
    'tenuto'
  ])

  articulationGroups.forEach((articulations, groupIndex) => {
    if (!articulations || typeof articulations !== 'object' || Array.isArray(articulations)) return
    const articulationPath = `${notationPath}.articulations${articulationGroups.length > 1 ? `[${groupIndex + 1}]` : ''}`
    Object.keys(articulations ?? {})
      .filter((key) => !key.startsWith('@_') && !supportedArticulations.has(key))
      .forEach((key) => {
        warnings.push({
          code: 'unsupported-notation',
          message: `${key} articulation is not imported yet.`,
          measureNumber,
          eventIndex,
          path: `${articulationPath}.${key}`
        })
      })

    toArray(articulations?.['strong-accent'] as XmlNode | XmlNode[] | undefined).forEach((mark, index) => {
      const direction = readOptionalString(mark, '@_type')
      const path = `${articulationPath}.strong-accent[${index + 1}]`
      const unsupportedOwner = 'rest' in noteNode ? 'a rest' : 'grace' in noteNode ? 'a grace note' : 'chord' in noteNode ? 'a secondary chord member' : undefined
      if (unsupportedOwner) warnings.push({
        code: 'unsupported-notation', message: `strong-accent on ${unsupportedOwner} is not imported yet.`,
        measureNumber, eventIndex, path
      })
      if (direction !== undefined && direction !== 'up') warnings.push({
        code: 'unsupported-notation',
        message: direction === 'down'
          ? 'downward strong-accent placement is not imported yet.'
          : `strong-accent type ${direction} is not imported yet.`,
        measureNumber, eventIndex,
        path
      })
      const placement = readOptionalString(mark, '@_placement')
      if (placement !== undefined && placement !== 'above') warnings.push({
        code: 'unsupported-notation',
        message: placement === 'below' ? 'below-staff strong-accent placement is not imported yet.' : `strong-accent placement ${placement} is not imported yet.`,
        measureNumber, eventIndex, path
      })
      if (['default-x', 'default-y', 'relative-x', 'relative-y'].some(name => readOptionalString(mark, `@_${name}`) !== undefined)) warnings.push({
        code: 'unsupported-notation', message: 'strong-accent manual position is not imported yet.',
        measureNumber, eventIndex, path
      })
    })
  })

  const ornamentGroups = toArray(notations.ornaments as XmlNode | XmlNode[] | undefined)
  const supportedOrnaments = new Set(['mordent', 'inverted-mordent', 'tremolo', 'trill', 'trill-mark', 'turn'])
  const tremoloCount = readTremoloCandidates(noteNode).length

  ornamentGroups.forEach((ornaments, groupIndex) => {
    if (!ornaments || typeof ornaments !== 'object' || Array.isArray(ornaments)) return
    const ornamentPath = `${notationPath}.ornaments${ornamentGroups.length > 1 ? `[${groupIndex + 1}]` : ''}`
    Object.keys(ornaments ?? {})
      .filter((key) => !key.startsWith('@_') && !supportedOrnaments.has(key))
      .forEach((key) => {
        warnings.push({
          code: 'unsupported-notation',
          message: `${key} ornament is not imported yet.`,
          measureNumber,
          eventIndex,
          path: `${ornamentPath}.${key}`
        })
      })

    // The scalar reader deliberately retains none of several instructions.
    // Report each original location without choosing, merging or changing
    // their existing score/playback projection.
    const tremolos = toArray(ornaments.tremolo)
    if (tremoloCount > 1) tremolos.forEach((_mark, index) => {
      warnings.push({
        code: 'unsupported-notation',
        message: `Multiple tremolo instructions (count=${tremoloCount}) are not represented by the current single-instruction note model. No instruction is chosen or combined. Keep the original MusicXML and compare tremolos, playback and re-export.`,
        measureNumber,
        eventIndex,
        path: `${ornamentPath}.tremolo${tremolos.length > 1 ? `[${index + 1}]` : ''}`
      })
    })
  })

  return warnings
}

function collectUnsupportedDirectionWarnings(
  direction: XmlNode,
  measureNumber: number,
  directionIndex: number,
  partNumber: number
): MusicXmlImportWarning[] {
  const supportedDirectionTypes = new Set([
    'dynamics',
    'metronome',
    'octave-shift',
    'pedal',
    'rehearsal',
    'wedge',
    'words'
  ])

  const warnings: MusicXmlImportWarning[]=readDirectionTypes(direction).flatMap((directionType, typeIndex) =>
    Object.keys(directionType)
      .filter(key => !key.startsWith('@_'))
      .flatMap(key => {
        const appearance = importedNavigationAppearance.get(directionType)
        const imported = appearance?.fields.includes(key) ? appearance : undefined
        if (imported ? !imported.appearanceChanged || key !== imported.fields[0] : supportedDirectionTypes.has(key)) return []
        return [{
          code: 'unsupported-direction' as const,
          message: imported
            ? `Navigation appearance "${key}" uses Studio's automatic position and standard styling. Source styling and coordinates are not retained.`
            : `${key} direction is not imported yet.`,
          measureNumber,
          path: `measure[${measureNumber}].direction[${directionIndex}].direction-type[${typeIndex + 1}].${key}`
        }]
      })
  )
  warnings.push(...collectDynamicMarkingWarnings(direction,partNumber,measureNumber,directionIndex))
  readDirectionTypes(direction).forEach((type, typeIndex) => {
    const wedges = toArray(type.wedge as XmlNode | XmlNode[] | undefined)
    wedges.forEach((wedge, wedgeIndex) => {
      const wedgePath = wedges.length > 1 ? `wedge[${wedgeIndex + 1}]` : 'wedge'
      const path = `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].direction-type[${typeIndex + 1}].${wedgePath}`
      const stop = unrepresentedHairpinStops.get(wedge)
      if (stop) warnings.push({
        code: 'unsupported-direction', partNumber, measureNumber, path,
        message: `Unrepresented hairpin stop position ${JSON.stringify(stop)}. The imported wedge retains the onset of the ending event in the notation. Keep the original MusicXML and compare export and playback.`
      })
      if (readOptionalString(wedge, '@_type') !== 'continue') return
      const appearance: Record<string, string> = {}
      for (const key of ['spread', 'default-x', 'default-y', 'relative-x', 'relative-y',
        'line-type', 'dash-length', 'space-length', 'color']) {
        const value = readOptionalString(wedge, `@_${key}`)
        if (value !== undefined && !(key === 'line-type' && value === 'solid')) appearance[key] = value
      }
      if (readOptionalString(direction, '@_placement') === 'above') appearance.placement = 'above'
      if (Object.keys(appearance).length === 0) return
      warnings.push({ code: 'unsupported-direction', partNumber, measureNumber, path,
        message: `Unrepresented hairpin continuation appearance ${JSON.stringify(appearance)} is not retained. The hairpin keeps its endpoints and uses Studio's automatic layout. Keep the original MusicXML and compare the printed segments and re-export.` })
    })
  })
  // Supported scalar markings currently keep only their measure anchor. Report
  // lost source scope without changing that projection or inventing beat/voice fields.
  readDirectionTypes(direction).forEach((type, typeIndex) => {
    const dynamic = readOptionalNode(type, 'dynamics')
    if (!dynamic || !Object.keys(dynamic).some(key => supportedDynamicValues.includes(key as DynamicValue))) return
    const tick = directionTicks.get(direction) ?? 0
    const voice = readOptionalString(direction, 'voice')
    if (tick === 0 && voice === undefined) return
    const offset = readOptionalString(direction, 'offset')
    warnings.push({ code: 'unsupported-direction', partNumber, measureNumber,
      path: `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].direction-type[${typeIndex + 1}].dynamics`,
      message: `Unrepresented dynamic scope (position=${tick / TICKS_PER_QUARTER} quarter-beats${offset === undefined ? '' : `, offset=${JSON.stringify(offset)}`}${voice === undefined ? '' : `, voice=${JSON.stringify(voice)}`}) is reduced to a measure-level dynamic value. Only the first stored marking in a measure is displayed and played. Keep the original MusicXML and compare dynamics and re-export.` })
  })
  // Multiple words in one direction-type are separate formatted/positioned
  // source components. The current string-only readers do not import arrays;
  // report the loss without guessing spaces, positions or a rich-text model.
  readDirectionTypes(direction).forEach((type, typeIndex) => {
    const words = type.words
    if (!Array.isArray(words) || words.length < 2 || !words.some(word => readTextNode(word))) return
    warnings.push({ code: 'unsupported-direction', partNumber, measureNumber,
      path: `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].direction-type[${typeIndex + 1}].words`,
      message: `Unrepresented words components (count=${words.length}) are not imported as a text object by the current string-only model. Keep the original MusicXML and compare text and re-export.` })
  })
  // rehearsal also permits multiple formatted components in one direction-type.
  // Preserve the string-only model: warn about its existing loss, never join
  // styled fragments or reinterpret them as independent rehearsal objects.
  readDirectionTypes(direction).forEach((type, typeIndex) => {
    const components = type.rehearsal
    if (!Array.isArray(components) || components.length < 2 || !components.some(component => readTextNode(component))) return
    warnings.push({ code: 'unsupported-direction', partNumber, measureNumber,
      path: `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].direction-type[${typeIndex + 1}].rehearsal`,
      message: `Unrepresented rehearsal components (count=${components.length}) are not imported as a rehearsal mark by the current string-only model. Keep the original MusicXML and compare rehearsal marks and re-export.` })
  })
  // Match the existing staff-text reader. System bold, expression italic and
  // paired tempo words already have their own interpretation; do not report
  // those as an unsupported staff-text style or duplicate component loss.
  const textTypes = readDirectionTypes(direction)
  const tempoWords = findTempoWordsDirectionType(textTypes,
    textTypes.find(type => Boolean(readOptionalNode(type, 'metronome'))))
  // Staff/system text keeps a measure anchor, not the source musical cursor.
  // Reuse the ordered direction index for divisions/backup/forward/offset;
  // do not invent a tick field or reinterpret expression/tempo/manual text.
  textTypes.forEach((type, typeIndex) => {
    if (importedNavigationAppearance.get(type)?.fields.includes('words')) return
    if (Array.isArray(type.words) || type === tempoWords || readOptionalNode(type, 'metronome') ||
      isExpressionTextDirection(direction, type)) return
    const text = readOptionalString(type, 'words')
    const words = readOptionalNode(type, 'words')
    if (!text || parseRhythmFeelText(text) || readOptionalString(words ?? {}, '@_default-x') !== undefined) return
    const tick = directionTicks.get(direction) ?? 0
    if (tick === 0) return
    const scope = isSystemTextDirection(direction) ? 'system' : 'staff'
    const offset = readOptionalString(direction, 'offset')
    warnings.push({ code: 'unsupported-direction', partNumber, measureNumber,
      path: `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].direction-type[${typeIndex + 1}].words`,
      message: `Unrepresented ${scope} text position (position=${tick / TICKS_PER_QUARTER} quarter-beats${offset === undefined ? '' : `, offset=${JSON.stringify(offset)}`}) is reduced to a measure-level text anchor. Text content is imported. Keep the original MusicXML and compare text attachment and re-export.` })
  })
  textTypes.forEach((type, typeIndex) => {
    if (importedNavigationAppearance.get(type)?.fields.includes('words')) return
    if (Array.isArray(type.words) || type === tempoWords || readOptionalNode(type, 'metronome') ||
      isSystemTextDirection(direction) || isExpressionTextDirection(direction, type)) return
    const text = readOptionalString(type, 'words')
    const words = readOptionalNode(type, 'words')
    if (!text || parseRhythmFeelText(text) || readOptionalString(words ?? {}, '@_font-weight') !== 'bold') return
    warnings.push({ code: 'unsupported-direction', partNumber, measureNumber,
      path: `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].direction-type[${typeIndex + 1}].words.@font-weight`,
      message: 'Unrepresented staff text font-weight "bold" is not retained by the current plain staff-text model. Text content is imported. Keep the original MusicXML and compare text formatting and re-export.' })
  })
  // Expression text retains italic in its model/serializer. Other scalar words
  // kinds lose the explicit override; arrays already have component-loss notice.
  textTypes.forEach((type, typeIndex) => {
    if (importedNavigationAppearance.get(type)?.fields.includes('words')) return
    if (Array.isArray(type.words) || isExpressionTextDirection(direction, type)) return
    const text = readOptionalString(type, 'words')
    const words = readOptionalNode(type, 'words')
    if (!text || readOptionalString(words ?? {}, '@_font-style') !== 'italic') return
    warnings.push({ code: 'unsupported-direction', partNumber, measureNumber,
      path: `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].direction-type[${typeIndex + 1}].words.@font-style`,
      message: 'Unrepresented words font-style "italic" is not retained by the current text model. Keep the original MusicXML and compare text formatting and re-export.' })
  })
  // The scalar text models retain content and their supported semantic styles,
  // but no explicit font family/size/color override. Arrays already report component
  // loss; do not duplicate that notice or infer a new rich-text representation.
  textTypes.forEach((type, typeIndex) => {
    if (importedNavigationAppearance.get(type)?.fields.includes('words')) return
    if (Array.isArray(type.words) || !readOptionalString(type, 'words')) return
    const words = readOptionalNode(type, 'words')
    for (const attribute of ['font-family', 'font-size', 'color'] as const) {
      const value = readOptionalString(words ?? {}, `@_${attribute}`)
      if (!value) continue
      // Our hidden tempo export uses alpha-zero words alongside a hidden
      // metronome. Its visibility is retained as transparent, not a color loss.
      if (attribute === 'color' && type === tempoWords && /^#00[0-9a-f]{6}$/i.test(value) &&
        (readOptionalString(direction, '@_print-object') === 'no' ||
          textTypes.some(type => readOptionalString(readOptionalNode(type, 'metronome') ?? {}, '@_print-object') === 'no'))) continue
      warnings.push({ code: 'unsupported-direction', partNumber, measureNumber,
        path: `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].direction-type[${typeIndex + 1}].words.@${attribute}`,
        message: `Unrepresented words ${attribute} ${JSON.stringify(value)} is not retained by the current text model. Text content and playback meaning are imported. Keep the original MusicXML and compare text formatting and re-export.` })
    }
  })
  const pedals = readDirectionTypes(direction).flatMap(type => toArray(type.pedal as XmlNode | XmlNode[] | undefined))
  const pedalWarnings = pedals.flatMap<MusicXmlImportWarning>((pedal, index) => {
    if (!['start', 'stop', 'change'].includes(readOptionalString(pedal, '@_type') ?? '') ||
      (readOptionalInteger(pedal, '@_number') ?? 1) !== 1 || readOptionalString(pedal, '@_line') === 'yes') {
      return [{ code: 'unsupported-direction', message: 'Only single damper pedal start/stop/change playback is imported; other pedal types and line geometry are not represented.',
        measureNumber, path: `measure[${measureNumber}].direction[${directionIndex}].pedal` }]
    }
    // MusicXML defaults to a visible sign when no pedal line is requested.
    // CC64 is already retained; its printed sign has no notation model.
    if (readOptionalString(pedal, '@_sign') === 'no') return []
    const appearance = { type: readOptionalString(pedal, '@_type'), sign: readOptionalString(pedal, '@_sign'), line: readOptionalString(pedal, '@_line') }
    return [{ code: 'unsupported-direction', partNumber, measureNumber,
      path: `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].pedal[${index + 1}]`,
      message: `Unrepresented pedal sign ${JSON.stringify(appearance)} is not retained by the current notation model; supported damper playback data is imported. Keep the original MusicXML and compare notation and re-export.` }]
  })
  return [...warnings,...pedalWarnings,...collectIndependentTempoWarnings(direction,measureNumber,directionIndex,partNumber),
    ...collectMidiInstrumentWarnings(readOptionalNode(direction, 'sound'),
      `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].sound`, partNumber, measureNumber),
    ...collectPlaybackTechniqueWarnings(readOptionalNode(direction, 'sound'), 'sound',
      `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].sound`, partNumber, measureNumber),
    ...collectSoundDynamicsWarnings(readOptionalNode(direction,'sound'),
      `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].sound`,measureNumber),
    ...collectUnrepresentedSoundPedalWarnings(readOptionalNode(direction, 'sound'),
      `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].sound`, partNumber, measureNumber),
    ...collectPizzicatoWarnings(readOptionalNode(direction, 'sound'), 'sound',
      `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].sound`, partNumber, measureNumber),
    ...collectPlaybackNavigationSoundWarnings(readOptionalNode(direction, 'sound'),
      `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}].sound`, partNumber, measureNumber)]
}

function collectPlaybackNavigationSoundWarnings(sound: XmlNode | undefined, path: string,
  partNumber: number, measureNumber: number): MusicXmlImportWarning[] {
  if (!sound || importedNavigationSounds.has(sound)) return []
  const warnings: MusicXmlImportWarning[] = []
  for (const attribute of navigationSoundAttributes) {
    const value = readOptionalString(sound, `@_${attribute}`)
    if (value === undefined || value.length === 0 ||
      ((attribute === 'dacapo' || attribute === 'forward-repeat') && value === 'no')) continue
    warnings.push({ code: 'unsupported-direction', partNumber, measureNumber, path: `${path}.${attribute}`,
      message: `Playback navigation sound "${attribute}" value "${value}" is not represented by the current repeat/jump model. Keep the original MusicXML and compare navigation and playback.` })
  }
  return warnings
}

function collectUnrepresentedSoundPedalWarnings(sound: XmlNode | undefined, path: string,
  partNumber: number, measureNumber: number): MusicXmlImportWarning[] {
  if (!sound) return []
  // Damper CC64 already has its own reader. Soft/sostenuto instructions have
  // no model; an explicit release (no/0) is still a source instruction to retain
  // in diagnostics. Do not invent playback or change the supported damper plan.
  return (['soft-pedal', 'sostenuto-pedal'] as const).flatMap(attribute => {
    const value = readOptionalString(sound, `@_${attribute}`)
    return value === undefined ? [] : [{
      code: 'unsupported-direction' as const, partNumber, measureNumber,
      path: `${path}.@${attribute}`,
      message: `Unrepresented sound pedal ${attribute} ${JSON.stringify(value)} is not retained by the current damper-only playback model. Keep the original MusicXML and compare pedal playback and re-export.`
    }]
  })
}

function collectSoundDynamicsWarnings(sound:XmlNode|undefined,path:string,measureNumber:number):MusicXmlImportWarning[]{
  const value=sound?readOptionalString(sound,'@_dynamics'):undefined
  return value===undefined?[]:[{code:'unsupported-direction',measureNumber,path:path+'.dynamics',
    message:`Explicit sound dynamics (${value}% of default forte) is not imported separately. Keep the original MusicXML and compare playback loudness.`}]
}

function collectIndependentTempoWarnings(direction: XmlNode, measureNumber: number, directionIndex: number, partNumber: number): MusicXmlImportWarning[] {
  const sound = readOptionalNode(direction, 'sound')
  const soundTempo = sound ? readOptionalNumber(sound, '@_tempo') : undefined
  const warnings: MusicXmlImportWarning[] = []
  const path = `part[${partNumber}].measure[${measureNumber}].direction[${directionIndex}]`
  const types = readDirectionTypes(direction)
  const typeIndex = types.findIndex(type => Boolean(readOptionalNode(type, 'metronome')))
  const metronomeType = types[typeIndex]
  const metronome = metronomeType ? readOptionalNode(metronomeType, 'metronome') : undefined
  const playback = readMetronomePlayback(metronome, soundTempo)
  // Report the existing primary metronome fallback without widening native or
  // authoring ranges. Secondary instructions are not applied to this clock.
  if (partNumber === 1 && !playback.unitConversion && playback.raw !== undefined && playback.value !== undefined &&
    (playback.value <= 0 || playback.value > 1000)) {
    warnings.push({ code: 'unsupported-direction', partNumber, measureNumber,
      path: `${path}.direction-type[${typeIndex + 1}].metronome.per-minute`,
      message: `Normalized metronome tempo (source="${playback.value}", applied="${normalizeTempo(playback.value)}", beat-unit="${playback.beatUnit ?? 'quarter'}", dots="${playback.dots}", per-minute=${JSON.stringify(playback.raw)}). The original value is outside the current native range; the existing fallback was retained. Keep the original MusicXML and compare playback and re-export.` })
  }
  if (playback.unitConversion) {
    const applied = playback.unitConversion.tempo
    warnings.push({ code: 'unsupported-direction', partNumber, measureNumber,
      path: `${path}.direction-type[${typeIndex + 1}].metronome.beat-unit`,
      message: partNumber === 1 && applied
        ? `Converted metronome beat unit (source-unit="${playback.beatUnit}", source-dots="${playback.dots}", per-minute=${JSON.stringify(playback.raw)}, applied-unit="${applied.beatUnit}", applied-dots="${applied.dots}", applied-bpm="${applied.bpm}", quarter-bpm="${playback.unitConversion.quarterBpm}"). Equivalent playback is retained; the original beat-unit notation is not. Keep the original MusicXML and compare notation and re-export.`
        : `Unrepresented metronome beat unit (source-unit="${playback.beatUnit}", source-dots="${playback.dots}", per-minute=${JSON.stringify(playback.raw)}). Secondary-part tempo is not applied as a global instruction. Keep the original MusicXML and compare part notation and playback.` })
  }
  const wordsType = findTempoWordsDirectionType(types, metronomeType)
  const words = wordsType ? readOptionalString(wordsType, 'words') : undefined
  const visible = readOptionalString(direction, '@_print-object') !== 'no' &&
    readOptionalString(metronome ?? {}, '@_print-object') !== 'no'
  if (playback.formatted && playback.raw && (partNumber !== 1 ||
    (visible && (!playback.preserveText || (words && !words.includes(playback.raw)))))) {
    const reason = partNumber !== 1 ? 'secondary-part tempo is not applied as a global instruction'
      : 'the current single label retains explicit words instead of the separate metronome text'
    warnings.push({ code: 'unsupported-direction', partNumber, measureNumber,
      path: `${path}.direction-type[${typeIndex + 1}].metronome.per-minute`,
      message: `Unrepresented metronome tempo text "${playback.raw}" (${reason}). Keep the original MusicXML and compare notation, playback and re-export.` })
  }
  if (!sound || soundTempo === undefined) return warnings
  const quarter = playback.unitConversion?.quarterBpm ?? (playback.value !== undefined && isTempoBeatUnit(playback.beatUnit)
    ? playback.value * durationToTicks({ value: playback.beatUnit, dots: playback.dots }) / TICKS_PER_QUARTER : undefined)
  if (!playback.usesSound && quarter !== undefined && Number.isFinite(quarter)) {
    if (Math.abs(quarter - soundTempo) > 1e-6) warnings.push({ code: 'unsupported-direction', measureNumber,
      path: path + '.sound.tempo', message: `Independent sound tempo is not represented (metronome=${quarter} quarter BPM, sound=${soundTempo} quarter BPM).` })
  }
  const visualOffset = readOptionalString(direction, 'offset') ?? '0'
  const offsetNode = readOptionalNode(direction, 'offset')
  const soundOffset = readOptionalString(sound, 'offset')
  const playbackOffset = soundOffset ?? (readOptionalString(offsetNode ?? {}, '@_sound') === 'yes' ? visualOffset : '0')
  if (directionTicks.get(direction) !== soundTicks.get(sound)) warnings.push({ code: 'unsupported-direction', measureNumber,
    path: path + (soundOffset === undefined ? '.offset' : '.sound.offset'), message: `Independent tempo offset is not represented (notation=${visualOffset} divisions, playback=${playbackOffset} divisions).` })
  return warnings
}

function dedupeWarnings(
  warnings: MusicXmlImportWarning[]
): MusicXmlImportWarning[] {
  const seen = new Set<string>()

  return warnings.filter((warning) => {
    const key = `${warning.code}:${warning.path}:${warning.message}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function readText(node: XmlNode): string | undefined {
  return readOptionalString(node, '#text')
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
