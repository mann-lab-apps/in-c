import { z } from 'zod'
import { measureDurationTicks, validateMeasureRhythm, validateTieRelations, validateVoiceTuplets, type Measure, type Score, type Staff } from '../score-core'

export const NATIVE_FORMAT = 'chromatics-project'
export const NATIVE_VERSION = 2
const TIME_HAIRPIN_NATIVE_VERSION = 3
export const MAX_PROJECT_BYTES = 16 * 1024 * 1024

const id = z.string().min(1).max(256)
const text = z.string().max(8192)
const integer = z.number().int().safe()
const tick = integer.min(0)
const positive = integer.min(1)
const step = z.enum(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
const alter = z.union([z.literal(-2), z.literal(-1), z.literal(0), z.literal(1), z.literal(2)])
const harmonyPitch = z.strictObject({ step, alter: alter.optional() })
const pitch = harmonyPitch.extend({ octave: integer.min(-1).max(9) })
const durationValue = z.enum(['whole', 'half', 'quarter', 'eighth', '16th', '32nd', '64th'])
const ratio = { actualNotes: positive.max(64), normalNotes: positive.max(64) }
const duration = z.strictObject({ value: durationValue, dots: integer.min(0).max(3), tuplet: z.strictObject(ratio).optional() })
const eventBase = {
  id, position: z.strictObject({ tick }), duration,
  fermata: z.boolean().optional(), breathMark: z.enum(['breath', 'caesura']).optional()
}
const event = z.discriminatedUnion('type', [
  z.strictObject({
    ...eventBase, type: z.literal('note'), pitch, pitches: z.array(pitch).min(1).max(128).optional(),
    ties: z.strictObject({ start: z.boolean().optional(), stop: z.boolean().optional() }).optional(),
    articulations: z.array(z.enum(['staccato', 'accent', 'tenuto', 'marcato'])).max(4).optional(),
    tremolo: z.strictObject({ type: z.literal('single'), marks: z.union([z.literal(1), z.literal(2), z.literal(3)]) }).optional(),
    lyrics: z.array(z.strictObject({ number: positive.optional(), syllabic: z.enum(['single', 'begin', 'middle', 'end']).optional(), text, extend: z.boolean().optional() })).max(100).optional(),
    graceNotes: z.array(z.strictObject({
      pitch, slash: z.boolean().optional(), chord: z.literal(true).optional(), after: z.literal(true).optional()
    })).max(128).refine(notes => notes.every((note, index) => {
      const previous = notes[index - 1]
      if (note.chord && (!previous || previous.after !== note.after)) return false
      return !previous?.after || note.after === true
    }), 'Grace chords must follow their lead note on the same side of the host.').optional(),
    ornaments: z.array(z.enum(['trill', 'mordent', 'inverted-mordent', 'turn'])).max(4).optional()
  }),
  z.strictObject({ ...eventBase, type: z.literal('rest'), fullMeasure: z.boolean().optional() })
])
const voice = z.strictObject({
  id, events: z.array(event).max(4096),
  tuplets: z.array(z.strictObject({ id, eventIds: z.array(id).min(1).max(4096), ...ratio })).max(4096).optional()
})
const voltaEndpoints = { start: z.boolean().optional(), end: z.boolean().optional() }
const volta = z.union([
  z.strictObject({ number: z.union([z.literal(1), z.literal(2)]), ...voltaEndpoints }),
  z.strictObject({ passes: z.array(positive).refine(
    passes => !(passes.length === 1 && passes[0] === 1),
    'Use the legacy encoding for a single 1st ending.'
  ), ...voltaEndpoints })
])
const navigationPasses = z.array(positive).min(1).max(100).optional()
const navigationLabel = z.string().trim().min(1).max(1024)
const navigationDisplay = z.strictObject({ words: z.string().min(1).max(1024), coda: z.literal(true).optional() }).optional()
const navigationMark = z.union([
  z.strictObject({ type: z.enum(['segno', 'coda']), label: navigationLabel, symbol: z.literal(true).optional() }),
  z.strictObject({ type: z.enum(['dacapo', 'fine']), passes: navigationPasses, display: navigationDisplay }),
  z.strictObject({ type: z.enum(['dalsegno', 'tocoda']), label: navigationLabel, passes: navigationPasses, display: navigationDisplay })
])
const measure = z.strictObject({
  id, number: positive,
  timing: z.discriminatedUnion('type', [z.strictObject({ type: z.literal('regular') }), z.strictObject({ type: z.literal('pickup'), durationTicks: positive })]),
  timeSignature: z.strictObject({ beats: positive.max(128), beatType: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(8), z.literal(16), z.literal(32), z.literal(64)]) }),
  keySignature: z.strictObject({ fifths: integer.min(-7).max(7), mode: z.enum(['major', 'minor']).optional() }),
  clef: z.strictObject({ sign: z.enum(['G', 'F', 'C', 'percussion', 'tab']), line: positive.max(6), octaveChange: integer.min(-3).max(3).optional() }),
  transposition: z.strictObject({ diatonic: integer.min(-28).max(28).optional(), chromatic: integer.min(-48).max(48), octaveChange: integer.min(-4).max(4).optional() }).optional(),
  repeat: z.strictObject({ start: z.boolean().optional(), end: z.boolean().optional(), times: positive.max(100).optional(), afterJump: z.boolean().optional() }).optional(),
  volta: volta.optional(),
  navigation: z.array(navigationMark).min(1).max(100).optional(),
  voices: z.array(voice).min(1).max(4)
})
const tempo = z.strictObject({ bpm: z.number().finite().positive().max(1000), beatUnit: durationValue.optional(), dots: integer.min(0).max(3).optional(), text: text.optional(), transparent: z.boolean().optional() })
const measureMark = z.strictObject({ id, measureId: id, text })
const span = { id, startEventId: id, endEventId: id }
export const spanEngravingSchema = z.strictObject({
  placement: z.enum(['above', 'below']).optional(),
  offsetX: z.number().finite().min(-8).max(8).optional(),
  offsetY: z.number().finite().min(-8).max(8).optional(),
  height: z.number().finite().min(0.5).max(8).optional()
})
export const pageSetupSchema = z.strictObject({
  pageSize: z.enum(['a4', 'letter']).optional(), orientation: z.enum(['portrait', 'landscape']).optional(),
  pageMarginMm: z.number().finite().min(0).max(100).optional(),
  staffSizePercent: z.number().finite().min(25).max(300).optional(),
  systemSpacingPercent: z.number().finite().min(25).max(300).optional()
})
const layoutSchema = z.strictObject({
  systemBreakBeforeMeasureIds: z.array(id).max(10000).optional(),
  pageBreakBeforeMeasureIds: z.array(id).max(10000).optional(), pageSetup: pageSetupSchema.optional()
})
const hairpinType = z.enum(['crescendo', 'diminuendo'])

