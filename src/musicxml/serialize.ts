import { hairpinEndTick } from '../score-core/span-references'
import { hairpinEndMarkerPrefix } from './hairpin-end-marker'
import { readScoreVoiceNumber, sortScoreVoices } from '../score-core/voice-order'
import { inferHarmonyStructure, musicXmlHarmonyKinds } from './harmony-text'
import { hasManualSpanEngraving } from '../project/span-engraving'
import {createLayoutMeasureIndexResolver,resolveLayoutMeasureIndex as layoutMeasureIndex} from '../project/layout-measure-reference'
import { secondVoltaRepeatCounts, musicXmlBarlineStaff, musicXmlVoltaForExport } from './barline-scope'
import { XMLBuilder } from 'fast-xml-parser'
import { buildMusicXmlPageDefaults } from './page-layout'
import { musicXmlPartIdentifiers } from './part-identifiers'
import { assertMusicXmlOutputCharacters } from './xml-output-characters'

import {
  resolveNotePitch,
  collectMeasureNavigation,
  collectTiePairs,
  collectUnsupportedChordTieWarnings,
  convertOctaveShiftPitches,
  measureDurationTicks,
  shouldDisplayAccidental,
  sortVoiceEvents,
  validateTieRelations,
  validateMeasureRhythm,
  validateVoiceTuplets,
  voiceEventDurationTicks,
  voltaNumberText,
  type Measure,
  type Pitch,
  type RhythmFeelMarking,
  type Score,
  type VoiceEvent,
  type Voice,
} from '../score-core'
import {
  clefToMusicXml,
  divisions,
  durationToTicks
} from './shared'

const builder = new XMLBuilder({
  format: true,
  ignoreAttributes: false,
  preserveOrder: true,
  suppressEmptyNode: true
})
const defaultRhythmFeelText = {
  eighth: '♫ = ³♩ ♪',
  '16th': '♬ = ³♪ 𝅘𝅥𝅯'
} as const satisfies Record<RhythmFeelMarking['unit'], string>
type SpanDirection = Record<string, unknown>
type SpanDirections = {
  atMeasureStart: Map<Measure, SpanDirection[]>
  beforeEvent: Map<string, SpanDirection[]>
  afterEvent: Map<string, SpanDirection[]>
}
type PrintBreaks = { system: Set<number>; page: Set<number> }
type NoteBoundaries = {
  slurs: ReadonlyMap<string, { starts?: string[]; stops?: string[] }>
  respelledTieStops: ReadonlySet<string>
}

function collectPrintBreaks(score: Score): PrintBreaks {
  const indexOf=createLayoutMeasureIndexResolver(score)
  return {
    system: new Set((score.layout?.systemBreakBeforeMeasureIds ?? []).map(indexOf)),
    page: new Set((score.layout?.pageBreakBeforeMeasureIds ?? []).map(indexOf))
  }
}

export function musicXmlPrintBreaksKey(score: Score): string {
  const breaks = collectPrintBreaks(score)
  return JSON.stringify((['system', 'page'] as const).map(kind =>
    [...breaks[kind]].filter(index => index >= 0).sort((a, b) => a - b)))
}

export function serializeMusicXml(score: Score): string {
  score = convertOctaveShiftPitches(score, 'performed')
  const tieErrors = validateTieRelations(score)
  const spanLocations = collectSpanLocations(score)
  const noteBoundaries: NoteBoundaries = {
    slurs: createSlurBoundaries(score, spanLocations.events),
    respelledTieStops: new Set(collectTiePairs(score).filter(pair => pair.respellsPitch).map(pair => pair.toEventId))
  }
  const partIds = musicXmlPartIdentifiers(score.parts).ids
  const spanDirections = createSpanDirections(score, spanLocations, partIds)
  const printBreaks = collectPrintBreaks(score)

  if (tieErrors.length > 0) {
    throw new Error(`잘못된 타이 관계가 있습니다: ${tieErrors.join(', ')}`)
  }

  score.parts.forEach((part) => {
    validatePartStructure(part)
    part.staves.forEach((staff) => staff.measures.forEach(validateMeasure))
  })

  const pageDefaults = buildMusicXmlPageDefaults(score.layout?.pageSetup)
  const document = [
    xmlElement('?xml', {
      '@_version': '1.0',
      '@_encoding': 'UTF-8'
    }),
    xmlElement('score-partwise', [
      xmlElement('work', {
        'work-title': score.title
      }),
      ...(score.composer
        ? [
            xmlElement('identification', {
              creator: {
                '@_type': 'composer',
                '#text': score.composer
              }
            })
          ]
        : []),
      ...(pageDefaults ? [xmlElement('defaults', pageDefaults)] : []),
      xmlElement('part-list', {
        'score-part': score.parts.map((part, index) => ({
          '@_id': partIds[index],
          'part-name': part.name,
          ...(part.abbreviation
            ? {
                'part-abbreviation': part.abbreviation
              }
            : {})
        }))
      }),
      ...score.parts.map((part, index) =>
        xmlElement(
          'part',
          buildPartMeasureElements(score, part, noteBoundaries, spanDirections, printBreaks),
          {
            '@_id': partIds[index]
          }
        )
      )
    ], {
      '@_version': '4.0'
    })
  ]

  assertMusicXmlOutputCharacters(document)
  // XML processors normalize literal CR/CRLF before parsing (XML 1.0 §2.11).
  // Encode CR after normal escaping so Native text survives unchanged, while
  // literal strings such as "&#xD;" retain their escaped ampersand.
  return builder.build(document).replace(/\r/g, '&#xD;')
}

function validatePartStructure(part: Score['parts'][number]): void {
  if (part.staves.length === 0) {
    throw new Error(`part ${part.id}에 staff가 없습니다.`)
  }

  const measureCount = part.staves[0].measures.length

  if (measureCount === 0) {
    throw new Error(`part ${part.id}에 measure가 없습니다.`)
  }

  part.staves.forEach((staff) => {
    if (staff.measures.length !== measureCount) {
      throw new Error(
        `part ${part.id}의 staff ${staff.id} measure 수가 일치하지 않습니다.`
      )
    }
  })
}

export interface MusicXmlExportWarning {
  code: 'unsupported-layout' | 'unsupported-chord-tie' | 'converted-part-id' | 'converted-volta-passes'
    | 'trailing-grace-placement' | 'ambiguous-trailing-grace' | 'native-grace-playback'
  measureNumber?: number
  message: string
  path: string
  measureId?: string
}

export interface MusicXmlExportReport {
  warnings: MusicXmlExportWarning[]
}

