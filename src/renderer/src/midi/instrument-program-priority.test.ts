import { it, expect } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMusicXml } from '../../../musicxml/parse'
import { serializeMusicXml } from '../../../musicxml/serialize'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { createWarningPartOwnershipFixture } from '../../../testing/warning-part-ownership-fixture'
import { serializeMidiWithReport } from './serialize-midi'
import { readTestMidiEvents as readEvents } from '../../../testing/midi-events'

const cases = [
 { id: 'bassoon', name: 'Bassoon', program: 70 },
 { id: 'bass-clarinet', name: 'Bass clarinet', program: 71 },
 { id: 'bass-flute', name: 'Bass flute', program: 73 },
 { id: 'bass-voice', name: 'Bass voice', program: 52 },
 { id: 'korean-bassoon', name: '바순', program: 70 },
 { id: 'clarinet', name: 'Clarinet', program: 71 },
 { id: 'flute', name: 'Flute', program: 73 },
 { id: 'korean-voice', name: '성악', program: 52 },
 { id: 'bass', name: 'Bass', program: 43 },
 { id: 'double-bass', name: 'Double bass', program: 43 },
 { id: 'contrabass', name: 'Contrabass', program: 43 },
 { id: 'korean-contrabass', name: '콘트라베이스', program: 43 },
 { id: 'violin', name: 'Violin', program: 40 },
 { id: 'piano', name: 'Piano', program: 0 },
 { id: 'unknown', name: 'Unknown instrument', program: 0 },
 { id: 'abbreviation', name: 'Line', abbreviation: 'Bassoon', program: 70 }
]

it.each(cases)('MIDI instrument priority preserves the explicit family for $id', entry => {
 const source = createWarningPartOwnershipFixture('control').xml
 const name = entry.name.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
 const xml = source.replace('<part-name>Piano</part-name>', `<part-name>${name}</part-name>${entry.abbreviation ? `<part-abbreviation>${entry.abbreviation}</part-abbreviation>` : ''}`)
 const score = parseMusicXml(xml), original = structuredClone(score)
 const report = serializeMidiWithReport(score), events = readEvents(report.bytes)
 expect(report.warnings).toEqual([])
 expect(events.filter(event => event.status >> 4 === 12)).toEqual([
  { track: 1, tick: 0, status: 0xc0, data: [entry.program] },
  { track: 2, tick: 0, status: 0xc1, data: [73] }
 ])
 const withoutProgram = (rows: ReturnType<typeof readEvents>) => rows.filter(event => event.status >> 4 !== 12)
 expect(withoutProgram(events)).toEqual(withoutProgram(readEvents(serializeMidiWithReport(parseMusicXml(source)).bytes)))
 expect(score).toEqual(original)
 const output = process.env.DDIRORI_INSTRUMENT_PROGRAM_QA_DIR
 if (output) {
  const dir = join(output, entry.id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'source.musicxml'), xml)
  writeFileSync(join(dir, 'expected.chromatics'), encodeNativeProject(createNativeProject(score)))
  writeFileSync(join(dir, 'expected.mid'), report.bytes)
  writeFileSync(join(dir, 'expected.musicxml'), serializeMusicXml(score))
  writeFileSync(join(dir, 'case.json'), JSON.stringify(entry, null, 2))
 }
})
