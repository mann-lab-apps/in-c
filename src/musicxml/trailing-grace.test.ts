import { expect, it } from 'vitest'
import { parseMusicXmlWithReport, serializeMusicXmlWithReport } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { createDuration, createNote, createTimePosition, TICKS_PER_QUARTER } from '../score-core'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const attributes = '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>'
const grace = '<note><grace/><pitch><step>F</step><octave>4</octave></pitch><type>eighth</type></note>'
const chordMember = '<note><grace/><chord/><pitch><step>A</step><octave>4</octave></pitch><type>eighth</type></note>'
const principal = '<note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>'
const xml = (bars: string) => '<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Violin</part-name></score-part></part-list>'
  + '<part id="P1">' + bars + '</part></score-partwise>'
const trailing = xml('<measure number="1">' + attributes + principal + grace + chordMember + '</measure>')

it('keeps a terminal grace chord after the last pitched event in Native and MusicXML', () => {
  const { score, report } = parseMusicXmlWithReport(trailing)
  const event = score.parts[0].staves[0].measures[0].voices[0].events[0]
  expect(event.type === 'note' && event.graceNotes).toEqual([
    { after: true, pitch: { step: 'F', octave: 4, alter: 0 }, slash: undefined },
    { after: true, chord: true, pitch: { step: 'A', octave: 4, alter: 0 }, slash: undefined }
  ])
  expect(report.warnings).toEqual([])
  const reopened = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
  const copy = serializeMusicXmlWithReport(reopened)
  expect(copy.report.warnings).toEqual([expect.objectContaining({
    code: 'trailing-grace-placement', message: expect.stringContaining('Terminal')
  })])
  expect(copy.contents).toMatch(/<type>whole<\/type>[\s\S]*?<grace\/>[\s\S]*?<accidental>natural<\/accidental>/)
  expect(parseMusicXmlWithReport(copy.contents).score).toEqual(reopened)
  expect(serializeMidi(score)).toEqual(serializeMidi(parseMusicXmlWithReport(trailing.replace(grace + chordMember, '')).score))
})

it('retains the leading interpretation when a following pitched event exists, and rejects an ownerless tail', () => {
  const eighths = principal.replace('<duration>4</duration><type>whole</type>', '<duration>2</duration><type>half</type>')
  const { score } = parseMusicXmlWithReport(xml('<measure number="1">' + attributes + eighths + grace + eighths + '</measure>'))
  const events = score.parts[0].staves[0].measures[0].voices[0].events
  expect(events[0].type === 'note' && events[0].graceNotes).toBeUndefined()
  expect(events[1].type === 'note' && events[1].graceNotes?.[0]).toMatchObject({ pitch: { step: 'F', alter: 0 } })
  expect(events[1].type === 'note' && events[1].graceNotes?.[0].after).toBeUndefined()
  const rest = '<note><rest/><duration>4</duration><type>whole</type></note>'
  expect(() => parseMusicXmlWithReport(trailing.replace(principal, rest))).toThrow(/grace note/)
})

it('reports an ambiguous XML re-import when a following note is added after a trailing attachment', () => {
  const { score } = parseMusicXmlWithReport(trailing)
  const events = score.parts[0].staves[0].measures[0].voices[0].events
  events[0].duration = createDuration('half')
  events.push(createNote({
    id: 'following',
    pitch: { step: 'G', octave: 4 },
    duration: createDuration('half'),
    position: createTimePosition(2 * TICKS_PER_QUARTER)
  }))
  expect(serializeMusicXmlWithReport(score).report.warnings).toEqual([
    expect.objectContaining({ code: 'ambiguous-trailing-grace', measureNumber: 1 })
  ])
})