export function serializeMusicXmlWithReport(score: Score): {
  contents: string
  report: MusicXmlExportReport
} {
  return {
    contents: serializeMusicXml(score),
    report: {
      warnings: [
        ...collectUnsupportedMusicXmlExportWarnings(score),
        ...(score.gracePlayback ? [{
          code: 'native-grace-playback' as const,
          path: 'score.gracePlayback',
          message: 'The leading grace playback setting is saved only in the Studio project. MusicXML retains the notated grace notes.'
        }] : []),
        ...collectUnsupportedChordTieWarnings(score),
        ...collectTrailingGraceExportWarnings(score),
        ...collectVoltaPassExportWarnings(score),
        ...musicXmlPartIdentifiers(score.parts).conversions.map(({ index, source, output }): MusicXmlExportWarning => ({
          code: 'converted-part-id', path: `part[${index + 1}].id`,
          message: `Converted part identifier (source=${JSON.stringify(source)}, output=${JSON.stringify(output)}). Native project identifiers are unchanged; only MusicXML transport references were mapped.`
        }))
      ]
    }
  }
}

function collectTrailingGraceExportWarnings(score: Score): MusicXmlExportWarning[] {
  const warnings: MusicXmlExportWarning[] = []
  for (const [partIndex, part] of score.parts.entries()) {
    for (const [staffIndex, staff] of part.staves.entries()) {
      for (const measure of staff.measures) {
        for (const [voiceIndex, voice] of measure.voices.entries()) {
          const events = sortVoiceEvents(voice.events)
          for (const [index, event] of events.entries()) {
            if (event.type !== 'note' || !event.graceNotes?.some(grace => grace.after)) continue
            const ambiguous = index < events.length - 1
            const message = ambiguous
              ? 'Ambiguous trailing grace placement before another event. MusicXML readers, including Studio, may attach these graces to the following note or reject the file.'
              : 'Terminal trailing grace placement is inferred from MusicXML note order. Other readers may omit or move these graces.'
            warnings.push({
              code: ambiguous ? 'ambiguous-trailing-grace' : 'trailing-grace-placement',
              measureNumber: measure.number, measureId: measure.id,
              path: `part[${partIndex + 1}].staff[${staffIndex + 1}].measure[${measure.number}].voice[${voiceIndex + 1}].event[${index + 1}].graceNotes`,
              message
            })
          }
        }
      }
    }
  }
  return warnings
}

function collectVoltaPassExportWarnings(score: Score): MusicXmlExportWarning[] {
  return score.parts.flatMap((part, partIndex) => {
    const staff = musicXmlBarlineStaff(score, part)
    return [...secondVoltaRepeatCounts(staff.measures)].flatMap(([measure, count]): MusicXmlExportWarning[] => {
      if (!measure.volta?.start || measure.volta.number !== 2 || count <= 2) return []
      const passes = musicXmlVoltaForExport(measure.volta, count)?.passes
      return [{
        code: 'converted-volta-passes',
        measureId: measure.id,
        measureNumber: measure.number,
        path: `part[${partIndex + 1}].measure[${measure.number}].ending`,
        message: `Converted legacy second ending ${JSON.stringify({ passes, repeatCount: count })} to explicit MusicXML passes. Project playback is preserved.`
      }]
    })
  })
}

function collectUnsupportedMusicXmlExportWarnings(
  score: Score
): MusicXmlExportWarning[] {
  const warnings: MusicXmlExportWarning[] = []

  for (const kind of ['slurs', 'hairpins'] as const) {
    for (const [index, span] of (score[kind] ?? []).entries()) {
      if (!hasManualSpanEngraving(span.engraving)) continue
      warnings.push({ code: 'unsupported-layout', path: `score.${kind}[${index}].engraving`,
        message: 'Manual span placement and shape are preserved in Chromatics projects, not MusicXML export.' })
    }
  }

  for (const [index, measureId] of (
    score.layout?.systemBreakBeforeMeasureIds ?? []
  ).entries()) {
    if (layoutMeasureIndex(score, measureId) >= 0) continue
    warnings.push({
      code: 'unsupported-layout',
      message:
        'system break has no aligned score measure and was not exported to MusicXML.',
      path: `score.layout.systemBreakBeforeMeasureIds[${index}]`,
      measureId
    })
  }

  for (const [index, measureId] of (
    score.layout?.pageBreakBeforeMeasureIds ?? []
  ).entries()) {
    if (layoutMeasureIndex(score, measureId) >= 0) continue
    warnings.push({
      code: 'unsupported-layout',
      message:
        'page break has no aligned score measure and was not exported to MusicXML.',
      path: `score.layout.pageBreakBeforeMeasureIds[${index}]`,
      measureId
    })
  }

  if (score.layout?.pageSetup?.staffSizePercent !== undefined || score.layout?.pageSetup?.systemSpacingPercent !== undefined) {
    warnings.push({
      code: 'unsupported-layout',
      message:
        'Staff size and system spacing percentages are preserved in projects, not MusicXML page defaults.',
      path: 'score.layout.pageSetup'
    })
  }

  return warnings
}

function buildPartMeasureElements(
  score: Score,
  part: Score['parts'][number],
  noteBoundaries: NoteBoundaries,
  spanDirections: SpanDirections,
  printBreaks: PrintBreaks
) {
  const primaryStaff = part.staves[0]
  // MusicXML barlines belong to the part's measure,not an individual staff.
  // Preserve the existing aligned score's performed sequence if its owner is
  // this part's secondary staff;do not rewrite other parts or native owners.
  const barlineStaff = musicXmlBarlineStaff(score, part)
  const repeatCounts = secondVoltaRepeatCounts(barlineStaff.measures)

  return primaryStaff.measures.map((_measure, measureIndex) =>
    buildMeasureElement(
      score,
      part.staves.map((staff) => staff.measures[measureIndex]),
      noteBoundaries,
      part.staves.some((staff) => staff.measures.some((measure) => measure.transposition)),
      score.parts[0]?.id === part.id,
      spanDirections,
      { system: printBreaks.system.has(measureIndex), page: printBreaks.page.has(measureIndex) },
      measureIndex === 0,
      barlineStaff.measures[measureIndex],
      repeatCounts.get(barlineStaff.measures[measureIndex])
    )
  )
}