// This annotation model is the existing score model, not a lossy XML payload.
export const scoreSchema: z.ZodType<Score> = z.strictObject({
  id, title: text, composer: text.optional(), tempo: tempo.optional(),
  tempoEvents: z.array(tempo.extend({ id, measureId: id, tick })).max(10000).optional(),
  pedalEvents: z.array(z.strictObject({ id, partId: id, staffId: id, measureId: id,
    tick, value: integer.min(0).max(127) })).max(10000).optional(),
  rhythmFeel: z.strictObject({ unit: z.enum(['eighth', '16th']), text: text.optional() }).optional(),
  swingPlayback: z.strictObject({ unit: z.enum(['eighth', '16th']), ratio: z.enum(['2:1', '3:2']) }).optional(),
  gracePlayback: z.boolean().optional(),
  octaveShifts: z.array(z.strictObject({ ...span, type: z.enum(['8va', '8vb', '15ma', '15mb']) })).max(10000).optional(),
  harmonies: z.array(measureMark.extend({ tick, root: harmonyPitch.optional(), bass: harmonyPitch.optional(), kind: text.optional() })).max(10000).optional(),
  rehearsalMarks: z.array(measureMark).max(10000).optional(), staffTexts: z.array(measureMark).max(10000).optional(),
  systemTexts: z.array(measureMark).max(10000).optional(), expressionTexts: z.array(measureMark.extend({ tick })).max(10000).optional(),
  dynamics: z.array(z.strictObject({ id, measureId: id, value: z.enum(['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz']) })).max(10000).optional(),
  hairpins: z.array(z.union([
    z.strictObject({ ...span, type: hairpinType, endAnchor: z.enum(['onset', 'release']).optional(), engraving: spanEngravingSchema.optional() }),
    z.strictObject({ id, startEventId: id, endTime: z.strictObject({ measureId: id, voiceId: id, tick }),
      type: hairpinType, engraving: spanEngravingSchema.optional() })
  ])).max(10000).optional(),
  slurs: z.array(z.strictObject({ ...span, number: positive.optional(), engraving: spanEngravingSchema.optional() })).max(10000).optional(),
  layout: layoutSchema.optional(),
  parts: z.array(z.strictObject({ id, name: text, abbreviation: text.optional(), staves: z.array(z.strictObject({ id, measures: z.array(measure).min(1).max(10000) })).min(1).max(8) })).min(1).max(128)
})

