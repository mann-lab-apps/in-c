import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMusicXml, serializeMusicXml } from './index'
import { TICKS_PER_QUARTER } from '../score-core'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { createPianoCommands } from '../renderer/src/playback/piano-transport'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createNativeProject, encodeNativeProject } from '../project/schema'

const sound = (value: number) => `<sound damper-pedal="${(value * 100 / 127).toFixed(6)}"/>`
const direction = (value: number) => `<direction><direction-type><pedal type="${value >= 64 ? 'start' : 'stop'}"/></direction-type>${sound(value)}</direction>`

it.each([true, false].flatMap(soundFirst => [true, false].map(retakeLast => ({ soundFirst, retakeLast }))))(
  'imports interleaved direct/direction CC64 in source order %j', ({ soundFirst, retakeLast }) => {
  const values = retakeLast ? [32, 127] : [127, 32]
  const mixed = soundFirst ? sound(values[0]) + direction(values[1]) : direction(values[0]) + sound(values[1])
  const xml = `<?xml version="1.0"?>
<score-partwise version="4.0"><work><work-title>Interleaved damper commands</work-title></work>
<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>8</divisions><key><fifths>0</fifths></key>
<time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
<direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>120</per-minute></metronome></direction-type><sound tempo="120" damper-pedal="100"/></direction>
<note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><type>quarter</type></note>
${mixed}<note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>eighth</type></note>
<note><rest/><duration>12</duration><type>quarter</type><dot/></note>${sound(0)}
<note><rest/><duration>8</duration><type>quarter</type></note></measure></part></score-partwise>`
  const score = parseMusicXml(xml), expected = structuredClone(score), part = score.parts[0], staff = part.staves[0]
  const literal = [[0, 127], [TICKS_PER_QUARTER, values[0]], [TICKS_PER_QUARTER, values[1]], [3 * TICKS_PER_QUARTER, 0]]
  expected.pedalEvents = literal.map(([tick, value], index) => ({ id: `pedal-${index + 1}`, partId: part.id, staffId: staff.id, measureId: staff.measures[0].id, tick, value }))
  const fields = (value: typeof score) => value.pedalEvents?.map(event => [event.tick, event.value])
  const out = process.env.DDIRORI_PEDAL_IMPORT_ORDER_OUT
  if (out) {
    const dir = join(out, `${soundFirst ? 'sound' : 'direction'}-first-${retakeLast ? 'retake' : 'lift'}-last`); mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.musicxml'), xml)
    writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(expected)))
    writeFileSync(join(dir, 'expected.mid'), serializeMidi(expected))
    writeFileSync(join(dir, 'oracle.json'), JSON.stringify({ literal, firstDReleaseSeconds: retakeLast ? 1.5 : .75 }, null, 2))
  }
  expect(fields(score)).toEqual(literal)
  const commands = createPianoCommands(createPlaybackTimeline(score), 0, 120, {})
  expect(commands.find(event => event.type === 'off' && event.pitch === 62)?.time).toBe(retakeLast ? 1.5 : .75)
  expect(serializeMidi(score)).toEqual(serializeMidi(expected))
  const reopened = parseMusicXml(serializeMusicXml(score))
  expect(fields(reopened)).toEqual(literal)
  expect(serializeMidi(reopened)).toEqual(serializeMidi(expected))
  expect(createPlaybackTimeline(score).events.find(event => event.durationBeats === .5)).toBeDefined()
})