function buildMeasureElement(
  score: Score,
  measures: Measure[],
  noteBoundaries: NoteBoundaries,
  hasTransposition: boolean,
  primaryPart: boolean,
  spanDirections: SpanDirections,
  printBreak: { system: boolean; page: boolean },
  initialMeasure: boolean,
  barlineMeasure: Measure = measures[0],
  repeatCount?: number
) {
  const primaryMeasure = measures[0]
  const pedalOrder = new Map((score.pedalEvents ?? []).map((event, index) => [event, index]))
  const annotations = measures.flatMap((measure, staffIndex) => {
    // Generic local markings belong to the primary staff, never every part.
    const local = <T extends { measureId: string }>(items: T[] | undefined) =>
      items?.filter(item => item.measureId === measure.id ||
        (primaryPart && staffIndex === 0 && item.measureId === `measure-${measure.number}`))
    const scopedScore: Score = {
      ...score,
      tempo: staffIndex === 0 ? score.tempo : undefined,
      rhythmFeel: staffIndex === 0 ? score.rhythmFeel : undefined,
      tempoEvents: staffIndex === 0 ? score.tempoEvents : undefined,
      pedalEvents: local(score.pedalEvents),
      rehearsalMarks: staffIndex === 0 ? score.rehearsalMarks : undefined,
      systemTexts: staffIndex === 0 ? score.systemTexts : undefined,
      harmonies: local(score.harmonies), staffTexts: local(score.staffTexts),
      expressionTexts: local(score.expressionTexts), dynamics: local(score.dynamics)
    }
    const staff = measures.length > 1 ? { staff: staffIndex + 1 } : {}
    const pedals = scopedScore.pedalEvents?.filter(event => event.measureId === measure.id) ?? []
    let pedalIndex = 0
    return [
      ...buildMeasureDirections(scopedScore, measure, spanDirections, initialMeasure).map(direction => {
        // Direction's staff precedes sound/listening, including a tempo in a
        // grand staff. Object insertion order is XML child order here.
        const { sound, listening, ...body } = direction as Record<string, unknown>
        const pedal = sound && typeof sound === 'object' && '@_damper-pedal' in sound
          ? pedals[pedalIndex++] : undefined
        return {
          element: xmlElement('direction', { ...body, ...staff,
            ...(sound ? { sound } : {}), ...(listening ? { listening } : {}) }),
          pedal
        }
      }),
      ...buildMeasureHarmonies(scopedScore, measure).map(harmony => ({
        element: xmlElement('harmony', { ...harmony, ...staff }), pedal: undefined
      }))
    ]
  })
  // CC64 belongs to the instrument, not its visual staff. Preserve source
  // lift/retake order at a shared tick without moving other annotations.
  // These annotations precede playback elements, so offsets still start at 0.
  const pedalSlots = new Map<number, number[]>()
  annotations.forEach(({ pedal }, index) => {
    if (!pedal) return
    const slots = pedalSlots.get(pedal.tick) ?? []
    slots.push(index)
    pedalSlots.set(pedal.tick, slots)
  })
  for (const slots of pedalSlots.values()) {
    const ordered = slots.map(index => annotations[index]).sort((a, b) =>
      pedalOrder.get(a.pedal!)! - pedalOrder.get(b.pedal!)!)
    slots.forEach((index, order) => { annotations[index] = ordered[order] })
  }
  const volta = musicXmlVoltaForExport(barlineMeasure.volta, repeatCount)
  const barlines = buildMeasureBarlines(barlineMeasure, volta)
  const cursor = { currentCursorTicks: 0 }
  const playback = buildStaffPlaybackElements(measures, noteBoundaries, spanDirections, cursor)
  // Jump instructions are at the measure boundary even if the last serialized
  // staff or voice ended earlier.
  const endOffset = measureDurationTicks(primaryMeasure) - cursor.currentCursorTicks

  return xmlElement(
    'measure',
    [
      ...(printBreak.system || printBreak.page ? [xmlElement('print', {
        ...(printBreak.system ? { '@_new-system': 'yes' } : {}),
        ...(printBreak.page ? { '@_new-page': 'yes' } : {})
      })] : []),
      ...barlines.filter(barline => barline['@_location'] === 'left').map(barline => xmlElement('barline', barline)),
      xmlElement('attributes', buildAttributes(measures, hasTransposition)),
      ...(initialMeasure && score.swingPlayback ? [xmlElement('sound', {
        swing: { first: score.swingPlayback.ratio === '2:1' ? 2 : 3, second: score.swingPlayback.ratio === '2:1' ? 1 : 2,
          'swing-type': score.swingPlayback.unit }
      })] : []),
      ...buildNavigationElements(measures, 'start', 0),
      ...annotations.map(({ element }) => element),
      ...playback,
      ...buildNavigationElements(measures, 'end', endOffset),
      ...barlines.filter(barline => barline['@_location'] === 'right').map(barline => xmlElement('barline', barline))
    ],
    {
      '@_number': primaryMeasure.number,
      ...(primaryMeasure.timing.type === 'pickup'
        ? {
            '@_implicit': 'yes'
          }
        : {})
    }
  )
}

function buildNavigationElements(measures: Measure[], boundary: 'start' | 'end', offset: number) {
  return collectMeasureNavigation(measures).flatMap(mark => {
    const opening = mark.type === 'segno' || mark.type === 'coda'
    if (opening !== (boundary === 'start')) return []
    const attributes = {
      [`@_${mark.type}`]: 'label' in mark ? mark.label : 'yes',
      ...('passes' in mark && mark.passes?.length ? { '@_time-only': mark.passes.join(',') } : {})
    }
    if ('display' in mark && mark.display) {
      return [xmlElement('direction', [
        xmlElement('direction-type', [
          xmlElement('words', mark.display.words),
          ...(mark.display.coda ? [xmlElement('symbol', 'coda')] : [])
        ]),
        ...(offset ? [xmlElement('offset', offset, { '@_sound': 'yes' })] : []),
        xmlElement('sound', attributes)
      ], { '@_placement': 'above' })]
    }
    if (opening && mark.symbol) {
      return [xmlElement('direction', [
        xmlElement('direction-type', [xmlElement(mark.type, {})]),
        xmlElement('sound', attributes)
      ], { '@_placement': 'above' })]
    }
    return [xmlElement('sound', { ...attributes, ...(offset ? { offset } : {}) })]
  })
}

function buildStaffPlaybackElements(
  measures: Measure[],
  noteBoundaries: NoteBoundaries,
  spanDirections: SpanDirections,
  cursor: { currentCursorTicks: number }
) {
  return measures.flatMap((measure, staffIndex) =>
    buildMeasurePlaybackElements(
      measure,
      noteBoundaries,
      measures.length > 1 ? staffIndex + 1 : undefined,
      spanDirections,
      cursor
    )
  )
}

function buildMeasurePlaybackElements(
  measure: Measure,
  noteBoundaries: NoteBoundaries,
  staffNumber: number | undefined,
  spanDirections: SpanDirections,
  cursor: {
    currentCursorTicks: number
  }
) {
  const tupletBoundariesByVoice = new Map(
    measure.voices.map((voice) => [voice.id, createTupletBoundaries(voice)])
  )

  const staff = staffNumber === undefined ? {} : { staff: staffNumber }
  const wrapDirection = (direction: SpanDirection) => xmlElement('direction', { ...direction, ...staff })
  return sortScoreVoices(measure.voices).flatMap((voice, voiceIndex) => {
    const voiceEvents = sortVoiceEvents(voice.events)
    const voiceElements = voiceEvents.flatMap((event) => [
      ...(spanDirections.beforeEvent.get(event.id) ?? []).map(wrapDirection),
      ...buildNoteElements(
        event,
        measure,
        voice,
        readScoreVoiceNumber(voice.id),
        staffNumber,
        tupletBoundariesByVoice.get(voice.id)?.get(event.id),
        noteBoundaries.slurs.get(event.id),
        noteBoundaries.respelledTieStops.has(event.id)
      ).map((noteElement) => xmlElement('note', noteElement)),
      ...(spanDirections.afterEvent.get(event.id) ?? []).map(wrapDirection)
    ])
    const voiceEndTick = readVoiceEndTick(measure, voice)
    const prefix =
      (voiceIndex > 0 || staffNumber !== undefined) &&
      cursor.currentCursorTicks > 0
        ? [
            xmlElement('backup', {
              duration: cursor.currentCursorTicks
            })
          ]
        : []

    cursor.currentCursorTicks = voiceEndTick

    return [...prefix, ...voiceElements]
  })
}