export const nativeProjectSchema = z.strictObject({
  format: z.literal(NATIVE_FORMAT), version: z.union([z.literal(NATIVE_VERSION), z.literal(TIME_HAIRPIN_NATIVE_VERSION)]), score: scoreSchema,
  partLayouts: z.array(z.strictObject({ partId: id, title: text.optional(), layout: layoutSchema })).max(128),
  view: z.discriminatedUnion('mode', [z.strictObject({ mode: z.literal('score') }), z.strictObject({ mode: z.literal('part'), partId: id })]),
  settings: z.strictObject({ inputMode: z.enum(['duration-first', 'pitch-first']) })
})
export type NativeProject = z.infer<typeof nativeProjectSchema>

export function validateNativeProject(input: unknown): NativeProject {
  assertBoundedTree(input)
  // Version 1 had no portable span geometry. Reject invented v1 geometry rather
  // than treating it as an authorized migration payload.
  if (input && typeof input === 'object' && 'format' in input && input.format === NATIVE_FORMAT && 'version' in input && input.version === 1) {
    const legacy = nativeProjectSchema.extend({ version: z.literal(1) }).parse(input)
    if ([...(legacy.score.slurs ?? []), ...(legacy.score.hairpins ?? [])].some(item => item.engraving !== undefined)) {
      throw new Error('Span engraving is not supported in Chromatics project version 1.')
    }
    if (legacy.score.hairpins?.some(item => item.endAnchor !== undefined || item.endTime)) {
      throw new Error('Explicit hairpin endpoints are not supported in Chromatics project version 1.')
    }
    input = { ...legacy, version: NATIVE_VERSION }
  }
  if (input && typeof input === 'object' && 'format' in input && input.format === NATIVE_FORMAT && 'version' in input && input.version !== NATIVE_VERSION && input.version !== TIME_HAIRPIN_NATIVE_VERSION) {
    const version = typeof input.version === 'number' && Number.isSafeInteger(input.version) ? `: ${input.version}` : ' value'
    throw new Error(`Unsupported Chromatics project version${version}. Original file was not modified.`)
  }
  const project = nativeProjectSchema.parse(input)
  if (project.version !== nativeProjectVersion(project.score)) {
    throw new Error(`Unsupported Chromatics project version ${project.version} for these hairpin endpoints. Original file was not modified.`)
  }
  validateReferences(project)
  return project
}

export function nativeProjectVersion(score: Score): NativeProject['version'] {
  return score.hairpins?.some(hairpin => hairpin.endTime) ? TIME_HAIRPIN_NATIVE_VERSION : NATIVE_VERSION
}

export function createNativeProject(score: Score): NativeProject {
  return validateNativeProject({ format: NATIVE_FORMAT, version: nativeProjectVersion(score), score, partLayouts: [], view: { mode: 'score' }, settings: { inputMode: 'duration-first' } })
}

export function decodeNativeProject(contents: string): NativeProject {
  assertSize(contents)
  let input: unknown
  try { input = JSON.parse(contents) } catch { throw new Error('Invalid Chromatics project JSON. Original file was not modified.') }
  return validateNativeProject(input)
}

export function encodeNativeProject(project: NativeProject): string {
  const contents = JSON.stringify(validateNativeProject(project))
  assertSize(contents)
  return contents
}

function assertSize(contents: string): void {
  if (contents.length > MAX_PROJECT_BYTES || new TextEncoder().encode(contents).byteLength > MAX_PROJECT_BYTES) {
    throw new Error('Chromatics project exceeds the 16 MiB limit.')
  }
}

function assertBoundedTree(input: unknown): void {
  const active = new Set<object>()
  const stack = [{ value: input, depth: 0, exit: false }]
  let nodes = 0
  while (stack.length) {
    const { value, depth, exit } = stack.pop()!
    if (!exit && ++nodes > 300000) throw new Error('Project exceeds the value count limit.')
    if (!value || typeof value !== 'object') continue
    if (exit) { active.delete(value); continue }
    if (active.has(value) || depth > 32) throw new Error('Invalid project nesting or cycle.')
    const children = Object.values(value)
    if (nodes + stack.length + children.length > 300000) throw new Error('Project exceeds the value count limit.')
    active.add(value)
    stack.push({ value, depth, exit: true })
    for (const child of children) stack.push({ value: child, depth: depth + 1, exit: false })
  }
}

