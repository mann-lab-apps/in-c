import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createWordsFontFixture } from '../testing/words-font-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'

it.each(['staff', 'system', 'tempo', 'rhythm', 'expression'] as const)(
  'reports explicit font family/size loss without changing text or playback: %s', kind => {
    const xml = createWordsFontFixture(kind), plain = xml.replace(/ font-family="Studio QA Serif" font-size="24"/g, '')
    const directory = process.env.STUDIO_WORDS_FONT_QA_DIR
    if (directory) { mkdirSync(directory, { recursive: true }); writeFileSync(join(directory, kind + '.musicxml'), xml, { flag: 'wx' }) }
    const parsed = parseMusicXmlWithReport(xml), control = parseMusicXmlWithReport(plain)
    const warnings = parsed.report.warnings.filter(w => w.message.startsWith('Unrepresented words font-family ') || w.message.startsWith('Unrepresented words font-size '))
    expect(warnings).toHaveLength(2)
    const global = kind === 'system' || kind === 'tempo' || kind === 'rhythm', part = global ? 1 : 2, measure = global ? 1 : 2
    expect(warnings.map(w => w.path)).toEqual(['font-family', 'font-size'].map(attribute => `part[${part}].measure[${measure}].direction[1].direction-type[1].words.@${attribute}`))
    expect(warnings.every(w => w.code === 'unsupported-direction' && w.partNumber === part && w.measureNumber === measure)).toBe(true)
    expect(parsed.score).toEqual(control.score)
    expect(createPlaybackTimeline(parsed.score)).toEqual(createPlaybackTimeline(control.score))
    expect(serializeMidi(parsed.score)).toEqual(serializeMidi(control.score))
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(parsed.score))).score).toEqual(control.score)
    expect(serializeMusicXml(parsed.score)).toBe(serializeMusicXml(control.score))
    expect(serializeMusicXml(parsed.score)).not.toContain('font-family="Studio QA Serif"')
    expect(serializeMidi(parseMusicXmlWithReport(serializeMusicXml(parsed.score)).score)).toEqual(serializeMidi(control.score))
  }
)

it.each(['empty', 'components'] as const)('does not duplicate or invent font-only loss for %s', kind => {
  const parsed = parseMusicXmlWithReport(createWordsFontFixture(kind))
  expect(parsed.report.warnings.filter(w => w.message.startsWith('Unrepresented words font-family ') || w.message.startsWith('Unrepresented words font-size '))).toEqual([])
  if (kind === 'components') expect(parsed.report.warnings.filter(w => w.message.startsWith('Unrepresented words components '))).toHaveLength(1)
})