function buildMeasureHarmonies(score: Score, measure: Measure) {
  return (score.harmonies ?? [])
    .filter((harmony) => matchesMeasureReference(harmony.measureId, measure))
    .map((source) => {
      const harmony = inferHarmonyStructure(source)
      if (!harmony.root || !harmony.kind || !musicXmlHarmonyKinds.has(harmony.kind)) {
        throw new Error(`코드 심벌 “${source.text}”의 화음 구조를 MusicXML로 보존할 수 없습니다. 지원하는 코드 표기로 수정하거나 프로젝트 파일로 보관해 주세요.`)
      }
      return {
        ...(harmony.root
          ? {
              root: {
                'root-step': harmony.root.step,
                ...(harmony.root.alter !== undefined
                  ? {
                      'root-alter': harmony.root.alter
                    }
                  : {})
              }
            }
          : {}),
        kind: {
          '#text': harmony.kind,
          '@_text': harmony.text
        },
        ...(harmony.bass
          ? {
              bass: {
                'bass-step': harmony.bass.step,
                ...(harmony.bass.alter !== undefined
                  ? {
                      'bass-alter': harmony.bass.alter
                    }
                  : {})
              }
            }
          : {}),
        ...(harmony.tick > 0
          ? {
              offset: harmony.tick
            }
          : {})
      }
    })
}

function buildMeasureDirections(score: Score, measure: Measure, spanDirections: SpanDirections, initialMeasure: boolean) {
  const tempoEventDirections = (score.tempoEvents ?? [])
    .filter((event) => matchesMeasureReference(event.measureId, measure))
    .map((event) => buildTempoDirection(event, event.tick))
  const spans = spanDirections.atMeasureStart.get(measure) ?? []

  return [
    ...(initialMeasure && score.tempo
      ? [buildTempoDirection(score.tempo)]
      : []),
    ...(initialMeasure && score.rhythmFeel
      ? [buildRhythmFeelDirection(score.rhythmFeel)]
      : []),
    ...tempoEventDirections,
    ...(score.pedalEvents ?? []).filter(event => event.measureId === measure.id).map(event => ({
      '@_placement': 'below',
      'direction-type': { pedal: { '@_type': event.value >= 64 ? 'start' : 'stop', '@_sign': 'yes', '@_line': 'no' } },
      ...(event.tick > 0 ? { offset: { '#text': event.tick, '@_sound': 'yes' } } : {}),
      sound: { '@_damper-pedal': Number((event.value * 100 / 127).toFixed(6)) }
    })),
    ...(score.rehearsalMarks ?? [])
      .filter((mark) => matchesMeasureReference(mark.measureId, measure))
      .map((mark) => buildRehearsalDirection(mark.text)),
    ...(score.staffTexts ?? [])
      .filter((text) => matchesMeasureReference(text.measureId, measure))
      .map((text) => buildStaffTextDirection(text.text)),
    ...(score.systemTexts ?? [])
      .filter((text) => matchesMeasureReference(text.measureId, measure))
      .map((text) => buildSystemTextDirection(text.text)),
    ...(score.expressionTexts ?? [])
      .filter((text) => matchesMeasureReference(text.measureId, measure))
      .map((text) => buildExpressionTextDirection(text.text, text.tick)),
    ...(score.dynamics ?? [])
      .filter((dynamic) => matchesMeasureReference(dynamic.measureId, measure))
      .map((dynamic) => buildDynamicDirection(dynamic.value)),
    ...spans
  ]
}

function matchesMeasureReference(measureId: string, measure: Measure): boolean {
  return measureId === measure.id || measureId === `measure-${measure.number}`
}

function buildRhythmFeelDirection(rhythmFeel: RhythmFeelMarking) {
  return {
    '@_placement': 'above',
    'direction-type': {
      words: rhythmFeel.text ?? defaultRhythmFeelText[rhythmFeel.unit]
    }
  }
}

function buildTempoDirection(
  tempo: NonNullable<Score['tempo']>,
  offsetTicks?: number
) {
  const beatUnit = tempo.beatUnit ?? 'quarter'
  const dots = Math.max(0, tempo.dots ?? 0)

  return {
    '@_placement': 'above',
    'direction-type': [
      ...(tempo.text ? [{ words: tempo.transparent
        ? { '#text': tempo.text, '@_color': '#00000000' } : tempo.text }] : []),
      {
      metronome: {
        // Explicit words are the Studio display label. Keep metronome semantics
        // without adding a second visible label in consuming applications.
        ...(tempo.transparent || tempo.text ? { '@_print-object': 'no' } : {}),
        'beat-unit': beatUnit,
        ...(dots > 0
          ? {
              'beat-unit-dot': Array.from({ length: dots }, () => '')
            }
          : {}),
        'per-minute': tempo.bpm
      }
      }
    ],
    ...(offsetTicks && offsetTicks > 0
      ? {
          offset: { '#text':offsetTicks, '@_sound':'yes' }
        }
      : {}),
    sound: {
      '@_tempo': tempo.bpm * durationToTicks({value:beatUnit,dots}) / divisions
    }
  }
}

function buildOctaveShiftDirection(
  type: NonNullable<Score['octaveShifts']>[number]['type'],
  markerType: 'start' | 'stop'
) {
  const isDown = type === '8vb' || type === '15mb'

  return {
    '@_placement': isDown ? 'below' : 'above',
    'direction-type': {
      'octave-shift': {
        '@_type': markerType === 'stop' ? 'stop' : isDown ? 'up' : 'down',
        '@_size': type.startsWith('15') ? 15 : 8
      }
    }
  }
}

function buildRehearsalDirection(text: string) {
  return {
    '@_placement': 'above',
    'direction-type': {
      rehearsal: {
        '#text': text
      }
    }
  }
}

function buildStaffTextDirection(text: string) {
  return {
    '@_placement': 'above',
    'direction-type': {
      words: {
        '#text': text
      }
    }
  }
}

function buildSystemTextDirection(text: string) {
  return {
    '@_placement': 'above',
    '@_system': 'only-top',
    'direction-type': {
      words: {
        '#text': text,
        '@_font-weight': 'bold'
      }
    }
  }
}

function buildExpressionTextDirection(text: string, tick: number) {
  return {
    '@_placement': 'below',
    'direction-type': {
      words: {
        '#text': text,
        '@_font-style': 'italic'
      }
    },
    ...(tick > 0
      ? {
          offset: tick
        }
      : {})
  }
}

