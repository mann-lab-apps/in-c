import { expect, it } from 'vitest'
import { createPartSwingExportFixture } from '../../../testing/part-swing-export-fixture'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { serializeMusicXml } from '../../../musicxml'
import { preparePartSwingExport } from './part-swing-export'

it('omits unavailable swing from a derived copy without mutating source, IDs or layout', () => {
  const source = createPartSwingExportFixture()
  source.layout = { pageSetup: { pageSize: 'a4', pageMarginMm: 12 } }
  source.slurs = [{
    id: 'manual-part-slur', startEventId: 'other-swing-0', endEventId: 'other-swing-7',
    engraving: { placement: 'above', offsetX: 0, offsetY: 1, height: 4 }
  }]
  const projected = { ...source, parts: [source.parts[1]] }
  const before = encodeNativeProject(createNativeProject(source)), xml = serializeMusicXml(source)
  const result = preparePartSwingExport(source, projected)
  expect(result.score).not.toBe(projected)
  expect(result.score.swingPlayback).toBeUndefined()
  expect(projected.swingPlayback).toEqual({ unit: 'eighth', ratio: '3:2' })
  expect(result.score.parts).toBe(projected.parts)
  expect(result.score.layout).toBe(projected.layout)
  expect(result.score.slurs).toBe(projected.slurs)
  expect(result.score.slurs?.[0].engraving).toEqual({ placement: 'above', offsetX: 0, offsetY: 1, height: 4 })
  expect(result.warning).toMatchObject({ code: 'studio-part-swing-projection', path: 'score.swingPlayback' })
  expect(encodeNativeProject(createNativeProject(source))).toBe(before)
  expect(serializeMusicXml(source)).toBe(xml)
  expect(xml).toContain('<swing>')
  expect(serializeMusicXml(result.score)).not.toContain('<swing>')
})

it.each(['aligned', 'off', 'off-unaligned'] as const)('preserves the existing %s copy by identity with no notice', kind => {
  const source = createPartSwingExportFixture(kind), projected = { ...source, parts: [source.parts[1]] }
  const result = preparePartSwingExport(source, projected)
  expect(result.score).toBe(projected)
  expect(result.warning).toBeUndefined()
})
