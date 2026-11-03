import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expandScoreRepeatsForMusicXml } from './expand-repeats'
import { parseMusicXml, serializeMusicXml, serializeMusicXmlWithReport } from './index'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createRepeatTempoStateFixture } from '../testing/repeat-tempo-state-fixture'
import { secondaryRepeatFixture } from '../testing/secondary-repeat-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import type { Score } from '../score-core'

function copy(score: Score, expected: number[][], label: string) {
  const before = structuredClone(score), native = encodeNativeProject(createNativeProject(score))
  const ordinary = serializeMusicXml(score), result = expandScoreRepeatsForMusicXml(score)
  const locations = new Map<string, number>()
  for (const part of result.parts) for (const staff of part.staves) staff.measures.forEach((measure, index) => {
    for (const voice of measure.voices) for (const event of voice.events) locations.set(event.id, index)
  })
  expect(result.slurs?.map(span => [locations.get(span.startEventId), locations.get(span.endEventId)])).toEqual(expected)
  const { contents, report } = serializeMusicXmlWithReport(result), reopened = parseMusicXml(contents)
  expect(contents.match(/<slur\b[^>]*type="start"/g)).toHaveLength(expected.length)
  expect(contents.match(/<slur\b[^>]*type="stop"/g)).toHaveLength(expected.length)
  expect(reopened.slurs).toHaveLength(expected.length)
  expect(serializeMidi(result)).toEqual(serializeMidi(score))
  expect(serializeMidi(reopened)).toEqual(serializeMidi(score))
  expect(score).toEqual(before)
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
  expect(serializeMusicXml(score)).toBe(ordinary)
  const qa = process.env.DDIRORI_REPEAT_SLUR_COPY_OUT
  if (qa) {
    const directory = join(qa, label); mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, 'source.chromatics'), native)
    writeFileSync(join(directory, 'source.musicxml'), ordinary)
    writeFileSync(join(directory, 'expanded.musicxml'), contents)
    writeFileSync(join(directory, 'expected.mid'), serializeMidi(score))
    writeFileSync(join(directory, 'oracle.json'), JSON.stringify({ pairs: expected,
      startTick: 0, endTick: label === 'slur-same-measure' ? 480 : 0,
      partId: score.parts[0].id, sourceSlurs: score.slurs, warnings: report.warnings }))
  }
  return { result, report }
}

it('copies each complete same-measure slur and retains explicit manual zero geometry with loss reporting', () => {
  const score = createRepeatTempoStateFixture()
  score.slurs = [{ id: 'same-measure', startEventId: 'tempo-a', endEventId: 'tempo-b',
    number: 1, engraving: { placement: 'above', offsetY: 0, height: 4 } }]
  const { result, report } = copy(score, [[0, 0], [1, 1], [2, 2]], 'slur-same-measure')
  expect(result.slurs?.map(span => span.engraving)).toEqual(Array(3).fill(score.slurs[0].engraving))
  expect(report.warnings.filter(warning => warning.code === 'unsupported-layout')).toHaveLength(3)
  expect(new Set(result.slurs?.map(span => span.id)).size).toBe(3)
})

it('copies a phrase wholly inside each repeated contiguous source interval', () => {
  const { score } = secondaryRepeatFixture('lower', 'repeat')
  score.slurs = [{ id: 'repeated-phrase', startEventId: 'primary-note-0', endEventId: 'primary-note-1' }]
  copy(score, [[0, 1], [2, 3]], 'slur-repeated-phrase')
})

it('keeps an introduction-to-entry slur only on its complete first occurrence', () => {
  const { score, staff } = secondaryRepeatFixture('lower', 'repeat')
  staff.measures[0].repeat = undefined
  staff.measures[1].repeat = { start: true, end: true, times: 2 }
  score.slurs = [{ id: 'introduction', startEventId: 'primary-note-0', endEventId: 'primary-note-1' }]
  copy(score, [[0, 1]], 'slur-introduction')
})

it.each(['jump', 'reversed', 'cross-owner'] as const)('rejects %s slurs without inventing endpoints or changing the source', kind => {
  const { score } = secondaryRepeatFixture('lower', 'repeat')
  score.slurs = [{ id: 'preserve-source',
    startEventId: kind === 'reversed' ? 'primary-note-1' : 'primary-note-0',
    endEventId: kind === 'jump' ? 'primary-note-2' : kind === 'cross-owner' ? 'lower-note-1' : 'primary-note-0' }]
  const before = structuredClone(score)
  expect(() => expandScoreRepeatsForMusicXml(score)).toThrow(/MusicXML/)
  expect(score).toEqual(before)
})
