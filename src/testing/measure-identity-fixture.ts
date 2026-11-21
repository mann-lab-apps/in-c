import { TICKS_PER_QUARTER as q } from '../score-core'
import { serializeMusicXml } from '../musicxml/serialize'
import { singleHarmonyFixture } from './single-harmony-fixture'

export function replaceMeasureLabels(xml: string, partIndex: number, labels: readonly (string | undefined)[]) {
  let currentPart = -1
  return xml.replace(/<part(?=\s|>)[^>]*>[\s\S]*?<\/part>/g, part => {
    currentPart += 1
    if (currentPart !== partIndex) return part
    let index = 0
    return part.replace(/<measure\b[^>]*>/g, tag => {
      const value = labels[index++]
      const escaped = value?.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
      return tag.replace(/\snumber="[^"]*"/, escaped === undefined ? '' : ` number="${escaped}"`)
    })
  })
}

/** Multiple staves/parts and nonzero source offsets exercise the parser's node-keyed timing maps. */
export function createMeasureIdentityFixture(partIndex: number, labels: readonly (string | undefined)[], linearSpans = false) {
  const score = singleHarmonyFixture()
  score.title = '마디 식별자 교환 감사'
  score.harmonies = score.harmonies!.filter(h => ['h-source-first', 'h-lower-neighbor', 'h-target-existing'].includes(h.id))
  const upper = score.parts[0].staves[0], lower = score.parts[0].staves[1], other = score.parts[1].staves[0]
  for (const bar of lower.measures) bar.clef = { sign: 'F', line: 4 }
  const tieStart = upper.measures[0].voices[0].events[1], tieEnd = upper.measures[1].voices[0].events[0]
  if (tieStart.type !== 'note' || tieEnd.type !== 'note') throw Error('Owned tie notes')
  tieEnd.pitch = { ...tieStart.pitch }; tieStart.ties = { start: true }; tieEnd.ties = { stop: true }
  score.tempo = { bpm: 120, beatUnit: 'quarter' }
  score.tempoEvents = [{ id: 'identity-tempo', measureId: upper.measures[1].id, tick: q, bpm: 84, beatUnit: 'quarter' }]
  score.rehearsalMarks = [{ id: 'identity-rehearsal', measureId: upper.measures[3].id, text: 'D' }]
  score.systemTexts = [{ id: 'identity-system', measureId: upper.measures[2].id, text: '공통 안내' }]
  score.staffTexts = [{ id: 'identity-upper', measureId: upper.measures[1].id, text: '위 보표' }, { id: 'identity-lower', measureId: lower.measures[2].id, text: '아래 보표' }]
  score.dynamics = [{ id: 'identity-dynamic', measureId: lower.measures[1].id, value: 'mf' }, { id: 'identity-other-dynamic', measureId: other.measures[2].id, value: 'p' }]
  score.slurs = [{ id: 'identity-slur', startEventId: upper.measures[0].voices[0].events[0].id, endEventId: upper.measures[2].voices[0].events[1].id }]
  score.hairpins = [{ id: 'identity-hairpin', startEventId: lower.measures[0].voices[0].events[1].id, endEventId: lower.measures[2].voices[0].events[0].id, type: 'crescendo' }]
  score.octaveShifts = [{ id: 'identity-octave', startEventId: other.measures[1].voices[0].events[0].id, endEventId: other.measures[3].voices[0].events[1].id, type: '8va' }]
  if (linearSpans) {
    score.slurs[0].startEventId = upper.measures[2].voices[0].events[0].id
    score.slurs[0].endEventId = upper.measures[3].voices[0].events[1].id
    score.hairpins[0].startEventId = lower.measures[2].voices[0].events[0].id
    score.hairpins[0].endEventId = lower.measures[3].voices[0].events[1].id
    score.octaveShifts[0].startEventId = other.measures[2].voices[0].events[0].id
  }
  score.pedalEvents = [{ id: 'identity-pedal-down', partId: score.parts[0].id, staffId: lower.id, measureId: lower.measures[1].id, tick: q, value: 127 }, { id: 'identity-pedal-up', partId: score.parts[0].id, staffId: lower.id, measureId: lower.measures[3].id, tick: 2 * q, value: 0 }]
  for (const staff of score.parts[0].staves) {
    staff.measures[0].repeat = { start: true }; staff.measures[1].repeat = { end: true, times: 2 }
    staff.measures[1].volta = { number: 1, start: true, end: true }; staff.measures[2].volta = { number: 2, start: true, end: true }
  }
  score.layout = { systemBreakBeforeMeasureIds: [upper.measures[2].id] }
  let xml = serializeMusicXml(score), currentPart = -1
  xml = xml.replace(/<part(?=\s|>)[^>]*>[\s\S]*?<\/part>/g, part => {
    currentPart += 1
    return currentPart === 0 ? part.replace(/<measure number="2"[^>]*>/, tag => tag + `<sound tempo="72"><offset>${3 * q}</offset></sound>`) : part
  })
  const control = replaceMeasureLabels(xml, partIndex === 0 ? 1 : 0, ['10', '20', '30', '40'])
  return { control, source: replaceMeasureLabels(control, partIndex, labels), partIndex, labels }
}