function buildDynamicDirection(value: string) {
  return {
    '@_placement': 'below',
    'direction-type': {
      dynamics: {
        [value]: ''
      }
    }
  }
}

function buildHairpinDirection(type: string) {
  return {
    '@_placement': 'below',
    'direction-type': {
      wedge: {
        '@_type': type
      }
    }
  }
}

function buildMeasureBarlines(measure: Measure, volta: Measure['volta']) {
  return [
    ...(measure.repeat?.start || volta?.start
      ? [
          {
            '@_location': 'left',
            ...(volta?.start
              ? {
                  ending: {
                    '@_number': voltaNumberText(volta),
                    '@_type': 'start'
                  }
                }
              : {}),
            ...(measure.repeat?.start
              ? {
                  repeat: {
                    '@_direction': 'forward'
                  }
                }
              : {})
          }
        ]
      : []),
    ...(measure.repeat?.end || volta?.end
      ? [
          {
            '@_location': 'right',
            ...(volta?.end
              ? {
                  ending: {
                    '@_number': voltaNumberText(volta),
                    '@_type': 'stop'
                  }
                }
              : {}),
            ...(measure.repeat?.end
              ? {
                  repeat: {
                    '@_direction': 'backward',
                    ...(measure.repeat.afterJump !== undefined ? {
                      '@_after-jump': measure.repeat.afterJump ? 'yes' : 'no'
                    } : {}),
                    ...(measure.repeat.times
                      ? {
                          '@_times': measure.repeat.times
                        }
                      : {})
                  }
                }
              : {})
          }
        ]
      : [])
  ]
}

function collectSpanLocations(score: Score) {
  type MeasureLocation = {
    measure: Measure
    measureIndex: number
    partIndex: number
    staffKey: string
  }
  type EventLocation = MeasureLocation & { event: VoiceEvent; voice: Voice; eventOrder: number }
  const events = new Map<string, EventLocation>()
  const measures = new Map<string, MeasureLocation>()
  let eventOrder = 0
  for (const [partIndex, part] of score.parts.entries()) {
    const measureCount = Math.max(0, ...part.staves.map(staff => staff.measures.length))
    // Match the writer's measure, staff, voice and event order, including
    // backups in multi-voice parts. Grace and chord members stay with a host.
    for (let measureIndex = 0; measureIndex < measureCount; measureIndex += 1) {
      for (const [staffIndex, staff] of part.staves.entries()) {
        const measure = staff.measures[measureIndex]
        if (!measure) continue
        const location = { measure, measureIndex, partIndex, staffKey: `${partIndex}:${staffIndex}` }
        measures.set(measure.id, location)
        for (const voice of sortScoreVoices(measure.voices)) {
          for (const event of sortVoiceEvents(voice.events)) {
            events.set(event.id, { ...location, event, voice, eventOrder: eventOrder++ })
          }
        }
      }
    }
  }
  return { events, measures }
}

function createSpanDirections(score: Score, locations: ReturnType<typeof collectSpanLocations>, partIds: string[]): SpanDirections {
  const directions: SpanDirections = { atMeasureStart: new Map(), beforeEvent: new Map(), afterEvent: new Map() }
  const partIdSet = new Set(partIds)
  let nextEndMarker = 1
  const hairpinMarkers = new Map<SpanDirection, {
    pair: { number?: number }
    stop: boolean
    wedge: Record<string, unknown>
  }>()
  for (const kind of ['octaveShifts', 'hairpins'] as const) {
    const spans = (score[kind] ?? []).map(span => {
      const start = locations.events.get(span.startEventId)
      const endEvent = span.endEventId === undefined ? undefined : locations.events.get(span.endEventId)
      const endTime = 'endTime' in span ? span.endTime : undefined
      const end = endTime ? locations.measures.get(endTime.measureId) : endEvent
      const endVoice = endTime ? end?.measure.voices.find(voice => voice.id === endTime.voiceId) : endEvent?.voice
      if (!start || !end || !endVoice || start.staffKey !== end.staffKey ||
        (endTime && (!Number.isSafeInteger(endTime.tick) || endTime.tick < 0 || endTime.tick > measureDurationTicks(end.measure)))) {
        throw new Error(endTime ? 'MusicXML 헤어핀 시간 끝점은 시작점과 같은 보표의 유효한 위치여야 합니다.'
          : 'MusicXML span endpoint는 같은 보표의 시간순 이벤트여야 하며 옥타브선은 note가 필요합니다.')
      }
      const sameMeasure = start.measureIndex === end.measureIndex
      if (kind === 'octaveShifts') {
        if (!endEvent || start.event.type !== 'note' || endEvent.event.type !== 'note' ||
            start.measureIndex > end.measureIndex || (sameMeasure && start.event.position.tick > endEvent.event.position.tick)) {
          throw new Error('MusicXML span endpoint는 같은 보표의 시간순 이벤트여야 하며 옥타브선은 note가 필요합니다.')
        }
        const startOrder = 2 * start.eventOrder
        const stopOrder = 2 * endEvent.eventOrder + 1
        // An earlier voice can write a stop before a later voice's start.
        return {
          span, start, end, endEvent, endVoice, endTick: endEvent.event.position.tick, group: String(start.partIndex),
          first: Math.min(startOrder, stopOrder), last: Math.max(startOrder, stopOrder)
        }
      }
      const endTick = endTime?.tick ?? hairpinEndTick('endAnchor' in span ? span.endAnchor : undefined,
        { ...start, voiceId: start.voice.id }, { ...endEvent!, voiceId: endVoice.id })
      if (start.measureIndex > end.measureIndex || (sameMeasure && start.event.position.tick >= endTick)) {
        throw new Error('헤어핀 끝점은 시작점보다 뒤에 있어야 합니다. 속성에서 범위를 수정하거나 표기를 삭제한 뒤 다시 내보내세요.')
      }
      // Hairpin directions are written together at each measure's beginning.
      return { span, start, end, endEvent, endVoice, endTick, group: String(start.partIndex), first: start.measureIndex, last: end.measureIndex }
    }).sort((a, b) => a.first - b.first)
    const activeByGroup = new Map<string, Map<number, number>>()
    for (const { span, start, end, endEvent, endVoice, endTick, group, first, last } of spans) {
      let number: number | undefined
      if (kind === 'octaveShifts') {
        const active = activeByGroup.get(group) ?? new Map<number, number>()
        number = claimSpanNumber(active, first, last)
        if (!number) throw new Error('MusicXML 한 파트의 동시 옥타브선 번호 범위(16)를 초과했습니다.')
        activeByGroup.set(group, active)
      }
      const pair: { number?: number } = {}
      for (const [anchor, stop] of [[start, false], [end, true]] as const) {
        const direction = kind === 'hairpins'
          ? buildHairpinDirection(stop ? 'stop' : span.type)
          : buildOctaveShiftDirection(span.type as NonNullable<Score['octaveShifts']>[number]['type'], stop ? 'stop' : 'start')
        const marker = Object.values(direction['direction-type'])[0] as Record<string, unknown>
        if (number !== undefined && number !== 1) marker['@_number'] = number
        const voice = readScoreVoiceNumber(stop ? endVoice.id : start.voice.id)
        if (kind === 'octaveShifts') {
          // Some consumers read octave changes from the current cursor. Keep
          // the start before any grace notes and the stop after the full chord.
          appendSpanDirection(stop ? directions.afterEvent : directions.beforeEvent, (stop ? endEvent! : start).event.id, { ...direction, voice })
        } else {
          const endAnchor = 'endAnchor' in span ? span.endAnchor : undefined
          const losesRole = endEvent && endAnchor && (endEvent.event.type === 'rest' ||
            (endAnchor === 'onset' ? start.voice.id === endVoice.id :
              endVoice.events.some(event => event.position.tick === endTick) ||
              endTick === hairpinEndTick(undefined, { ...start, voiceId: start.voice.id }, { ...endEvent, voiceId: endVoice.id })))
          // A standard offset identifies a free ending until an edit creates
          // an onset or release at the same position.
          const timeNeedsRole = !endEvent && endVoice.events.some(event =>
            event.position.tick === endTick ||
            event.position.tick + durationToTicks(event.duration) === endTick)
          const role = timeNeedsRole ? 'time' : losesRole ? endAnchor : undefined
          if (stop && role) {
            let id: string
            do {
              id = `${hairpinEndMarkerPrefix}${role}-${nextEndMarker++}`
            } while (partIdSet.has(id))
            marker['@_id'] = id
          }
          const placed = { ...direction, offset: stop ? endTick : start.event.position.tick, voice }
          appendSpanDirection(directions.atMeasureStart, anchor.measure, placed)
          hairpinMarkers.set(placed, { pair, stop, wedge: marker })
        }
      }
    }
  }
  if (hairpinMarkers.size > 0) {
    for (const part of score.parts) {
      const active = new Set<number>()
      // The writer emits all measure-start marks in staff order. A number
      // stays reserved until its stop is written, including across staves.
      for (const [measureIndex] of part.staves[0].measures.entries()) {
        for (const staff of part.staves) {
          for (const direction of directions.atMeasureStart.get(staff.measures[measureIndex]) ?? []) {
            const marker = hairpinMarkers.get(direction)!
            const number = marker.stop ? marker.pair.number
              : Array.from({ length: 16 }, (_, index) => index + 1).find(candidate => !active.has(candidate))
            if (number === undefined) throw new Error('MusicXML 한 파트의 동시 헤어핀 번호 범위(16)를 초과했습니다.')
            if (number !== 1) marker.wedge['@_number'] = number
            if (marker.stop) active.delete(number)
            else {
              marker.pair.number = number
              active.add(number)
            }
          }
        }
      }
    }
  }
  return directions
}

