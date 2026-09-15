import { describe, expect, it } from 'vitest'
import { applyScoreCommand } from '../../../score-core'
import { parseMusicXml, serializeMusicXml, serializeMusicXmlWithReport } from '../../../musicxml'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import fixture from '../../../musicxml/fixtures/rest-hairpin-input.musicxml?raw'
import { buildSpanDeleteCommand, buildSpanEndpointCommand, buildSpanEngravingCommand, listSpans, spanEndpointOptions } from './span-editing'

function setup() {
  const score = parseMusicXml(fixture)
  const events = score.parts[0].staves[0].measures[0].voices[1].events
  score.hairpins = [{ id: 'h', type: 'crescendo', startEventId: events[0].id, endEventId: events[3].id }]
  score.slurs = [{ id: 's', startEventId: events[1].id, endEventId: events[2].id }]
  return { score, events }
}

describe('span endpoint editing', () => {
  it('preserves unrelated markings and supports history/native/XML for rest hairpins', () => {
    const { score, events } = setup()
    const original = structuredClone(score)
    const command = buildSpanEndpointCommand(score, { kind: 'hairpin', id: 'h' }, { endEventId: events[2].id })
    const changed = applyScoreCommand(score, command)
    expect(changed.score.parts).toEqual(score.parts)
    expect(changed.score.slurs).toEqual(score.slurs)
    expect(changed.score.hairpins?.[0].endEventId).toBe(events[2].id)
    expect(applyScoreCommand(changed.score, changed.undo).score).toEqual(original)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(changed.score))).score.hairpins).toEqual(changed.score.hairpins)
    const reopened = parseMusicXml(serializeMusicXml(changed.score))
    const reopenedEvents = reopened.parts[0].staves[0].measures[0].voices[1].events
    expect(reopened.hairpins?.[0]).toMatchObject({ startEventId: reopenedEvents[0].id, endEventId: reopenedEvents[2].id })
    expect(score).toEqual(original)
  })

  it('rejects missing, reversed, coincident, foreign and slur rest endpoints', () => {
    const { score, events } = setup()
    const foreign = structuredClone(score.parts[0])
    foreign.id = 'foreign'
    foreign.staves[0].id = 'foreign-staff'
    for (const measure of foreign.staves[0].measures) {
      measure.id = `foreign-${measure.id}`
      for (const voice of measure.voices) for (const event of voice.events) event.id = `foreign-${event.id}`
    }
    const foreignId = foreign.staves[0].measures[0].voices[0].events[0].id
    score.parts.push(foreign)
    expect(() => createNativeProject(score)).not.toThrow()
    expect(listSpans(score, foreign.id)).toEqual([])
    expect(listSpans(score, score.parts[0].id)).toHaveLength(2)
    for (const endEventId of ['missing', foreignId, events[0].id]) {
      expect(() => buildSpanEndpointCommand(score, { kind: 'hairpin', id: 'h' }, { endEventId })).toThrow()
    }
    expect(() => buildSpanEndpointCommand(score, { kind: 'hairpin', id: 'h' }, { startEventId: events[3].id, endEventId: events[1].id })).toThrow()
    expect(() => buildSpanEndpointCommand(score, { kind: 'slur', id: 's' }, { endEventId: events[3].id })).toThrow()
    expect(spanEndpointOptions(score, { kind: 'slur', id: 's' }).some(option => option.id === events[0].id)).toBe(false)
  })

  it('deletes only the named kind and can restore it', () => {
    const { score } = setup()
    const result = applyScoreCommand(score, buildSpanDeleteCommand(score, { kind: 'hairpin', id: 'h' })!)
    expect(result.score.hairpins).toBeUndefined()
    expect(result.score.slurs).toEqual(score.slurs)
    expect(result.score.parts).toEqual(score.parts)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
    expect(buildSpanDeleteCommand(result.score, { kind: 'hairpin', id: 'h' })).toBeUndefined()
  })

  it('persists manual geometry independently from anchors and warns about XML loss', () => {
    const { score } = setup()
    const reference = { kind: 'hairpin' as const, id: 'h' }
    const engraving = { placement: 'above' as const, offsetX: 1, offsetY: -0.5, height: 3 }
    const result = applyScoreCommand(score, buildSpanEngravingCommand(score, reference, engraving))
    expect(result.score.hairpins?.[0]).toEqual({ ...score.hairpins![0], engraving })
    expect(result.score.parts).toEqual(score.parts)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score.hairpins?.[0].engraving).toEqual(engraving)
    expect(serializeMusicXmlWithReport(result.score).report.warnings).toContainEqual(expect.objectContaining({ code: 'unsupported-layout', path: 'score.hairpins[0].engraving' }))
    const reset = applyScoreCommand(result.score, buildSpanEngravingCommand(result.score, reference))
    expect(reset.score.hairpins?.[0].engraving).toBeUndefined()
    expect(applyScoreCommand(reset.score, reset.undo).score).toEqual(result.score)
    expect(() => buildSpanEngravingCommand(score, reference, { offsetY: Infinity })).toThrow()
    expect(() => buildSpanEngravingCommand(score, reference, { height: -1 })).toThrow()
  })
})
