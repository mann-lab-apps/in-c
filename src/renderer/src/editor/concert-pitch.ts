import { formatStandardHarmonyText, inferHarmonyStructure } from '../../../musicxml/harmony-text'
import {
  pitchToMidi,
  resolveNotePitch,
  transposeDiatonic,
  type HarmonyMark,
  type InstrumentTransposition,
  type Measure,
  type Pitch,
  type Score,
  type VoiceEvent
} from '../../../score-core'
import { isPersistablePitch } from './pitch-range'

type Interval = { semitones: number; steps: number }
type ConcertPitchView = { score: Score; reason?: never } | { score?: never; reason: string }

const fixedPartReason = '실음 보기는 모든 마디와 보표에 같은 이조가 지정된 단일 파트에서 사용할 수 있습니다.'
const notationRangeReason = '현재 표기 범위에서 실음 조표, 음표 또는 임시표를 표시할 수 없습니다.'
const harmonyReason = '이 악보의 코드 심벌을 실음으로 정확히 표시할 수 없습니다.'

/** A view of the written score. IDs and positions still refer to its source document. */
export function createConcertPitchView(score: Score): ConcertPitchView {
  if (score.parts.length !== 1) return { reason: fixedPartReason }
  const part = score.parts[0]
  const measures = part.staves.flatMap(staff => staff.measures)
  if (!measures.length || measures.some(measure => ['percussion', 'tab'].includes(measure.clef.sign))) {
    return { reason: fixedPartReason }
  }

  const intervals = measures.map(measure => readInterval(measure.transposition))
  if (intervals.some(interval => !interval)) {
    return { reason: '실음 보기에 필요한 음이름 간격이 이조 설정에 없습니다.' }
  }
  const interval = intervals[0]!
  if (!interval.semitones || intervals.some(candidate =>
    candidate?.semitones !== interval.semitones || candidate.steps !== interval.steps
  )) return { reason: fixedPartReason }

  const staves: typeof part.staves = []
  for (const staff of part.staves) {
    const projected: Measure[] = []
    for (const measure of staff.measures) {
      const result = projectMeasure(measure, interval)
      if (!result) return { reason: notationRangeReason }
      projected.push(result)
    }
    staves.push({ ...staff, measures: projected })
  }

  const harmonies = score.harmonies?.map(harmony => projectHarmony(harmony, interval))
  if (harmonies && !harmonies.every(harmony => harmony !== undefined)) return { reason: harmonyReason }
  return { score: { ...score, parts: [{ ...part, staves }], harmonies } }
}

function readInterval(transposition: InstrumentTransposition | undefined): Interval | undefined {
  const chromatic = transposition?.chromatic ?? 0
  const octaveChange = transposition?.octaveChange ?? 0
  const diatonic = transposition?.diatonic ?? (chromatic % 12 === 0 ? chromatic / 12 * 7 : undefined)
  if (diatonic === undefined) return undefined
  return { semitones: chromatic + 12 * octaveChange, steps: diatonic + 7 * octaveChange }
}

function projectMeasure(measure: Measure, interval: Interval): Measure | undefined {
  // A fifth is seven semitones and four staff steps. Octave components cancel.
  const fifths = measure.keySignature.fifths + 7 * interval.semitones - 12 * interval.steps
  if (Math.abs(fifths) > 7) return undefined

  const voices: Measure['voices'] = []
  for (const voice of measure.voices) {
    const events: VoiceEvent[] = []
    for (const event of voice.events) {
      if (event.type === 'rest') {
        events.push(event)
        continue
      }
      const project = (pitch: Pitch) =>
        projectPitch(resolveNotePitch(measure, voice, { ...event, pitch }), interval)
      const pitch = project(event.pitch)
      const pitches = event.pitches?.map(project)
      const graces = event.graceNotes?.map(grace => {
        const projected = project(grace.pitch)
        return projected ? { ...grace, pitch: projected } : undefined
      })
      if (!pitch || (pitches && !pitches.every(member => member !== undefined)) ||
        (graces && !graces.every(grace => grace !== undefined))) return undefined
      events.push({ ...event, pitch, pitches, graceNotes: graces })
    }
    voices.push({ ...voice, events })
  }
  return { ...measure, keySignature: { ...measure.keySignature, fifths }, transposition: undefined, voices }
}

function projectPitch(pitch: Pitch, interval: Interval): Pitch | undefined {
  let target: Pitch = { step: pitch.step, octave: pitch.octave + Math.trunc(interval.steps / 7) }
  const remainder = interval.steps % 7
  for (let step = 0; step < Math.abs(remainder); step += 1) {
    target = transposeDiatonic(target, remainder < 0 ? -1 : 1)
  }
  const alter = pitchToMidi(pitch) + interval.semitones - pitchToMidi(target)
  if (Math.abs(alter) > 2 || !isPersistablePitch(target)) return undefined
  return { ...target, alter: alter as Pitch['alter'] }
}

function projectHarmony(harmony: HarmonyMark, interval: Interval): HarmonyMark | undefined {
  const { text, root, kind, bass } = inferHarmonyStructure(harmony)
  if (kind === 'none') return harmony
  if (!root || formatStandardHarmonyText(root, kind, bass) !== text) return undefined

  const project = (pitch: NonNullable<HarmonyMark['root']>) => {
    const result = projectPitch({ ...pitch, octave: 4 }, interval)
    return result && { step: result.step, alter: result.alter }
  }
  const displayedRoot = project(root)
  const displayedBass = bass && project(bass)
  if (!displayedRoot || (bass && !displayedBass)) return undefined
  const display = formatStandardHarmonyText(displayedRoot, kind, displayedBass)
  return display ? { ...harmony, text: display, root: displayedRoot, kind, bass: displayedBass } : undefined
}