function validateReferences(project: NativeProject): void {
  const { score } = project
  const partIds = new Set<string>(), measureIds = new Set<string>(), eventIds = new Set<string>()
  const eventOwners = new Map<string, { partId: string; staff: Staff; measureIndex: number; tick: number }>()
  const measureLocations = new Map<string, { staff: Staff; measure: Measure; measureIndex: number }>()
  const partMeasures = new Map<string, Set<string>>()
  const add = (set: Set<string>, value: string) => { if (set.has(value)) throw new Error(`Duplicate project ID: ${value}`); set.add(value) }
  for (const part of score.parts) {
    add(partIds, part.id)
    const staffIds = new Set<string>()
    const owned = new Set<string>()
    partMeasures.set(part.id, owned)
    for (const staff of part.staves) {
      add(staffIds, staff.id)
      for (const [measureIndex, measure] of staff.measures.entries()) {
        add(measureIds, measure.id); owned.add(measure.id)
        measureLocations.set(measure.id, { staff, measure, measureIndex })
        const voiceIds = new Set<string>()
        for (const voice of measure.voices) {
          add(voiceIds, voice.id)
          for (const event of voice.events) {
            add(eventIds, event.id)
            eventOwners.set(event.id, { partId: part.id, staff, measureIndex, tick: event.position.tick })
          }
          const errors = validateVoiceTuplets(voice)
          if (errors.length) throw new Error(`Invalid project tuplet: ${errors.join('; ')}`)
        }
        const rhythm = validateMeasureRhythm(measure)
        if (rhythm.issues.some(issue => issue.type !== 'gap')) throw new Error(`Invalid project rhythm in ${measure.id}`)
      }
    }
  }
  const refs = new Set(measureIds)
  score.parts[0]?.staves[0]?.measures.forEach(measure => refs.add(`measure-${measure.number}`))
  const requireMeasure = (reference: string, allowed = refs) => { if (!allowed.has(reference)) throw new Error(`Dangling measure reference: ${reference}`) }
  const markingIds = new Set<string>()
  for (const pedal of score.pedalEvents ?? []) {
    add(markingIds, pedal.id)
    const owner = score.parts.find(part => part.id === pedal.partId)?.staves.find(staff => staff.id === pedal.staffId)
    const measure = owner?.measures.find(measure => measure.id === pedal.measureId)
    if (!measure || pedal.tick > measureDurationTicks(measure)) throw new Error(`Invalid project pedal anchor: ${pedal.id}`)
  }
  for (const marks of [score.tempoEvents, score.harmonies, score.rehearsalMarks, score.staffTexts, score.systemTexts, score.expressionTexts, score.dynamics]) {
    for (const mark of marks ?? []) { add(markingIds, mark.id); requireMeasure(mark.measureId) }
  }
  const noteIds = new Set(score.parts.flatMap(part => part.staves.flatMap(staff => staff.measures.flatMap(measure => measure.voices.flatMap(voice => voice.events.filter(event => event.type === 'note').map(event => event.id))))))
  for (const kind of ['slurs', 'hairpins', 'octaveShifts'] as const) {
    for (const span of score[kind] ?? []) {
      add(markingIds, span.id)
      const start = eventOwners.get(span.startEventId)
      if ('endTime' in span && span.endTime) {
        const { measureId, voiceId, tick } = span.endTime
        const end = measureLocations.get(measureId)
        if (!start || !end || start.staff !== end.staff ||
            !end.measure.voices.some(voice => voice.id === voiceId) || tick > measureDurationTicks(end.measure) ||
            start.measureIndex > end.measureIndex || (start.measureIndex === end.measureIndex && start.tick >= tick)) {
          throw new Error(`Invalid project hairpin time endpoint: ${span.id}`)
        }
        continue
      }
      const end = span.endEventId === undefined ? undefined : eventOwners.get(span.endEventId)
      if (!start || !end || start.partId !== end.partId ||
        (kind !== 'hairpins' && (!noteIds.has(span.startEventId) || !noteIds.has(span.endEventId!)))) {
        throw new Error(`Invalid project span endpoints: ${span.id}`)
      }
    }
  }
  const checkLayout = (layout: Score['layout'], allowed = measureIds) => {
    for (const reference of [...(layout?.systemBreakBeforeMeasureIds ?? []), ...(layout?.pageBreakBeforeMeasureIds ?? [])]) requireMeasure(reference, allowed)
  }
  checkLayout(score.layout)
  const layouts = new Set<string>()
  for (const part of project.partLayouts) {
    add(layouts, part.partId)
    const owned = partMeasures.get(part.partId)
    if (!owned) throw new Error(`Unknown layout part: ${part.partId}`)
    checkLayout(part.layout, owned)
  }
  if (project.view.mode === 'part' && !partIds.has(project.view.partId)) throw new Error('Unknown selected project part.')
  const ties = validateTieRelations(score)
  if (ties.length) throw new Error(`Invalid project ties: ${ties.join('; ')}`)
}
