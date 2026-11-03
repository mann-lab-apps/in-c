import { it, expect } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createMidiChannelFixture } from '../../../testing/midi-channel-fixture'
import { readTestMidiEvents } from '../../../testing/midi-events'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { serializeMusicXml } from '../../../musicxml/serialize'
import { serializeMidiWithReport } from './serialize-midi'

it.each([
 { count: 1, empty: false, warnings: [] },
 { count: 15, empty: false, warnings: [] },
 { count: 16, empty: false, warnings: ['part[16].midi-channel'] },
 { count: 17, empty: false, warnings: ['part[16].midi-channel', 'part[17].midi-channel'] },
 { count: 16, empty: true, warnings: ['part[16].midi-channel'] }
])('MIDI channel sharing count=$count empty=$empty keeps bytes and reports shared ownership', entry => {
 const { score, xml } = createMidiChannelFixture(entry.count, entry.empty), before = structuredClone(score)
 const report = serializeMidiWithReport(score), events = readTestMidiEvents(report.bytes)
 const programs = events.filter(event => event.status >> 4 === 12)
 expect(programs).toHaveLength(entry.count)
 if (entry.count >= 15) expect(programs.slice(0, 15).map(event => event.status & 15)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15])
 if (entry.count >= 16) {
  expect(programs[0]).toMatchObject({ track: 1, tick: 0, status: 0xc0, data: [0] })
  expect(programs[15]).toMatchObject({ track: 16, tick: 0, status: 0xc0, data: [73] })
 }
 if (entry.count === 17) expect(programs[16]).toMatchObject({ track: 17, tick: 0, status: 0xc1, data: [70] })
 const noteOns = events.filter(event => event.status >> 4 === 9 && event.data[1] > 0)
 expect(noteOns).toHaveLength(entry.count - (entry.empty ? 1 : 0))
 expect(noteOns.every(event => event.tick === 0 && event.data[0] === 60 && event.data[1] === 75)).toBe(true)
 expect(score).toEqual(before)
 const output = process.env.DDIRORI_SHARED_CHANNEL_QA_DIR
 if (output) {
  const dir = join(output, `${entry.count}${entry.empty ? '-empty' : ''}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'source.musicxml'), xml)
  writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(before)))
  writeFileSync(join(dir, 'expected.mid'), report.bytes)
  writeFileSync(join(dir, 'expected.musicxml'), serializeMusicXml(before))
  if (entry.count >= 16) writeFileSync(join(dir, 'expected-part.mid'), serializeMidiWithReport({ ...score, parts: [score.parts[15]] }).bytes)
  writeFileSync(join(dir, 'warnings.json'), JSON.stringify(report.warnings, null, 2))
 }
 expect(report.warnings.map(warning => warning.path)).toEqual(entry.warnings)
 expect(report.warnings.every(warning => warning.code === 'shared-midi-channel')).toBe(true)
})

it('MIDI channel sharing retains the existing TAB skip diagnostic and supported note tracks', () => {
 const { score } = createMidiChannelFixture(16)
 score.parts[0].staves[0].measures[0].clef = { sign: 'tab', line: 5 }
 const report = serializeMidiWithReport(score)
 expect(report.warnings.map(warning => warning.code)).toEqual(['unsupported-midi-clef', 'shared-midi-channel'])
 expect(readTestMidiEvents(report.bytes).filter(event => event.status >> 4 === 9 && event.data[1] > 0)).toHaveLength(15)
})
