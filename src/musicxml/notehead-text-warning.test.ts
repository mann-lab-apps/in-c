import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createNoteheadFixture } from '../testing/notehead-fixture'
import { createNoteheadTextFixture } from '../testing/notehead-text-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'

const cases = [
  { id: 'letters', owner: 'main', textKind: 'letters' },
  { id: 'accidental-grace', owner: 'grace', textKind: 'accidental' },
  { id: 'mixed-chord', owner: 'chord', textKind: 'mixed' },
  { id: 'without-head', owner: 'main', textKind: 'letters', omitHead: true },
  { id: 'formatted', owner: 'main', textKind: 'formatted' },
  { id: 'repeated', owner: 'main', textKind: 'repeated' },
  { id: 'diamond', owner: 'main', textKind: 'letters', head: 'diamond' }
] as const
const textWarnings = (xml: string) => parseMusicXmlWithReport(xml).report.warnings.filter(w => w.message.startsWith('Unrepresented notehead text '))
it.each(cases)('reports the notehead text loss at its source owner: $id', options => {
  const xml = createNoteheadTextFixture({ ...options, partCount: 2, targetPart: 2, targetMeasure: 2 })
  const directory = process.env.STUDIO_NOTEHEAD_TEXT_QA_DIR
  if (directory) { mkdirSync(directory, { recursive: true }); writeFileSync(join(directory, options.id + '.musicxml'), xml, { flag: 'wx' }) }
  const index = options.owner === 'chord' ? 2 : 1
  expect(textWarnings(xml)).toEqual([expect.objectContaining({ code: 'unsupported-notation', partNumber: 2, measureNumber: 2,
    eventIndex: index, path: `part[2].measure[2].note[${index}].notehead-text`, message: expect.stringContaining('not preserved') })])
  const plain = xml.replace(/<notehead-text>[\s\S]*?<\/notehead-text>/g, '')
  const score = parseMusicXml(xml)
  expect(score).toEqual(parseMusicXml(plain))
  expect(createPlaybackTimeline(score)).toEqual(createPlaybackTimeline(parseMusicXml(plain)))
  expect(serializeMidi(score)).toEqual(serializeMidi(parseMusicXml(plain)))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
  const exported = serializeMusicXml(score)
  expect(exported).not.toContain('<notehead-text>')
  expect(serializeMidi(parseMusicXml(exported))).toEqual(serializeMidi(score))
  if (options.id === 'diamond') expect(parseMusicXmlWithReport(xml).report.warnings.filter(w => w.message.startsWith('Explicit notehead appearance '))).toHaveLength(1)
})
it.each(['normal', 'diamond'])('keeps the previous %s shape policy without an invented text warning', head => {
  const xml = createNoteheadFixture({ head, value: 'whole' })
  expect(textWarnings(xml)).toEqual([])
  expect(parseMusicXmlWithReport(xml).report.warnings.filter(w => w.message.startsWith('Explicit notehead appearance '))).toHaveLength(head === 'diamond' ? 1 : 0)
})
