import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseMusicXml } from '../musicxml/parse'
import { applyScoreCommand, resolveSpanSegmentEngraving, replaceSpanSegmentEngraving, pruneSpanSegmentEngravings } from '../score-core'
import { buildSpanEngravingCommand } from '../renderer/src/editor/span-editing'
import { buildInsertMeasureBefore, buildRemoveMeasure } from '../renderer/src/editor/measure-management'
import { createNativeProject, decodeNativeProject, encodeNativeProject, validateNativeProject } from './schema'

function fixture() {
  const score = parseMusicXml(readFileSync('src/musicxml/fixtures/release-qa.musicxml', 'utf8'))
  const part = score.parts[0]!, staff = part.staves[0]!
  const notes = staff.measures.flatMap(measure => measure.voices.flatMap(voice => voice.events.filter(event => event.type === 'note')))
  score.slurs = [{ id: 'segmented-slur', startEventId: notes[0]!.id, endEventId: notes.at(-1)!.id }]
  const address = (first: number, last: number) => ({ partId: part.id, staffId: staff.id,
    startMeasureId: staff.measures[first]!.id, endMeasureId: staff.measures[last]!.id })
  return { score, address, reference: { kind: 'slur' as const, id: 'segmented-slur' } }
}

describe('portable span segment geometry', () => {
  it('edits one musical segment, retains whole geometry and does not retarget after reflow', () => {
    const { score, address, reference } = fixture()
    const whole = { offsetY: -1, height: 2 }
    const engraving = replaceSpanSegmentEngraving(whole, address(0, 1), { offsetY: 3 })
    const result = applyScoreCommand(score, buildSpanEngravingCommand(score, reference, engraving))
    expect(resolveSpanSegmentEngraving(engraving, address(0, 1))).toEqual({ offsetY: 3 })
    expect(resolveSpanSegmentEngraving(engraving, address(2, 3))).toEqual(whole)
    expect(resolveSpanSegmentEngraving(engraving, address(0, 2))).toEqual(whole)
    expect(result.score.parts).toEqual(score.parts)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
    const reopened = decodeNativeProject(encodeNativeProject(createNativeProject(result.score)))
    expect(reopened.score.slurs![0]!.engraving).toEqual(engraving)
    const automatic = replaceSpanSegmentEngraving(engraving, address(0, 1), null)
    expect(resolveSpanSegmentEngraving(automatic, address(0, 1))).toBeUndefined()
    expect(resolveSpanSegmentEngraving(replaceSpanSegmentEngraving(automatic, address(0, 1), undefined), address(0, 1))).toEqual(whole)
  })

  it('rejects invalid ownership, duplicate or reversed anchors and legacy segment fields', () => {
    const { score, address } = fixture()
    const engraving = replaceSpanSegmentEngraving(undefined, address(0, 1), { height: 4 })
    score.slurs![0]!.engraving = engraving
    const project = createNativeProject(score)
    for (const version of [1, 2, 3]) expect(() => validateNativeProject({ ...project, version })).toThrow()
    for (const patch of [{ partId: 'foreign' }, { staffId: 'foreign' }, { startMeasureId: 'missing' }, address(3, 1)]) {
      const invalid = structuredClone(project)
      Object.assign(invalid.score.slurs![0]!.engraving!.segments![0], patch)
      expect(() => validateNativeProject(invalid)).toThrow(/segment/i)
    }
    const duplicate = structuredClone(project)
    duplicate.score.slurs![0]!.engraving!.segments!.push(engraving.segments![0]!)
    expect(() => validateNativeProject(duplicate)).toThrow(/segment/i)
  })

  it('prunes removed anchors only in snapshots and keeps unaffected overrides', () => {
    const { score, address } = fixture()
    const span = score.slurs![0]!
    span.engraving = replaceSpanSegmentEngraving({ offsetY: -1 }, address(0, 1), { height: 3 })
    span.engraving = replaceSpanSegmentEngraving(span.engraving, address(2, 3), { height: 4 })
    const original = structuredClone(span.engraving)
    score.parts[0]!.staves[0]!.measures.splice(1, 1)
    const saved = pruneSpanSegmentEngravings(score, span, span.engraving)
    expect(saved?.segments).toHaveLength(1)
    expect(saved?.segments![0]!.startMeasureId).toBe(address(1, 2).startMeasureId)
    expect(span.engraving).toEqual(original)
  })

  it('keeps musical segment identity after ensemble insertion and part reordering with undo', () => {
    const score = parseMusicXml(readFileSync('src/musicxml/fixtures/expanded-v1-part-export.musicxml', 'utf8'))
    const part = score.parts[1]!, staff = part.staves[0]!, span = score.slurs![0]!
    const address = { partId: part.id, staffId: staff.id, startMeasureId: staff.measures[0]!.id, endMeasureId: staff.measures[1]!.id }
    span.engraving = replaceSpanSegmentEngraving({ offsetY: -1 }, address, { height: 3 })
    const project = createNativeProject(score)
    project.partLayouts = [{ partId: part.id, layout: {}, spanEngravings: [{ kind: 'slur', spanId: span.id,
      engraving: replaceSpanSegmentEngraving(undefined, address, { height: 4 }) }] }]
    let id = 0
    const insertion = buildInsertMeasureBefore(score, address.startMeasureId, kind => `segment-${kind}-${++id}`)!
    const inserted = applyScoreCommand(score, insertion.command)
    expect(inserted.score.parts.flatMap(part => part.staves.map(staff => staff.measures.length))).toEqual([3, 3, 3])
    const reordered = applyScoreCommand(inserted.score, { type: 'score-parts.replace', parts: [...inserted.score.parts].reverse() })
    const reopened = decodeNativeProject(encodeNativeProject({ ...project, score: reordered.score }))
    expect(reopened.score.parts[0]!.id).toBe(part.id)
    expect(reopened.score.slurs![0]!.engraving).toEqual(span.engraving)
    expect(reopened.partLayouts).toEqual(project.partLayouts)
    expect(resolveSpanSegmentEngraving(reopened.score.slurs![0]!.engraving, address)).toEqual({ height: 3 })
    const insertedMeasure = inserted.score.parts[1]!.staves[0]!.measures[0]!
    const removed = applyScoreCommand(inserted.score, buildRemoveMeasure(inserted.score, insertedMeasure.id)!.command)
    expect(removed.score.slurs).toEqual(score.slurs)
    expect(applyScoreCommand(reordered.score, reordered.undo).score).toEqual(inserted.score)
    expect(applyScoreCommand(inserted.score, inserted.undo).score).toEqual(score)
  })
})
