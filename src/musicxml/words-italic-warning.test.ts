import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createWordsItalicFixture, type WordsItalicKind } from '../testing/words-italic-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
const prefix = 'Unrepresented words font-style '
const kinds: WordsItalicKind[] = ['staff', 'system', 'tempo', 'rhythm', 'normalized', 'bold-italic', 'second-type', 'two-types']
it.each(kinds)('reports explicit italic loss without changing its text/music contract: %s', kind => {
  const xml = createWordsItalicFixture(kind), plain = xml.replace(/ font-style="italic"/g, '')
  const directory = process.env.STUDIO_WORDS_ITALIC_QA_DIR
  if (directory) { mkdirSync(directory, { recursive: true }); writeFileSync(join(directory, kind + '.musicxml'), xml, { flag: 'wx' }) }
  const parsed = parseMusicXmlWithReport(xml), control = parseMusicXmlWithReport(plain)
  const warnings = parsed.report.warnings.filter(w => w.message.startsWith(prefix))
  expect(warnings).toHaveLength(kind === 'two-types' ? 2 : 1)
  const global = kind === 'system' || kind === 'tempo' || kind === 'rhythm', part = global ? 1 : 2, measure = global ? 1 : 2
  const types = kind === 'two-types' ? [1, 2] : [kind === 'second-type' ? 2 : 1]
  expect(warnings.map(w => w.path)).toEqual(types.map(type => `part[${part}].measure[${measure}].direction[1].direction-type[${type}].words.@font-style`))
  expect(warnings.every(w => w.code === 'unsupported-direction' && w.partNumber === part && w.measureNumber === measure)).toBe(true)
  expect(parsed.score).toEqual(control.score)
  expect(createPlaybackTimeline(parsed.score)).toEqual(createPlaybackTimeline(control.score))
  expect(serializeMidi(parsed.score)).toEqual(serializeMidi(control.score))
  const encoded = encodeNativeProject(createNativeProject(parsed.score)), copy = serializeMusicXml(parsed.score)
  expect(decodeNativeProject(encoded).score).toEqual(control.score)
  expect(copy).toBe(serializeMusicXml(control.score)); expect(copy).not.toContain('font-style="italic"')
  expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(serializeMidi(control.score))
  if (kind === 'system') expect(parsed.score.systemTexts?.map(t => t.text)).toContain('dolce')
  if (kind === 'tempo') expect(parsed.score.tempo?.bpm === 90 || parsed.score.tempoEvents?.some(t => t.bpm === 90)).toBe(true)
  if (kind === 'rhythm') expect(parsed.score.rhythmFeel).toBeDefined()
  if (kind === 'bold-italic') expect(parsed.report.warnings.filter(w => w.message.startsWith('Unrepresented staff text font-weight '))).toHaveLength(1)
})
it.each(['expression', 'normal', 'plain', 'empty', 'components'] as const)('does not invent a lost italic override for %s', kind => {
  const xml = createWordsItalicFixture(kind), parsed = parseMusicXmlWithReport(xml)
  expect(parsed.report.warnings.filter(w => w.message.startsWith(prefix))).toEqual([])
  if (kind === 'expression') {
    expect(parsed.score.expressionTexts?.map(t => t.text)).toContain('dolce')
    expect(serializeMusicXml(parsed.score)).toContain('font-style="italic"')
  }
  if (kind === 'components') expect(parsed.report.warnings.filter(w => w.message.startsWith('Unrepresented words components '))).toHaveLength(1)
})
