import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createConditionalTieFixture, conditionalTieCases } from '../testing/conditional-tie-fixture'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

describe.each(conditionalTieCases)('pass-specific MusicXML tie %s', kind => {
  it('reports discarded pass conditions without pretending to implement conditional playback', () => {
    const { xml, existingModel, reference, condition } = createConditionalTieFixture(kind)
    const { score, report } = parseMusicXmlWithReport(xml), before = xml
    const warnings = report.warnings.filter(w => w.message.startsWith('Pass-specific tie '))
    expect(warnings).toHaveLength(condition ? 2 : 0)
    if (condition) {
      expect(warnings.map(w => w.measureNumber)).toEqual([1, 2])
      expect(warnings.every(w => w.code === 'unsupported-notation' && w.message.includes(`time-only="${condition}"`))).toBe(true)
      expect(warnings.every(w => /^part\[1\]\.measure\[[12]\]\.note\[1\]\.tie\[1\]\.time-only$/.test(w.path))).toBe(true)
    } else expect(report.warnings).toEqual([])
    expect(score).toEqual(parseMusicXml(xml))
    expect(serializeMidi(score)).toEqual(serializeMidi(existingModel))
    const performed = (value: typeof score) => createPlaybackTimeline(value).events.map(e => [e.startBeat, e.durationBeats])
    expect(performed(score)).toEqual([[0, 8], [8, 8]])
    expect(performed(reference)).toEqual(kind === 'first-pass' ? [[0, 8], [8, 4], [12, 4]] : kind === 'second-pass' ? [[0, 4], [4, 4], [8, 8]] : [[0, 8], [8, 8]])
    if (kind === 'first-pass' || kind === 'second-pass') expect(serializeMidi(score)).not.toEqual(serializeMidi(reference))
    else expect(serializeMidi(score)).toEqual(serializeMidi(reference))
    expect(xml).toBe(before)
    const output = serializeMusicXml(score)
    expect(output).not.toContain('time-only=')
    expect(createNativeProject(score).score).toEqual(score)
    const out = process.env.DDIRORI_CONDITIONAL_TIE_QA_DIR
    if (out) {
      const dir = join(out, kind); mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'source.musicxml'), xml)
      writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
      writeFileSync(join(dir, 'expected.mid'), serializeMidi(existingModel))
      writeFileSync(join(dir, 'reference.mid'), serializeMidi(reference))
      writeFileSync(join(dir, 'expected.musicxml'), output)
      writeFileSync(join(dir, 'report.json'), JSON.stringify(report, null, 2))
    }
  })
})
