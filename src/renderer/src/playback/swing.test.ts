import { expect, it } from 'vitest'
import { applyScoreCommand, createNote, TICKS_PER_QUARTER as T } from '../../../score-core'
import { createSwingPlaybackFixture as swingFixture } from '../../../testing/swing-playback-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from '../../../musicxml'
import { swingPlaybackUnavailableReason } from './swing'
import { expandScoreRepeatsForMusicXml } from '../../../musicxml/expand-repeats'
import { serializeMidi } from '../midi/serialize-midi'
import { createMetronomePlan } from './metronome'
import { createPracticeLoopPlan } from './practice-loop'
import { createPlaybackTimeline } from './timeline'


it.each(['eighth', '16th'] as const)('applies explicit %s ratios to performed starts/ends, not source ticks', unit => {
  const step = unit === 'eighth' ? 0.5 : 0.25
  for (const [ratio, fraction] of [['2:1', 2 / 3], ['3:2', 3 / 5]] as const) {
    const score = swingFixture(unit, ratio), before = structuredClone(score), timeline = createPlaybackTimeline(score)
    expect(timeline.events[1].startBeat).toBeCloseTo(2 * step * fraction)
    expect(timeline.events[0].durationBeats).toBeCloseTo(2 * step * fraction)
    expect(timeline.events[1].durationBeats).toBeCloseTo(2 * step * (1 - fraction))
    expect(timeline.totalBeats).toBe(4)
    expect(score).toEqual(before)
    const straight = { ...score, swingPlayback: undefined }
    expect(serializeMidi(score)).not.toEqual(serializeMidi(straight))
  }
})

it('preserves old notation-only files and restores the exact setting with one undo/native reopen', () => {
  const score = { ...swingFixture(), swingPlayback: undefined, rhythmFeel: { unit: 'eighth' as const } }
  const old = encodeNativeProject(createNativeProject(score)), timeline = createPlaybackTimeline(score)
  expect(timeline.events[1].startBeat).toBe(0.5)
  expect(decodeNativeProject(old).score).not.toHaveProperty('swingPlayback')
  const result = applyScoreCommand(score, { type: 'score-swing-playback.update', swingPlayback: { unit: 'eighth', ratio: '3:2' } } as never)
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score.swingPlayback).toEqual({ unit: 'eighth', ratio: '3:2' })
  expect(encodeNativeProject(createNativeProject(applyScoreCommand(result.score, result.undo).score))).toBe(old)
})

it('round-trips actual global playback through formal MusicXML without changing printed rhythm or notes', () => {
  const score = swingFixture('16th', '3:2'), reopened = parseMusicXml(serializeMusicXml(score))
  expect(reopened.swingPlayback).toEqual({ unit: '16th', ratio: '3:2' })
  expect(reopened.rhythmFeel).toBeUndefined()
  expect(serializeMidi(reopened)).toEqual(serializeMidi(score))
})

it('shares the swung clock with ties, fermata, tempo, pedal, practice loop and metronome', () => {
  const score = swingFixture('eighth', '3:2'), notes = score.parts[0].staves[0].measures[0].voices[0].events
  if (notes[0].type === 'note' && notes[1].type === 'note') { notes[0].ties = { start: true }; notes[1].ties = { stop: true } }
  notes[1].fermata = true
  score.tempoEvents = [{ id: 'slow', measureId: 'swing-bar', tick: T / 2, bpm: 60 }]
  score.pedalEvents = [{ id: 'pedal', partId: score.parts[0].id, staffId: score.parts[0].staves[0].id, measureId: 'swing-bar', tick: T / 2, value: 127 }]
  const timeline = createPlaybackTimeline(score)
  expect(timeline.events[0].durationBeats).toBeCloseTo(1.2)
  expect(timeline.events[1].startBeat).toBeCloseTo(1.2)
  expect(timeline.tempoEvents[0].startBeat).toBeCloseTo(0.6)
  expect(timeline.pedalEvents?.[0].startBeat).toBeCloseTo(0.6)
  expect(createMetronomePlan(score, timeline, 120).clicks[1].beat).toBeCloseTo(1.2)
  const address = { partId: score.parts[0].id, staffId: score.parts[0].staves[0].id, measureId: 'swing-bar', voiceId: 'swing-voice' }
  expect(createPracticeLoopPlan(score, { type: 'event', eventId: 'swing-2', address }).range).toMatchObject({ startBeat: 1.2, endBeat: 1.8 })
})

it('repeats the source rhythm with the same ratio on every traversal', () => {
  const score = swingFixture(), bar = score.parts[0].staves[0].measures[0]
  bar.repeat = { start: true, end: true, times: 2 }
  const timeline = createPlaybackTimeline(score)
  expect(timeline.events[1].startBeat).toBeCloseTo(2 / 3)
  expect(timeline.events[9].startBeat).toBeCloseTo(4 + 2 / 3)
  expect(timeline.totalBeats).toBe(8)
  expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))) .toEqual(serializeMidi(score))
  expect(serializeMidi(parseMusicXml(serializeMusicXml(expandScoreRepeatsForMusicXml(score))))).toEqual(serializeMidi(score))
})

it('aligns an offbeat pickup to its nominal bar without stretching the bar length', () => {
  const score = swingFixture('eighth', '3:2'), bar = score.parts[0].staves[0].measures[0]
  bar.timing = { type: 'pickup', durationTicks: T / 2 }; bar.voices[0].events = bar.voices[0].events.slice(0, 1)
  const timeline = createPlaybackTimeline(score)
  expect(timeline.events[0].startBeat).toBeCloseTo(0.1)
  expect(timeline.events[0].durationBeats).toBeCloseTo(0.4)
  expect(timeline.totalBeats).toBe(0.5)
  expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score))
})

