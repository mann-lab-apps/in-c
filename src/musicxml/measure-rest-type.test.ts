import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { decodeNativeProject, encodeNativeProject, createNativeProject } from '../project/schema'
import { validateMeasureRhythm, measureDurationTicks, TICKS_PER_QUARTER } from '../score-core'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { makeMeasureRestXml } from '../testing/measure-rest-fixture'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
const cases = [[4,4,false],[3,4,false],[6,8,false],[3,8,false],[5,4,false],[5,8,false],[4,4,true]] as const
it.each(cases)('imports a typeless full-bar rest in %i/%i pickup=%s with its actual timing and native/MIDI contract', (beats, beatType, pickup) => {
  const xml = makeMeasureRestXml(beats, beatType, false, pickup), explicit = parseMusicXmlWithReport(makeMeasureRestXml(beats, beatType, true, pickup))
  const parsed = parseMusicXmlWithReport(xml), score = parsed.score
  expect(score).toEqual(explicit.score); expect(parsed.report).toEqual(explicit.report)
  for (const staff of score.parts[0].staves) for (const bar of staff.measures) expect(validateMeasureRhythm(bar).isExact).toBe(true)
  const bar = score.parts[0].staves[1].measures[0], rest = bar.voices[0].events[0]
  expect(rest).toMatchObject({ type: 'rest', fullMeasure: true, duration: { value: 'whole', dots: 0 }, fermata: true })
  expect(measureDurationTicks(bar)).toBe(pickup ? TICKS_PER_QUARTER / 2 : beats * 4 / beatType * TICKS_PER_QUARTER)
  expect(serializeMidi(score)).toEqual(serializeMidi(explicit.score))
  expect(createPlaybackTimeline(score)).toEqual(createPlaybackTimeline(explicit.score))
  const project = decodeNativeProject(encodeNativeProject(createNativeProject(score)))
  expect(project.score).toEqual(score)
  expect(serializeMidi(parseMusicXmlWithReport(serializeMusicXml(score)).score)).toEqual(serializeMidi(score))
  const dir = process.env.STUDIO_MEASURE_REST_QA_DIR
  if (dir && beats === 4 && beatType === 4 && !pickup) {
    mkdirSync(dir, { recursive: true })
    for (const [name, contents] of [['source.musicxml', xml], ['explicit.musicxml', makeMeasureRestXml(beats, beatType, true)], ['expected.chromatics', encodeNativeProject(project)]] as const)
      writeFileSync(join(dir, name), contents, { flag: 'wx' })
  }
})
it.each(['ordinary-rest', 'pitched-note'] as const)('does not invent a duration for a typeless %s', kind => {
  const xml = makeMeasureRestXml().replace('<rest measure="yes"/>', kind === 'ordinary-rest' ? '<rest/>' : '<pitch><step>C</step><octave>4</octave></pitch>').replace('<type>whole</type>', '')
  expect(() => parseMusicXmlWithReport(xml)).toThrow(/type/)
})
it('still rejects an explicitly unsupported graphic type on a complete measure rest', () => {
  expect(() => parseMusicXmlWithReport(makeMeasureRestXml(4,4,true).replace('<type>whole</type>', '<type>unknown</type>'))).toThrow(/type/)
})