function claimSpanNumber(active: Map<number, number>, first: number, last: number, preferred?: number): number | undefined {
  for (const [number, lastMarker] of active) if (lastMarker < first) active.delete(number)
  const number = preferred !== undefined && Number.isInteger(preferred) && preferred >= 1 && preferred <= 16 && !active.has(preferred)
    ? preferred
    : Array.from({ length: 16 }, (_, i) => i + 1).find(candidate => !active.has(candidate))
  if (number !== undefined) active.set(number, last)
  return number
}

function appendSpanDirection<K>(map: Map<K, SpanDirection[]>, anchor: K, direction: SpanDirection): void {
  const existing = map.get(anchor)
  if (existing) existing.push(direction)
  else map.set(anchor, [direction])
}

function buildAttributes(measures: Measure[], hasTransposition: boolean) {
  const primaryMeasure = measures[0]
  const clefs = measures.map((measure) => clefToMusicXml(measure.clef))
  const sharedKey = measures.every(measure =>
    measure.keySignature.fifths === primaryMeasure.keySignature.fifths &&
    measure.keySignature.mode === primaryMeasure.keySignature.mode)
  const sharedTime = measures.every(measure =>
    measure.timeSignature.beats === primaryMeasure.timeSignature.beats &&
    measure.timeSignature.beatType === primaryMeasure.timeSignature.beatType)
  const key = (measure: Measure) => ({
    fifths: measure.keySignature.fifths,
    ...(measure.keySignature.mode ? { mode: measure.keySignature.mode } : {})
  })
  const time = (measure: Measure) => ({
    beats: measure.timeSignature.beats,
    'beat-type': measure.timeSignature.beatType
  })

  return {
    divisions,
    key: sharedKey ? key(primaryMeasure) : measures.map((measure,index) => ({
      '@_number': index + 1, ...key(measure)
    })),
    time: sharedTime ? time(primaryMeasure) : measures.map((measure,index) => ({
      '@_number': index + 1, ...time(measure)
    })),
    staves: measures.length,
    clef:
      measures.length === 1
        ? buildClefAttributes(clefs[0])
        : clefs.map((clef, index) => ({
            '@_number': index + 1,
            ...buildClefAttributes(clef)
          })),
    ...(hasTransposition
      ? { transpose: measures.map((measure, index) => ({
          ...(measures.length > 1 ? { '@_number': index + 1 } : {}),
          ...(measure.transposition?.diatonic !== undefined
            ? { diatonic: measure.transposition.diatonic } : {}),
          chromatic: measure.transposition?.chromatic ?? 0,
          ...(measure.transposition?.octaveChange !== undefined
            ? { 'octave-change': measure.transposition.octaveChange } : {})
        })) }
      : {})
  }
}

function buildClefAttributes(clef: ReturnType<typeof clefToMusicXml>) {
  return {
    sign: clef.sign,
    line: clef.line,
    ...(clef.octaveChange !== undefined
      ? {
          'clef-octave-change': clef.octaveChange
        }
      : {})
  }
}

