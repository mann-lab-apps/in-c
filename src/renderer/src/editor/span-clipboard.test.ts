import { describe, expect, it } from 'vitest'
import { applyScoreCommand, type Score } from '../../../score-core'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import fixture from '../../../musicxml/fixtures/rest-hairpin-input.musicxml?raw'
import { buildSpanClipboard, buildSpanPaste } from './span-clipboard'

function setup() {
  const score = parseMusicXml(fixture)
  const staff = score.parts[0].staves[0]
  const events = staff.measures[0].voices[1].events
  score.slurs = [{ id: 'source-slur', startEventId: events[1].id, endEventId: events[2].id }]
  score.hairpins = [{ id: 'source-hairpin', type: 'crescendo', startEventId: events[0].id, endEventId: events[3].id }]
  return { score, staff, events }
}

function addMeasure(score: Score) {
  const staff = score.parts[0].staves[0], measure = structuredClone(staff.measures[0])
  measure.id = `copy-${staff.measures.length}`
  measure.number = staff.measures.length + 1
  for (const voice of measure.voices) for (const event of voice.events) event.id = `${measure.id}-${event.id}`
  staff.measures.push(measure)
  return measure
}

describe('independent span clipboard', () => {
  it.each(['slur', 'hairpin'] as const)('copies cross-voice %s only for explicitly selected destination endpoints', kind => {
    const { score, staff, events } = setup()
    const source = kind === 'slur' ? score.slurs![0] : score.hairpins![0]
    source.startEventId = staff.measures[0].voices[0].events[0].id
    source.endEventId = events[kind === 'slur' ? 1 : 3].id
    source.engraving = { offsetY: 2 }
    const clipboard = buildSpanClipboard(score, { kind, id: source.id })!
    expect(clipboard).toBeDefined()
    expect(clipboard.requiresExplicitEnd).toBe(true)
    const target = addMeasure(score), start = target.voices[1].events[kind === 'slur' ? 1 : 0]
    const end = target.voices[1].events[kind === 'slur' ? 2 : 3]
    const selection = { type: 'event' as const, eventId: start.id }, before = structuredClone(score)
    expect(buildSpanPaste(score, selection, { ...clipboard, requiresExplicitEnd: false }, () => 'auto')).toBeDefined()
    expect(buildSpanPaste(score, selection, clipboard, () => 'auto')).toBeUndefined()
    expect(buildSpanPaste(score, selection, clipboard, () => 'invalid', 'missing')).toBeUndefined()
    const pasted = buildSpanPaste(score, selection, clipboard, () => 'explicit-cross-source', end.id)!
    const result = applyScoreCommand(score, pasted.command)
    const marks = kind === 'slur' ? result.score.slurs! : result.score.hairpins!
    expect(marks[1]).toMatchObject({ startEventId: start.id, endEventId: end.id, engraving: { offsetY: 2 } })
    expect(result.score.parts).toEqual(before.parts)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(before)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(JSON.parse(JSON.stringify(result.score)))
    const reopened = parseMusicXml(serializeMusicXml(result.score))
    const reopenedMarks = kind === 'slur' ? reopened.slurs : reopened.hairpins
    const [originalMeasure, targetMeasure] = reopened.parts[0].staves[0].measures
    expect(reopenedMarks).toHaveLength(2)
    expect(reopenedMarks).toContainEqual(expect.objectContaining({
      startEventId: originalMeasure.voices[0].events[0].id,
      endEventId: originalMeasure.voices[1].events[kind === 'slur' ? 1 : 3].id
    }))
    expect(reopenedMarks).toContainEqual(expect.objectContaining({
      startEventId: targetMeasure.voices[1].events[kind === 'slur' ? 1 : 0].id,
      endEventId: targetMeasure.voices[1].events[kind === 'slur' ? 2 : 3].id
    }))
    expect(score).toEqual(before)
  })
  it.each(['slur', 'hairpin'] as const)('explicit %s targets choose a chord event across voices without replacing notes', kind => {
    const { score, events } = setup()
    const target = addMeasure(score), upper = target.voices[0].events[0]
    const end = target.voices[1].events[2]
    if (upper.type !== 'note' || end.type !== 'note') throw new Error('Expected chord notes')
    upper.pitches = [upper.pitch, { step: 'B', octave: 5 }]
    end.pitches = [end.pitch, { step: 'F', octave: 4 }]
    const original = structuredClone(score)
    const clipboard = buildSpanClipboard(score, { kind, id: `source-${kind}` })!
    const selection = { type: 'event' as const, eventId: upper.id }
    expect(buildSpanPaste(score, selection, clipboard, () => 'auto')).toBeUndefined()
    const pasted = buildSpanPaste(score, selection, clipboard, () => 'explicit', end.id)!
    expect(pasted).toBeDefined()
    const result = applyScoreCommand(score, pasted.command)
    const spans = kind === 'slur' ? result.score.slurs! : result.score.hairpins!
    expect(spans[1]).toMatchObject({ id: 'explicit', startEventId: upper.id, endEventId: end.id })
    expect(result.score.parts).toEqual(original.parts)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(original)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(JSON.parse(JSON.stringify(result.score)))
    const reopened = parseMusicXml(serializeMusicXml(result.score))
    const reStaff = reopened.parts[0].staves[0], reTarget = reStaff.measures[1]
    expect(kind === 'slur' ? reopened.slurs : reopened.hairpins).toContainEqual(expect.objectContaining({
      startEventId: reTarget.voices[0].events[0].id, endEventId: reTarget.voices[1].events[2].id
    }))
    expect(events[1].type).toBe('note')
    expect(score).toEqual(original)
  })

  it('invalid explicit endpoints never fall back to a valid automatic endpoint', () => {
    const { score, events } = setup()
    const clipboard = buildSpanClipboard(score, { kind: 'slur', id: 'source-slur' })!
    const selection = { type: 'event' as const, eventId: events[1].id }
    expect(buildSpanPaste(score, selection, clipboard, () => 'auto')).toBeDefined()
    const foreign = structuredClone(score.parts[0])
    foreign.id = 'other'; foreign.staves[0].id = 'other-staff'
    for (const measure of foreign.staves[0].measures) {
      measure.id = 'other-' + measure.id
      for (const voice of measure.voices) for (const event of voice.events) event.id = 'other-' + event.id
    }
    score.parts.push(foreign)
    const original = structuredClone(score)
    for (const id of ['', 'missing', events[0].id, events[1].id, events[3].id, 'other-' + events[2].id]) {
      expect(buildSpanPaste(score, selection, clipboard, () => 'bad', id)).toBeUndefined()
    }
    expect(score).toEqual(original)
  })

  it.each(['slur', 'hairpin'] as const)('copies %s without destination note mutation through history/native/XML', kind => {
    const { score: source } = setup()
    const span = kind === 'slur' ? source.slurs![0] : source.hairpins![0]
    span.engraving = { offsetY: 3, segments: [{ partId: source.parts[0].id, staffId: source.parts[0].staves[0].id,
      startMeasureId: source.parts[0].staves[0].measures[0].id, endMeasureId: source.parts[0].staves[0].measures[0].id, geometry: { height: 4 } }] }
    const clipboard = buildSpanClipboard(source, { kind, id: span.id })!
    const snapshot = structuredClone(clipboard)
    source.slurs = source.hairpins = undefined
    span.engraving.offsetY = 99
    expect(clipboard).toEqual(snapshot)
    const { score } = setup(), target = addMeasure(score)
    const original = structuredClone(score)
    const startIndex = kind === 'slur' ? 1 : 0, endIndex = kind === 'slur' ? 2 : 3
    const pasted = buildSpanPaste(score, { type: 'event', eventId: target.voices[1].events[startIndex].id }, clipboard, () => 'pasted')!
    const result = applyScoreCommand(score, pasted.command)
    expect(result.score.parts).toEqual(original.parts)
    const spans = kind === 'slur' ? result.score.slurs! : result.score.hairpins!
    expect(spans[1]).toMatchObject({ id: 'pasted', startEventId: target.voices[1].events[startIndex].id,
      endEventId: target.voices[1].events[endIndex].id, engraving: { offsetY: 3,
        segments: [{ startMeasureId: target.id, endMeasureId: target.id, geometry: { height: 4 } }] } })
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(original)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(JSON.parse(JSON.stringify(result.score)))
    const reopened = parseMusicXml(serializeMusicXml(result.score))
    expect(kind === 'slur' ? reopened.slurs : reopened.hairpins).toHaveLength(2)
    expect(clipboard).toEqual(snapshot)
    expect(score).toEqual(original)
  })

  it('matches exact cross-measure tick distance and rejects missing or ambiguous endpoints', () => {
    const { score, events } = setup(), second = addMeasure(score), third = addMeasure(score)
    score.hairpins![0].startEventId = events[3].id
    score.hairpins![0].endEventId = second.voices[1].events[1].id
    const clipboard = buildSpanClipboard(score, { kind: 'hairpin', id: 'source-hairpin' })!
    const selection = { type: 'event' as const, eventId: second.voices[1].events[3].id }
    const pasted = buildSpanPaste(score, selection, clipboard, () => 'cross')!
    expect(applyScoreCommand(score, pasted.command).score.hairpins![1].endEventId).toBe(third.voices[1].events[1].id)
    const end = third.voices[1].events.splice(1, 1)[0]
    expect(buildSpanPaste(score, selection, clipboard, () => 'missing')).toBeUndefined()
    third.voices[1].events.push(end, { ...end, id: 'ambiguous' })
    expect(buildSpanPaste(score, selection, clipboard, () => 'ambiguous')).toBeUndefined()
  })

  it('rejects slur rest targets and missing source anchors without altering the score', () => {
    const { score, events } = setup(), snapshot = structuredClone(score)
    const clipboard = buildSpanClipboard(score, { kind: 'slur', id: 'source-slur' })!
    expect(buildSpanPaste(score, { type: 'event', eventId: events[0].id }, clipboard, () => 'bad')).toBeUndefined()
    expect(buildSpanPaste(score, { type: 'measure', measureId: score.parts[0].staves[0].measures[0].id }, clipboard, () => 'bad')).toBeUndefined()
    expect(score).toEqual(snapshot)
    score.slurs![0].startEventId = 'missing-source'
    expect(buildSpanClipboard(score, { kind: 'slur', id: 'source-slur' })).toBeUndefined()
  })
})
