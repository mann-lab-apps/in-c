import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMusicXml, parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createDirectSoundTempoFixture } from '../testing/direct-sound-tempo-fixture'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { createPianoCommands } from '../renderer/src/playback/piano-transport'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { expandScoreRepeatsForMusicXml } from './expand-repeats'

const direct = '<sound tempo="60"><offset>1</offset></sound>'
const cases = [
  { kind: 'initial', map: [[0,60]], off: 4, hidden: true },
  { kind: 'direct', map: [[0,120],[1,60]], off: 3.5, hidden: false },
  { kind: 'matching', map: [[0,120]], off: 2, hidden: false },
  { kind: 'late-no-initial', map: [[0,120],[1,60]], off: 3.5, hidden: true },
  { kind: 'last90', map: [[0,120],[1,90]], off: 2.5, hidden: false },
  { kind: 'last60', map: [[0,120],[1,60]], off: 3.5, hidden: false },
  { kind: 'visible-last', map: [[0,120]], off: 2, hidden: true },
  { kind: 'direct-last', map: [[0,60]], off: 4, hidden: false },
  { kind: 'relative-order', map: [[0,120],[1,60],[2,90]], off: 17/6, hidden: false },
  { kind: 'divisions7', map: [[0,120],[1,60]], off: 3.5, hidden: false },
  { kind: 'cursor-backward', map: [[0,120],[3,60]], off: 2.5, hidden: false },
  { kind: 'minimum', map: [[0,40]], off: 6, hidden: true },
  { kind: 'maximum', map: [[0,240]], off: 1, hidden: true },
  { kind: 'repeat', map: [[0,120],[1,60],[4,120],[5,60]], off: 3.5, hidden: false }
] as const

it.each(cases)('imports common direct playback tempo without inventing visible marks: $kind', async ({ kind, map, off, hidden }) => {
  let xml = createDirectSoundTempoFixture(kind === 'minimum' || kind === 'maximum' ? 'initial' : kind === 'initial' || kind === 'matching' ? kind : 'direct').xml
  if (kind === 'minimum' || kind === 'maximum') xml = xml.replace('tempo="60"', `tempo="${kind === 'minimum' ? 40 : 240}"`)
  if (kind === 'late-no-initial') xml = xml.replace(/<direction>[\s\S]*?<\/direction>/, '')
  if (kind === 'last90') xml = xml.replace(direct, direct + '<sound tempo="90"><offset>1</offset></sound>')
  if (kind === 'last60') xml = xml.replace(direct, '<sound tempo="90"><offset>1</offset></sound>' + direct)
  if (kind === 'visible-last') xml = xml.replace('<direction>', '<sound tempo="60"/><direction>').replace(direct, '')
  if (kind === 'direct-last') xml = xml.replace(direct, '<sound tempo="60"/>')
  if (kind === 'relative-order') xml = xml.replace(direct, '<sound tempo="90"><offset>2</offset></sound>' + direct)
  if (kind === 'divisions7') xml = xml.replace('<divisions>1</divisions>', '<divisions>7</divisions>').replace('<duration>4</duration>', '<duration>28</duration>').replace('<offset>1</offset>', '<offset>7</offset>')
  if (kind === 'cursor-backward') xml = xml.replace(direct, '').replace('</note>', '</note><sound tempo="60"><offset>-1</offset></sound>')
  if (kind === 'repeat') xml = xml.replace('</attributes>', '</attributes><barline location="left"><repeat direction="forward"/></barline>').replace('</measure>', '<barline location="right"><repeat direction="backward" times="2"/></barline></measure>')
  xml = xml.replace(/<work-title>[^<]+<\/work-title>/, `<work-title>Direct tempo support ${kind}</work-title>`)
  const { score, report } = parseMusicXmlWithReport(xml), timeline = createPlaybackTimeline(score)
  const effective = (value: typeof score) => [...new Map<number, number>([[0, value.tempo?.bpm ?? 120], ...createPlaybackTimeline(value).tempoEvents.map(event => [event.startBeat, event.quarterBpm] as [number, number])]).entries()]
  const out = process.env.DDIRORI_DIRECT_TEMPO_SUPPORT_OUT
  const dir = out ? join(out, kind) : undefined
  if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'source.musicxml'), xml); writeFileSync(join(dir, 'oracle.json'), JSON.stringify({ map, off, hidden }, null, 2)) }
  expect(effective(score)).toEqual(map)
  expect(report.warnings).toEqual([])
  expect(Boolean(score.tempo?.transparent)).toBe(hidden)
  expect(score.tempoEvents?.filter(event => event.id.includes('-direct-tempo-')).every(event => event.transparent === true) ?? true).toBe(true)
  const commands = createPianoCommands(timeline, 0, score.tempo?.bpm ?? 120, {})
  expect(commands.find(event => event.type === 'off')?.time).toBeCloseTo(off, 10)
  if (kind === 'repeat') expect(commands.filter(event => event.type === 'off').map(event => event.time)).toEqual([3.5, 7])
  const before = structuredClone(score), native = encodeNativeProject(createNativeProject(score))
  expect(decodeNativeProject(native).score).toEqual(score)
  const output = serializeMusicXml(score), reopened = parseMusicXml(output)
  expect(effective(reopened)).toEqual(map)
  expect(serializeMidi(reopened)).toEqual(serializeMidi(score))
  expect(score).toEqual(before)
  if (kind === 'repeat') expect(serializeMidi(parseMusicXml(serializeMusicXml(expandScoreRepeatsForMusicXml(score))))).toEqual(serializeMidi(score))
  if (dir) {
    writeFileSync(join(dir, 'source.chromatics'), native); writeFileSync(join(dir, 'source.mid'), serializeMidi(score))
    writeFileSync(join(dir, 'output.musicxml'), output)
    writeFileSync(join(dir, 'tempo-model.json'), JSON.stringify({ tempo: score.tempo, tempoEvents: score.tempoEvents }, null, 2))
  }
})
