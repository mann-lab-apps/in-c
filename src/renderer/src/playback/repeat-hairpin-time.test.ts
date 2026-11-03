import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRepeatHairpinTimeFixture } from '../../../testing/repeat-hairpin-time-fixture'
import { createPlaybackTimeline, findPlaybackStartBeat, beatDeltaToSeconds } from './timeline'
import { createPianoCommands } from './piano-transport'
import { serializeMidi } from '../midi/serialize-midi'
import { serializeMusicXml, parseMusicXml } from '../../../musicxml'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../../../project/schema'

it.each([false, true])('repeats explicit tempo and fermata without spilling an incomplete ramp (exit=%s)', exit => {
  const score = createRepeatHairpinTimeFixture(exit), before = structuredClone(score), timeline = createPlaybackTimeline(score)
  const beats = [0,1.5,2.5,4,5,6.5,7.5], seconds = [0,.75,1.75,2.5,3.5,4.25,5.25]
  expect(timeline.events.map(e => [e.eventId,e.startBeat,e.durationBeats])).toEqual(beats.map((beat,index) => [index === 6 ? 'timed-c' : index % 2 ? 'timed-b' : 'timed-a',beat,index === 6 ? 2 : index % 2 ? 1 : 1.5]))
  expect(timeline.totalBeats).toBe(9.5)
  expect(timeline.tempoEvents.map(e => [e.startBeat,e.quarterBpm])).toEqual([[0,120],[1.5,60],[2.5,120],[4,60],[5,120],[6.5,60]])
  const velocities = exit ? [.16,.16,.16,.16,.16,.16,.16+.08/3] : [.16,.20,.16,.20,.16,.20,.16]
  timeline.events.forEach((e,i) => { expect(e.velocityStart).toBeCloseTo(velocities[i]); expect(beatDeltaToSeconds(timeline,0,e.startBeat,120)).toBeCloseTo(seconds[i]) })
  expect(findPlaybackStartBeat(timeline,'timed-b')).toBe(1.5)
  const commands = createPianoCommands(timeline,0,120,{}).filter(c => c.type === 'on')
  commands.forEach((c,i) => { expect(c.time).toBeCloseTo(seconds[i]); expect(c.velocity).toBeCloseTo(velocities[i]/.24*127) })
  for (const fromBeat of [1.5,4,6.5,7.5]) {
    const first = createPianoCommands(timeline,fromBeat,120,{}).filter(c => c.type === 'on')[0]
    expect(first.time).toBe(0); expect(first.offset).toBe(0); expect(first.velocity).toBeCloseTo(velocities[beats.indexOf(fromBeat)]/.24*127)
  }
  const xml = serializeMusicXml(score), midi = serializeMidi(score), native = encodeNativeProject(createNativeProject(score))
  expect(decodeNativeProject(native).score).toEqual(before)
  expect(serializeMidi(parseMusicXml(xml))).toEqual(midi)
  expect(score).toEqual(before)
  const out = process.env.DDIRORI_TIMED_HAIRPIN_QA_DIR
  if (out) { const dir = join(out,exit ? 'exit' : 'internal'); mkdirSync(dir,{recursive:true}); writeFileSync(join(dir,'source.chromatics'),native); writeFileSync(join(dir,'source.musicxml'),xml); writeFileSync(join(dir,'expected.mid'),midi); writeFileSync(join(dir,'oracle.json'),JSON.stringify({ beats,seconds,velocities,tempo:[[0,120],[1.5,60],[2.5,120],[4,60],[5,120],[6.5,60]],totalBeats:9.5 },null,2)) }
})
