import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createPrintHeaderFixture } from '../testing/print-header-fixture'
import { decodeNativeProject, encodeNativeProject } from './schema'
import { applyPortablePartLayout } from './part-layout'
import { parseMusicXml, serializeMusicXml } from '../musicxml'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

it('preserves independent part heading and landscape staff scale without changing concert music', () => {
  const project = createPrintHeaderFixture('swing'), part = project.score.parts[0]
  project.score.composer = '작곡가와 편곡자 이름을 출력에서 모두 보존합니다 '.repeat(3).trim()
  project.view = { mode: 'score' }
  project.partLayouts = [{ partId: part.id,
    title: '독립 파트 제목과 연주 지시를 줄바꿈하여 온전히 표시합니다 '.repeat(2).trim(),
    layout: { pageSetup: { pageSize: 'a4', orientation: 'landscape', pageMarginMm: 15, staffSizePercent: 75, systemSpacingPercent: 100 } }
  }]
  const before = structuredClone(project)
  expect(decodeNativeProject(encodeNativeProject(project))).toEqual(project)
  const out = process.env.DDIRORI_PART_HEADER_QA_DIR
  if (out) { mkdirSync(out, { recursive: true }); writeFileSync(join(out, 'source.chromatics'), encodeNativeProject(project)) }
  for (const view of ['score', 'part'] as const) {
    const score = view === 'part'
      ? { ...applyPortablePartLayout(project.score, project.partLayouts[0]), title: project.partLayouts[0].title! }
      : project.score
    const xml = serializeMusicXml(score)
    expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(project.score))
    if (out) {
      writeFileSync(join(out, `${view}.musicxml`), xml)
      writeFileSync(join(out, `${view}.mid`), serializeMidi(score))
    }
  }
  expect(project).toEqual(before)
})
