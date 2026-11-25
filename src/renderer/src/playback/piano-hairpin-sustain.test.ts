import { expect, it } from 'vitest'
import { parseMusicXml } from '../../../musicxml'
import { createLoopPianoCommands, createPianoCommands } from './piano-transport'
import { createPlaybackTimeline, type PlaybackTimeline } from './timeline'

function fixture(type: 'crescendo' | 'diminuendo' = 'crescendo', offset = '6') {
  return parseMusicXml(`<score-partwise version="4.0"><part-list><score-part id="P"><part-name>Piano</part-name></score-part></part-list>
    <part id="P"><measure number="1">
    <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves>
    <clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>
    <direction><direction-type><wedge type="${type}"/></direction-type><voice>2</voice><staff>2</staff></direction>
    <direction><direction-type><wedge type="stop"/></direction-type><offset>${offset}</offset><voice>2</voice><staff>2</staff></direction>
    <note><pitch><step>G</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice><type>whole</type><staff>1</staff></note>
    <backup><duration>16</duration></backup>
    ${['C', 'D', 'E', 'F'].map(step => `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>`).join('')}
    </measure></part></score-partwise>`)
}
const velocity = (value: number) => value / .24 * 127
const held = (timeline: PlaybackTimeline, from = 0) =>
  createPianoCommands(timeline, from, 120, {}).filter(command => command.pitch === 62)

it.each([['crescendo', .24], ['diminuendo', .08]] as const)(
  'changes the held sample until the exact imported end for %s', (type, target) => {
    const score = fixture(type)
    expect(score.hairpins?.[0].endTime?.tick).toBe(20160)
    const timeline = createPlaybackTimeline(score)
    const [on, off] = held(timeline)
    expect([on.type, on.time, on.offset, off.type, off.time]).toEqual(['on', .5, 0, 'off', 1])
    expect(on.velocityCurve).toEqual([
      { after: 0, velocity: on.velocity },
      { after: .25, velocity: velocity(target) }
    ])
    const commands = createPianoCommands(timeline, 0, 120, {})
    expect(commands.filter(c => c.pitch === 67 || c.time >= 1).every(c => !c.velocityCurve)).toBe(true)
    const dry = createPlaybackTimeline({ ...score, hairpins: undefined })
    expect(commands.filter(c => [64, 65, 67].includes(c.pitch)))
      .toEqual(createPianoCommands(dry, 0, 120, {}).filter(c => [64, 65, 67].includes(c.pitch)))
    expect(createPianoCommands(createPlaybackTimeline(fixture(type, '8')), 0, 120, {})
      .every(c => !c.velocityCurve)).toBe(true)
  }
)

it('resumes at the current gain with the original sample selection and source offset', () => {
  const timeline = createPlaybackTimeline(fixture())
  const [original] = held(timeline)
  const [during, off] = held(timeline, 1.25)
  expect(during.time).toBe(0)
  expect(during.offset).toBe(.125)
  expect(during.velocity).toBe(original.velocity)
  expect(off.time).toBe(.375)
  expect(during.velocityCurve?.[0].velocity).toBeCloseTo(velocity(.22666666666666666))
  expect(during.velocityCurve?.[1]).toEqual({ after: .125, velocity: 127 })
  const [after] = held(timeline, 1.75)
  expect(after.offset).toBe(.375)
  expect(after.velocity).toBe(original.velocity)
  expect(after.velocityCurve).toEqual([{ after: 0, velocity: 127 }])
})

it('uses the tempo clock and clips the ramp at a loop end without accelerating it', () => {
  const timeline = createPlaybackTimeline(fixture())
  timeline.tempoEvents = [{ id: 'slow', measureId: 'measure-1', startBeat: 1.25, bpm: 60, quarterBpm: 60 }]
  const [on, off] = held(timeline)
  expect(on.velocityCurve?.map(point => point.after)).toEqual([0, .125, .375])
  expect(on.velocityCurve?.[1].velocity).toBeCloseTo(velocity(.22666666666666666))
  expect(off.time).toBe(1.375)
  const [loopOn, loopOff] = createLoopPianoCommands(timeline, 1.125, 1.375, 120, {}).filter(c => c.pitch === 62)
  expect(loopOn.velocityCurve?.map(point => point.after)).toEqual([0, .0625, .1875])
  expect(loopOn.velocityCurve?.[2].velocity).toBeCloseTo(velocity(.23333333333333334))
  expect(loopOff.time).toBe(.1875)
  expect(createPianoCommands(timeline, 0, 120, { P: { muted: true, solo: false, volume: 1 } })).toEqual([])
})

it('keeps an already sounding note level until the hairpin starts and holds through pedal', () => {
  const timeline = createPlaybackTimeline(fixture())
  const d4 = timeline.events.find(event => event.sampleHairpinVelocity && event.startBeat === 1)!
  d4.velocityStartBeat = 1.125
  timeline.pedalEvents = [
    { id: 'pedal-down', partId: d4.partId, startBeat: 1, value: 127 },
    { id: 'pedal-up', partId: d4.partId, startBeat: 2.5, value: 0 }
  ]
  const [on, off] = held(timeline)
  expect(on.velocityCurve).toEqual([
    { after: 0, velocity: on.velocity },
    { after: .0625, velocity: on.velocity },
    { after: .25, velocity: 127 }
  ])
  expect(off.time).toBe(1.25)
  const [resumed, release] = held(timeline, 2.25)
  expect(resumed.offset).toBe(.625)
  expect(resumed.velocityCurve).toEqual([{ after: 0, velocity: 127 }])
  expect(release.time).toBe(.125)
})