function buildNoteElements(
  event: VoiceEvent,
  measure: Measure,
  voice: Voice,
  voiceNumber: number,
  staffNumber: number | undefined,
  tupletBoundary?: {
    start?: boolean
    stop?: boolean
  },
  slurBoundary?: {
    starts?: string[]
    stops?: string[]
  },
  respelledTieStop = false
): unknown[] {
  if (event.type === 'note') {
    const notePitches = event.pitches?.length
      ? event.pitches.map(pitch => {
          const resolved = resolveNotePitch(measure, voice, { ...event, pitch })
          // An absent XML alter already means natural. Keep that established
          // chord spelling when resolution is zero, while writing inherited
          // sharps/flats explicitly so consumers hear the resolved pitch.
          return pitch.alter === undefined && resolved.alter === 0 ? pitch : resolved
        })
      : [resolveNotePitch(measure, voice, event)]
    // Validate the pitches actually written, after octave-shift conversion.
    // Native supports values that the MusicXML octave type cannot represent;
    // reject the exchange instead of changing the document or its sound.
    for (const pitch of [...notePitches, ...(event.graceNotes ?? []).map(note => note.pitch)]) {
      if (!Number.isInteger(pitch.octave) || pitch.octave < 0 || pitch.octave > 9) {
        throw new Error(`MusicXML ${measure.number}마디의 음높이가 지원 범위(옥타브 0–9)를 벗어납니다. 음높이 또는 옥타브 표시를 수정한 뒤 다시 내보내세요. 프로젝트 파일은 저장할 수 있습니다.`)
      }
    }
    const before: ReturnType<typeof buildGraceNote>[] = []
    const after: ReturnType<typeof buildGraceNote>[] = []
    for (const [index, graceNote] of (event.graceNotes ?? []).entries()) {
      const graceEvent = { ...event, pitch: graceNote.pitch }
      const resolved = resolveNotePitch(measure, voice, graceEvent)
      const pitch = graceNote.pitch.alter === undefined && resolved.alter === 0 ? graceNote.pitch : resolved
      const accidental = shouldDisplayAccidental(measure, voice, event, index)
        ? toMusicXmlAccidental(resolved.alter!)
        : undefined
      const group = graceNote.after ? after : before
      group.push(buildGraceNote({ ...graceNote, pitch }, voiceNumber, staffNumber, accidental))
    }
    const mainNote = buildNote(
      event,
      measure,
      voice,
      notePitches[0],
      voiceNumber,
      staffNumber,
      false,
      tupletBoundary,
      slurBoundary,
      respelledTieStop
    )
    const chordNotes = notePitches.slice(1).map((pitch) =>
      buildNote(event, measure, voice, pitch, voiceNumber, staffNumber, true)
    )

    return [...before, mainNote, ...chordNotes, ...after]
  }

  return [
    buildNote(
      event,
      measure,
      voice,
      undefined,
      voiceNumber,
      staffNumber,
      false,
      tupletBoundary
    )
  ]
}

function readVoiceEndTick(measure: Measure, voice: Voice): number {
  return sortVoiceEvents(voice.events).reduce(
    (endTick, event) =>
      Math.max(
        endTick,
        event.position.tick + voiceEventDurationTicks(event, measure)
      ),
    0
  )
}

function buildGraceNote(
  graceNote: NonNullable<Extract<VoiceEvent, { type: 'note' }>['graceNotes']>[number],
  voiceNumber: number,
  staffNumber: number | undefined,
  accidental: string | undefined
) {
  return {
    grace: graceNote.slash
      ? {
          '@_slash': 'yes'
        }
      : '',
    ...(graceNote.chord ? { chord: '' } : {}),
    pitch: {
      step: graceNote.pitch.step,
      ...(graceNote.pitch.alter !== undefined
        ? {
            alter: graceNote.pitch.alter
          }
        : {}),
      octave: graceNote.pitch.octave
    },
    voice: voiceNumber,
    type: 'eighth',
    ...(accidental !== undefined ? { accidental } : {}),
    ...(staffNumber !== undefined ? { staff: staffNumber } : {})
  }
}

function buildNote(
  event: VoiceEvent,
  measure: Measure,
  voice: Voice,
  pitch: Pitch | undefined,
  voiceNumber: number,
  staffNumber: number | undefined,
  isChordTone: boolean,
  tupletBoundary?: {
    start?: boolean
    stop?: boolean
  },
  slurBoundary?: {
    starts?: string[]
    stops?: string[]
  },
  respelledTieStop = false
) {
  const dots = Array.from({ length: event.duration.dots }, () => '')
  const isFullMeasureRest = event.type === 'rest' && event.fullMeasure
  const displaysAccidental =
    event.type === 'note' &&
    (!event.ties?.stop || respelledTieStop) &&
    shouldDisplayAccidental(measure, voice, { ...event, pitch: pitch! })
  const tieTypes =
    event.type === 'note'
      ? [
          ...(event.ties?.stop ? ['stop'] as const : []),
          ...(event.ties?.start ? ['start'] as const : [])
        ]
      : []
  const notationTuplets = [
    ...(tupletBoundary?.start ? ['start'] as const : []),
    ...(tupletBoundary?.stop ? ['stop'] as const : [])
  ]
  const notationSlurs = [
    ...(slurBoundary?.starts ?? []).map((number) => ({
      number,
      type: 'start' as const
    })),
    ...(slurBoundary?.stops ?? []).map((number) => ({
      number,
      type: 'stop' as const
    }))
  ]
  const articulations =
    event.type === 'note' ? event.articulations ?? [] : []
  const articulationNotations = [
    ...articulations,
    ...(event.breathMark === 'breath' ? ['breath-mark'] : []),
    ...(event.breathMark === 'caesura' ? ['caesura'] : [])
  ]
  const ornamentNotations =
    event.type === 'note'
      ? {
          ...(event.tremolo
            ? {
                tremolo: {
                  '@_type': 'single',
                  '#text': event.tremolo.marks
                }
              }
            : {}),
          ...(event.ornaments ?? []).reduce<Record<string, string>>(
            (values, ornament) => ({
              ...values,
              [ornament === 'trill' ? 'trill-mark' : ornament]: ''
            }),
            {}
          )
        }
      : {}
  const hasOrnaments = Object.keys(ornamentNotations).length > 0
  const hasFermata = Boolean(event.fermata)
  const hasNotations =
    tieTypes.length > 0 ||
    notationTuplets.length > 0 ||
    notationSlurs.length > 0 ||
    articulationNotations.length > 0 ||
    hasOrnaments ||
    hasFermata

  return {
    ...(event.type === 'rest'
      ? {
          rest: isFullMeasureRest
            ? {
                '@_measure': 'yes'
              }
            : ''
        }
      : {
          ...(isChordTone
            ? {
                chord: ''
              }
            : {}),
          pitch: {
            step: pitch!.step,
            ...(pitch!.alter !== 0 ||
            event.pitch.alter === 0 ||
            event.pitches?.length ||
            displaysAccidental
              ? {
                  alter: pitch!.alter
                }
              : {}),
            octave: pitch!.octave
          },
        }),
    duration: isFullMeasureRest
      ? voiceEventDurationTicks(event, measure)
      : durationToTicks(event.duration),
    ...(tieTypes.length > 0 ? { tie: tieTypes.map(type => ({ '@_type': type })) } : {}),
    voice: voiceNumber,
    type: event.duration.value,
    ...(dots.length > 0 ? { dot: dots } : {}),
    ...(displaysAccidental ? { accidental: toMusicXmlAccidental(pitch!.alter!) } : {}),
    ...(event.duration.tuplet
      ? {
          'time-modification': {
            'actual-notes': event.duration.tuplet.actualNotes,
            'normal-notes': event.duration.tuplet.normalNotes
          }
        }
      : {}),
    ...(staffNumber !== undefined ? { staff: staffNumber } : {}),
    ...(hasNotations
      ? {
          notations: {
            ...(tieTypes.length > 0
              ? {
                  tied: tieTypes.map((type) => ({
                    '@_type': type
                  }))
                }
              : {}),
            ...(notationTuplets.length > 0
              ? {
                  tuplet: notationTuplets.map((type) => ({
                    '@_type': type
                  }))
                }
              : {}),
            ...(notationSlurs.length > 0
              ? {
                  slur: notationSlurs.map(({ number, type }) => ({
                    '@_type': type,
                    '@_number': number
                  }))
                }
              : {}),
            ...(articulationNotations.length > 0
              ? {
                  articulations: Object.fromEntries(
                    articulationNotations.map((articulation) => articulation === 'marcato'
                      ? ['strong-accent', { '@_type': 'up' }]
                      : [articulation, ''])
                  )
                }
              : {}),
            ...(hasOrnaments
              ? {
                  ornaments: ornamentNotations
                }
              : {}),
            ...(hasFermata
              ? {
                  fermata: ''
                }
              : {})
          }
        }
      : {}),
    ...(event.type === 'note' && event.lyrics?.length && !isChordTone
      ? {
          lyric: sortLyricsByNumber(event.lyrics).map((lyric) => ({
            ...(lyric.number !== undefined
              ? {
                  '@_number': lyric.number
                }
              : {}),
            ...(lyric.syllabic
              ? {
                  syllabic: lyric.syllabic
                }
              : {}),
            text: lyric.text,
            ...(lyric.extend
              ? {
                  extend: ''
                }
              : {})
          }))
        }
      : {})
  }
}

