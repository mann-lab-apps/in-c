import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { wordsPositionCases, createWordsPositionFixture } from '../testing/words-position-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

it.each(wordsPositionCases)('identifies actual lost staff/system text timing without changing music or text in %s', kind => {
  const { xml, plain, path, scope, beat, offset } = createWordsPositionFixture(kind)
  const parsed = parseMusicXmlWithReport(xml), control = parseMusicXmlWithReport(plain)
  const notices = parsed.report.warnings.filter(w => /^Unrepresented (staff|system) text position /.test(w.message))
  expect(notices).toHaveLength(beat === 0 ? 0 : 1)
  if (beat !== 0) {
    expect(notices[0]).toEqual(expect.objectContaining({ code: 'unsupported-direction', partNumber: 1, measureNumber: 7, path,
      message: expect.stringContaining(`Unrepresented ${scope} text position (position=${beat} quarter-beats`) }))
    if (offset !== undefined) expect(notices[0].message).toContain(`offset="${offset}"`)
  }
  expect(parsed.report.warnings.filter(w => !notices.includes(w))).toEqual(control.report.warnings)
  expect(parsed.score).toEqual(control.score)
  const text = scope === 'system' ? parsed.score.systemTexts : scope === 'expression' ? parsed.score.expressionTexts : parsed.score.staffTexts
  expect(text?.map(t => t.text)).toEqual(['dolce'])
  expect(serializeMidi(parsed.score)).toEqual(serializeMidi(control.score))
  const native = encodeNativeProject(createNativeProject(parsed.score))
  expect(native).toBe(encodeNativeProject(createNativeProject(control.score)))
  expect(decodeNativeProject(native).score).toEqual(parsed.score)
  expect(serializeMusicXml(parsed.score)).toBe(serializeMusicXml(control.score))
})

it.each(['manual-x', 'components', 'rhythm', 'empty', 'metronome'] as const)('does not misclassify other source text contracts as a measure-anchor loss: %s', kind => {
  let xml = createWordsPositionFixture('staff-mid').xml
  if (kind === 'manual-x') xml = xml.replace('<words>', '<words default-x="25">')
  if (kind === 'components') xml = xml.replace('</words>', '</words><words>molto</words>')
  if (kind === 'rhythm') xml = xml.replace('>dolce</words>', '>Swing</words>')
  if (kind === 'empty') xml = xml.replace('>dolce</words>', '> </words>')
  if (kind === 'metronome') xml = xml.replace('</direction-type>', '</direction-type><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>90</per-minute></metronome></direction-type>')
  const result = parseMusicXmlWithReport(xml)
  expect(result.report.warnings.filter(w => /^Unrepresented (staff|system) text position /.test(w.message))).toEqual([])
  if (kind === 'components') expect(result.report.warnings.some(w => w.message.startsWith('Unrepresented words components '))).toBe(true)
  if (kind === 'metronome') expect(result.score.tempoEvents?.some(t => t.bpm === 90)).toBe(true)
})

it.skipIf(spawnSync('xmllint', ['--version']).status !== 0)('validates all words-position source/copy fixtures against complete pinned MusicXML XSD', () => {
  const schema = resolve('src/musicxml/schema/musicxml-4.0'), manifest = JSON.parse(readFileSync(join(schema, 'SOURCE.json'), 'utf8'))
  for (const file of manifest.files) expect(createHash('sha256').update(readFileSync(join(schema, file.file))).digest('hex')).toBe(file.sha256)
  const dir = mkdtempSync(join(tmpdir(), 'studio-words-position-xsd-'))
  try {
    for (const kind of wordsPositionCases) for (const [mode, text] of [['source', createWordsPositionFixture(kind).xml], ['copy', serializeMusicXml(parseMusicXmlWithReport(createWordsPositionFixture(kind).xml).score)]]) {
      const file = join(dir, `${kind}-${mode}.musicxml`);writeFileSync(file, text)
      const checked = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], { encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') }, timeout: 10000 })
      expect(checked.status, checked.stderr).toBe(0)
    }
  } finally { rmSync(dir, { recursive: true }) }
})
