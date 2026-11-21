import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, expect, it, vi } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { createVoiceTargetAnchorFixture } from '../../../testing/voice-target-anchor-fixture'
import { serializeMidi } from '../midi/serialize-midi'
import { locateEvent } from './editor-state'
import { buildEmptyVoiceMove } from './empty-voice-move'
beforeAll(() => {
  const dir = process.env.STUDIO_VOICE_TARGET_ANCHOR_QA_DIR
  if (!dir) return
  mkdirSync(dir, { recursive: true })
  for (const kind of ['start', 'end'] as const) {
    const score = createVoiceTargetAnchorFixture(kind)
    writeFileSync(join(dir, kind + '.chromatics'), encodeNativeProject(createNativeProject(score)), { flag: 'wx' })
    writeFileSync(join(dir, kind + '.musicxml'), serializeMusicXml(score), { flag: 'wx' })
    writeFileSync(join(dir, kind + '.mid'), serializeMidi(score), { flag: 'wx' })
  }
})
it.each(['start', 'end'] as const)('explains a valid target full-rest %s anchor and preserves native references before allocating IDs', kind => {
  const score = createVoiceTargetAnchorFixture(kind), native = encodeNativeProject(createNativeProject(score))
  expect(decodeNativeProject(native).score).toEqual(score)
  const before = structuredClone(score), midi = serializeMidi(score), xml = serializeMusicXml(score), allocate = vi.fn(() => 'unused-fresh-rest')
  const result = buildEmptyVoiceMove(score, locateEvent(score, 'moving'), 'voice-2', allocate)
  expect(result.command).toBeUndefined(); expect(result.selection).toBeUndefined()
  expect(result.reason).toContain('대상 성부의 쉼표가 구간 기호의 시작·끝')
  expect(allocate).not.toHaveBeenCalled(); expect(score).toEqual(before)
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
  expect(serializeMidi(score)).toEqual(midi); expect(serializeMusicXml(score)).toBe(xml)
  const uiRoot = process.env.STUDIO_VOICE_TARGET_ANCHOR_UI_DIR
  if (uiRoot) {
    const dir = join(uiRoot, kind === 'start' ? 'runtime-i-960' : 'runtime-j-1400')
    const saved = decodeNativeProject(readFileSync(join(dir, 'working.chromatics'), 'utf8'))
    const reopened = decodeNativeProject(readFileSync(join(dir, 'unique.chromatics'), 'utf8'))
    expect(saved.score).toEqual(score); expect(reopened).toEqual(saved)
    expect(Array.from(readFileSync(join(dir, 'observed.mid')))).toEqual(Array.from(midi))
    for (const file of ['structured.musicxml', 'expanded.musicxml']) {
      const parsed = parseMusicXml(readFileSync(join(dir, file), 'utf8'))
      expect(parsed.hairpins).toHaveLength(1); expect(parsed.hairpins![0].type).toBe('crescendo')
      expect(serializeMidi(parsed)).toEqual(midi)
    }
  }
})