function createTupletBoundaries(
  voice: Voice
): Map<string, { start?: boolean; stop?: boolean }> {
  const boundaries = new Map<string, { start?: boolean; stop?: boolean }>()

  for (const group of voice.tuplets ?? []) {
    const firstId = group.eventIds[0]
    const lastId = group.eventIds.at(-1)

    if (!firstId || !lastId) {
      continue
    }

    boundaries.set(firstId, {
      ...boundaries.get(firstId),
      start: true
    })
    boundaries.set(lastId, {
      ...boundaries.get(lastId),
      stop: true
    })
  }

  return boundaries
}

function createSlurBoundaries(
  score: Score,
  locations: ReturnType<typeof collectSpanLocations>['events']
): Map<string, { starts?: string[]; stops?: string[] }> {
  const boundaries = new Map<string, { starts?: string[]; stops?: string[] }>()

  const spans = (score.slurs ?? []).map((slur, index) => {
    const start = locations.get(slur.startEventId), end = locations.get(slur.endEventId)
    if (!start || !end || start.event.type !== 'note' || end.event.type !== 'note' || start.staffKey !== end.staffKey ||
      start.measureIndex > end.measureIndex || (start.measureIndex === end.measureIndex && start.event.position.tick >= end.event.position.tick)) {
      throw new Error('슬러 끝점은 같은 보표의 시작점보다 뒤에 있는 음표여야 합니다. 속성에서 범위를 수정하거나 표기를 삭제한 뒤 다시 내보내세요.')
    }
    return { slur, index, partIndex: start.partIndex,
      first: Math.min(start.eventOrder, end.eventOrder), last: Math.max(start.eventOrder, end.eventOrder) }
  })
  const activeByPart = new Map<number, Map<number, number>>()
  const assignedNumbers: number[] = []
  // Parts write one voice at a time, so collisions depend on file order.
  for (const { slur, index, partIndex, first, last } of [...spans].sort((a, b) => a.first - b.first)) {
    const active = activeByPart.get(partIndex) ?? new Map<number, number>()
    const number = claimSpanNumber(active, first, last, slur.number ?? index + 1)
    if (number === undefined) throw new Error('MusicXML 한 파트의 동시 슬러 번호 범위(16)를 초과했습니다.')
    assignedNumbers[index] = number
    activeByPart.set(partIndex, active)
  }

  for (const { slur, index } of spans) {
    const number = String(assignedNumbers[index])
    const startBoundary = boundaries.get(slur.startEventId)
    const stopBoundary = boundaries.get(slur.endEventId)

    boundaries.set(slur.startEventId, {
      ...startBoundary,
      starts: [...(startBoundary?.starts ?? []), number]
    })
    boundaries.set(slur.endEventId, {
      ...stopBoundary,
      stops: [...(stopBoundary?.stops ?? []), number]
    })
  }

  return boundaries
}

function toMusicXmlAccidental(
  alter: NonNullable<Pitch['alter']>
): string {
  switch (alter) {
    case -2:
      return 'flat-flat'
    case -1:
      return 'flat'
    case 0:
      return 'natural'
    case 1:
      return 'sharp'
    case 2:
      return 'double-sharp'
  }
}

function sortLyricsByNumber(
  lyrics: NonNullable<Extract<VoiceEvent, { type: 'note' }>['lyrics']>
): NonNullable<Extract<VoiceEvent, { type: 'note' }>['lyrics']> {
  return [...lyrics].sort(
    (left, right) => (left.number ?? 1) - (right.number ?? 1)
  )
}

function validateMeasure(measure: Measure): void {
  const rhythm = validateMeasureRhythm(measure)
  const tupletErrors = measure.voices.flatMap((voice) =>
    validateVoiceTuplets(voice)
  )

  if (!rhythm.isExact) {
    throw new Error(
      `measure ${measure.number}의 리듬 정합성이 올바르지 않습니다: ${rhythm.status}`
    )
  }

  if (tupletErrors.length > 0) {
    throw new Error(
      `measure ${measure.number}의 tuplet 관계가 올바르지 않습니다: ${tupletErrors.join(', ')}`
    )
  }
}


function xmlElement(
  name: string,
  value: unknown,
  attributes: Record<string, unknown> = {}
) {
  const content = readXmlElementContent(value)
  const attrs = {
    ...content.attributes,
    ...attributes
  }
  const element: Record<string, unknown> = {
    [name]: content.children
  }

  if (Object.keys(attrs).length > 0) {
    element[':@'] = attrs
  }

  return element
}

function readXmlElementContent(value: unknown): {
  attributes: Record<string, unknown>
  children: unknown[]
} {
  if (value === undefined || value === null || value === '') {
    return {
      attributes: {},
      children: []
    }
  }

  if (Array.isArray(value)) {
    return {
      attributes: {},
      children: value
    }
  }

  if (typeof value !== 'object') {
    return {
      attributes: {},
      children: [
        {
          '#text': value
        }
      ]
    }
  }

  const attributes: Record<string, unknown> = {}
  const children: unknown[] = []

  Object.entries(value as Record<string, unknown>).forEach(([key, childValue]) => {
    if (childValue === undefined || childValue === null) {
      return
    }

    if (key.startsWith('@_')) {
      attributes[key] = childValue
      return
    }

    if (key === '#text') {
      children.push({
        '#text': childValue
      })
      return
    }

    if (Array.isArray(childValue)) {
      childValue.forEach((item) => {
        if (item === undefined || item === null) {
          return
        }

        children.push(xmlElement(key, item))
      })
      return
    }

    children.push(xmlElement(key, childValue))
  })

  return {
    attributes,
    children
  }
}
