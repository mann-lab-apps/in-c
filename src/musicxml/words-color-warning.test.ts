import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createWordsColorFixture } from '../testing/words-color-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'

const colorWarnings = (source: string) => parseMusicXmlWithReport(source).report.warnings
  .filter(warning => warning.message.startsWith('Unrepresented words color '))

it.each(['staff', 'system', 'tempo', 'rhythm', 'expression'] as const)(
  'reports explicit text color loss while preserving content and timing: %s', kind => {
    const source = createWordsColorFixture(kind)
    const plain = source.replace(/ color="#FF0000"/g, '')
    const directory = process.env.STUDIO_WORDS_COLOR_QA_DIR
    if (directory) { mkdirSync(directory, { recursive: true }); writeFileSync(join(directory, kind + '.musicxml'), source, { flag: 'wx' }) }
    const parsed = parseMusicXmlWithReport(source), control = parseMusicXmlWithReport(plain)
    const warnings = colorWarnings(source)
    const global = kind === 'system' || kind === 'tempo' || kind === 'rhythm'
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatchObject({ code: 'unsupported-direction', partNumber: global ? 1 : 2,
      measureNumber: global ? 1 : 2,
      path: `part[${global ? 1 : 2}].measure[${global ? 1 : 2}].direction[1].direction-type[1].words.@color` })
    expect(warnings[0].message).toContain('"#FF0000"')
    expect(parsed.score).toEqual(control.score)
    expect(createPlaybackTimeline(parsed.score)).toEqual(createPlaybackTimeline(control.score))
    expect(serializeMidi(parsed.score)).toEqual(serializeMidi(control.score))
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(parsed.score))).score).toEqual(control.score)
    expect(serializeMusicXml(parsed.score)).toBe(serializeMusicXml(control.score))
    expect(serializeMidi(parseMusicXmlWithReport(serializeMusicXml(parsed.score)).score)).toEqual(serializeMidi(control.score))
  }
)

it.each(['empty', 'components'] as const)('does not invent or duplicate color-only warnings for %s', kind => {
  expect(colorWarnings(createWordsColorFixture(kind))).toEqual([])
  if (kind === 'components') expect(parseMusicXmlWithReport(createWordsColorFixture(kind)).report.warnings
    .filter(warning => warning.message.startsWith('Unrepresented words components '))).toHaveLength(1)
})

it('does not call supported transparent tempo output a color loss', () => {
  const score = parseMusicXmlWithReport(createWordsColorFixture('tempo').replace(/ color="#FF0000"/g, '')).score
  expect(score.tempo).toBeDefined()
  score.tempo = { ...score.tempo!, transparent: true }
  const source = serializeMusicXml(score)
  expect(source).toContain('color="#00000000"')
  expect(parseMusicXmlWithReport(source).score.tempo?.transparent).toBe(true)
  expect(colorWarnings(source)).toEqual([])
})

it.each(['staff', 'tempo'] as const)('still warns about alpha-zero text when its visibility is not retained: %s', kind => {
  const source = createWordsColorFixture(kind, '#00FF0000')
  expect(parseMusicXmlWithReport(source).score.tempo?.transparent).not.toBe(true)
  expect(colorWarnings(source)).toHaveLength(1)
  expect(colorWarnings(source)[0].message).toContain('"#00FF0000"')
})