it('keeps shorter subdivisions straight for their pair without suppressing the following pair', () => {
  const score = swingFixture(), bar = score.parts[0].staves[0].measures[0], events = bar.voices[0].events
  events[0].duration = { value: '16th', dots: 0 }
  events.splice(1, 0, createNote({ id: 'short', position: { tick: T / 4 }, pitch: { step: 'C', octave: 4 }, duration: { value: '16th', dots: 0 } }))
  const timeline = createPlaybackTimeline(score)
  expect(timeline.events.find(event => event.eventId === 'swing-1')!.startBeat).toBe(0.5)
  expect(timeline.events.find(event => event.eventId === 'swing-3')!.startBeat).toBeCloseTo(1 + 2 / 3)
})

it('preserves explicit tuplet timing even when a tuplet event is longer than the swing unit', () => {
  const score = swingFixture('16th'), bar = score.parts[0].staves[0].measures[0]
  bar.voices[0].events = Array.from({ length: 3 }, (_, i) => createNote({ id: `tuplet-${i}`, position: { tick: i * T / 3 }, pitch: { step: 'C', octave: 4 }, duration: { value: 'eighth', dots: 0, tuplet: { actualNotes: 3, normalNotes: 2 } } }))
  expect(createPlaybackTimeline(score).events.map(event => event.startBeat)).toEqual([0, 1 / 3, 2 / 3])
})

it('does not apply the global clock to unequal staff meters and does not discard the saved setting', () => {
  const score = swingFixture(), other = structuredClone(score.parts[0]); other.id = 'other'
  other.staves[0].id = 'other-staff'; other.staves[0].measures[0].id = 'other-bar'; other.staves[0].measures[0].voices[0].id = 'other-voice'
  for (const event of other.staves[0].measures[0].voices[0].events) event.id = 'other-' + event.id
  other.staves[0].measures[0].timeSignature = { beats: 8, beatType: 8 }; score.parts.push(other)
  expect(swingPlaybackUnavailableReason(score)).toContain('보표별')
  expect(createPlaybackTimeline(score).events[2].startBeat).toBe(0.5)
  expect(score.swingPlayback).toEqual({ unit: 'eighth', ratio: '2:1' })
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score.swingPlayback).toEqual(score.swingPlayback)
  const imported = parseMusicXmlWithReport(serializeMusicXml(score))
  expect(imported.score.swingPlayback).toEqual(score.swingPlayback)
  expect(imported.report.warnings.some(warning => warning.message.startsWith('Swing playback setting retained but staff meters'))).toBe(true)
})

it.each(['late', 'staff', 'ratio', 'other-part'] as const)('warns instead of coercing unsupported %s MusicXML swing to global playback', kind => {
  const score = swingFixture(), original = serializeMusicXml(score)
  let source = original
  if (kind === 'ratio') source = source.replace('<second>1</second>', '<second>3</second>')
  if (kind === 'late') source = source.replace(/\s*<sound>[\s\S]*?<\/sound>/, '') .replace('</note>', '</note><sound><swing><first>2</first><second>1</second><swing-type>eighth</swing-type></swing></sound>')
  if (kind === 'staff') source = source.replace('<sound>', '<direction><direction-type><words>Swing</words></direction-type><staff>1</staff><sound>').replace('</sound>', '</sound></direction>')
  if (kind === 'other-part') {
    const other = structuredClone(score.parts[0]); other.id = 'other'; score.parts.push(other)
    source = serializeMusicXml(score).replace(/\s*<sound>[\s\S]*?<\/sound>/, '')
  }
  const imported = parseMusicXmlWithReport(source)
  expect(imported.score.swingPlayback).toBeUndefined()
  expect(imported.report.warnings.some(warning => warning.message.startsWith('Unrepresented swing playback'))).toBe(true)
  if (kind === 'staff') expect(imported.score.rhythmFeel?.text).toBe('Swing')
})

it.each(['2:1', '3:2'] as const)('keeps literal Swing text rather than drawing a misleading triplet glyph for formal %s', ratio => {
  const score = swingFixture('eighth', ratio); score.rhythmFeel = { unit: 'eighth', text: 'Swing' }
  expect(parseMusicXml(serializeMusicXml(score)).rhythmFeel).toEqual(score.rhythmFeel)
})

it('preserves matching global swing on every exported part, with no false loss warning', () => {
  const score = swingFixture('eighth', '3:2'), other = structuredClone(score.parts[0])
  other.id = 'other'; other.staves[0].id = 'other-staff'; other.staves[0].measures[0].id = 'other-bar'
  other.staves[0].measures[0].voices[0].id = 'other-voice'
  for (const event of other.staves[0].measures[0].voices[0].events) event.id = 'other-' + event.id
  score.parts.push(other)
  const imported = parseMusicXmlWithReport(serializeMusicXml(score))
  expect(imported.score.swingPlayback).toEqual(score.swingPlayback)
  expect(imported.report.warnings).toEqual([])
  expect(serializeMidi(imported.score)).toEqual(serializeMidi(score))
  const part = { ...score, parts: [other] }
  expect(parseMusicXml(serializeMusicXml(part)).swingPlayback).toEqual(score.swingPlayback)
})

it('rejects unsupported native ratios instead of silently stripping or clamping them', () => {
  const project = createNativeProject(swingFixture())
  const malformed = JSON.parse(encodeNativeProject(project)); malformed.score.swingPlayback.ratio = '5:1'
  expect(() => decodeNativeProject(JSON.stringify(malformed))).toThrow()
  expect(() => applyScoreCommand(project.score, { type: 'score-swing-playback.update', swingPlayback: { unit: 'eighth', ratio: '5:1' } } as never)).toThrow(/지원하지 않는/)
})
