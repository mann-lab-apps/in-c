import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createPrintHeaderFixture } from '../testing/print-header-fixture'
import { decodeNativeProject, encodeNativeProject } from './schema'
import { parseMusicXml, serializeMusicXml } from '../musicxml'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { resolvePrintLayoutPlan } from '../renderer/src/notation/print-layout'

it('separates model page target from measured imported-header height', () => {
  for (const kind of ['short', 'long'] as const) {
    const project = createPrintHeaderFixture('short'), staff = project.score.parts[0].staves[0]
    const originals = staff.measures
    staff.measures = Array.from({ length: 9 }, (_, index) => {
      const measure = structuredClone(originals[index % originals.length])
      measure.id = `pagination-measure-${index}`; measure.number = index + 1
      for (const voice of measure.voices) for (const event of voice.events) event.id = `pagination-note-${index}-${event.id}`
      return measure
    })
    project.score.layout = { systemBreakBeforeMeasureIds: [staff.measures[3].id, staff.measures[6].id] }
    if (kind === 'long') project.score.title = '가져온 긴 제목을 자르지 않고 실제 높이와 출력 페이지를 확인합니다 '.repeat(60).trim()
    expect(resolvePrintLayoutPlan(project.score, 1).pageCount).toBe(1)
    expect(decodeNativeProject(encodeNativeProject(project))).toEqual(project)
    const xml = serializeMusicXml(project.score)
    expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(project.score))
    const out = process.env.DDIRORI_PAGINATION_HEADER_QA_DIR
    if (out) {
      const dir = join(out, kind); mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(project))
      writeFileSync(join(dir, 'expected.musicxml'), xml)
      writeFileSync(join(dir, 'expected.mid'), serializeMidi(project.score))
    }
  }
})
