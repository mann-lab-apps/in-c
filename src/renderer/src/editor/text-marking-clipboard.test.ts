import { describe, expect, it } from 'vitest'
import { applyScoreCommand, measureDurationTicks } from '../../../score-core'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import fixture from '../../../musicxml/fixtures/release-qa.musicxml?raw'
import { buildTextMarkingClipboard, buildTextMarkingDeleteCommand, buildTextMarkingPasteCommand } from './text-marking-clipboard'

describe('independent measure text clipboard', () => {
  it.each(['staffTexts', 'systemTexts', 'rehearsalMarks', 'expressionTexts'] as const)(
    '%s preserves unrelated data, ownership and snapshots through native/XML history', type => {
      const score = parseMusicXml(fixture), source = score.parts[0].staves[0].measures[0]
      const targetPart = structuredClone(score.parts[0])
      targetPart.id = 'other-part'
      for (const staff of targetPart.staves) {
        staff.id = 'other-' + staff.id
        for (const measure of staff.measures) {
          measure.id = 'other-' + measure.id
          for (const voice of measure.voices) for (const event of voice.events) event.id = 'other-' + event.id
        }
      }
      score.parts.push(targetPart)
      const global = type === 'systemTexts'
      const target = global ? score.parts[0].staves[0].measures[1] : targetPart.staves[0].measures[0]
      const marks = [{ id: 'copy-source', measureId: source.id, text: 'source text' },
        { id: 'replace-target', measureId: target.id, text: 'old target' }]
      if (type === 'expressionTexts') score.expressionTexts = marks.map(mark => ({ ...mark, tick: 13440 }))
      else score[type] = marks
      const clipboard = buildTextMarkingClipboard(score, source.id, type)!
      score[type]![0].text = 'edited source'
      const before = structuredClone(score)
      const command = buildTextMarkingPasteCommand(score, target.id, clipboard, () => 'new')!
      const pasted = applyScoreCommand(score, command)
      expect(pasted.score[type]).toContainEqual(expect.objectContaining({ id: 'text-new', measureId: target.id, text: 'source text' }))
      expect(pasted.score).toEqual({ ...before, [type]: pasted.score[type] })
      expect(pasted.score[type]![0]).toEqual(before[type]![0])
      expect(applyScoreCommand(pasted.score, pasted.undo).score).toEqual(before)
      expect(decodeNativeProject(encodeNativeProject(createNativeProject(pasted.score))).score).toEqual(JSON.parse(JSON.stringify(pasted.score)))
      const reopened = parseMusicXml(serializeMusicXml(pasted.score))
      expect(reopened[type]).toContainEqual(expect.objectContaining({ text: 'source text',
        measureId: global ? `measure-${target.number}` : reopened.parts[1].staves[0].measures[0].id }))
      if (global) expect(buildTextMarkingPasteCommand(score, targetPart.staves[0].measures[0].id, clipboard, () => 'unsupported')).toBeUndefined()
      const deletion = buildTextMarkingDeleteCommand(pasted.score, target.id, type)!
      const deleted = applyScoreCommand(pasted.score, deletion)
      expect(deleted.score[type]).toHaveLength(1)
      expect(deleted.score.parts).toEqual(before.parts)
      expect(applyScoreCommand(deleted.score, deleted.undo).score).toEqual(pasted.score)
      expect(score).toEqual(before)
      expect(clipboard.marks[0].text).toBe('source text')
    })

  it('rejects out-of-measure expression ticks and duplicate IDs without partial replacement', () => {
    const score = parseMusicXml(fixture), [source, target] = score.parts[0].staves[0].measures
    const ticks = measureDurationTicks(target)
    score.expressionTexts = [{ id: 'source-text', measureId: source.id, tick: ticks - 1, text: 'at end' },
      { id: 'existing', measureId: target.id, tick: 0, text: 'preserve' }]
    const clipboard = buildTextMarkingClipboard(score, source.id, 'expressionTexts')!
    const before = structuredClone(score)
    expect(buildTextMarkingPasteCommand(score, target.id, clipboard, () => 'valid')).toBeDefined()
    if (clipboard.type !== 'expressionTexts') throw new Error('Expected expression clipboard')
    for (const tick of [ticks, ticks + 1, -1, 0.5]) {
      clipboard.marks[0].tick = tick
      expect(buildTextMarkingPasteCommand(score, target.id, clipboard, () => 'bad')).toBeUndefined()
    }
    clipboard.marks[0].tick = 0
    clipboard.marks.push({ ...clipboard.marks[0], id: 'second' })
    expect(buildTextMarkingPasteCommand(score, target.id, clipboard, () => 'duplicate')).toBeUndefined()
    expect(buildTextMarkingPasteCommand(score, 'missing', clipboard, () => 'bad')).toBeUndefined()
    expect(score).toEqual(before)
  })
})
