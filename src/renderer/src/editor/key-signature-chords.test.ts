import { expect, it } from 'vitest'
import { applyScoreCommand, resolveNotePitch, type Note, type Score } from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { implicitChordFixture } from '../../../testing/implicit-chord-fixture'
import { createPlaybackTimeline } from '../playback/timeline'
import { serializeMidi } from '../midi/serialize-midi'
import { buildKeySignatureCommand } from './key-signature'

function resolved(score:Score) {
 return score.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.map(v=>v.events.filter((e):e is Note=>e.type==='note').map(e=>(e.pitches?.length?e.pitches:[e.pitch]).map(pitch=>resolveNotePitch(m,v,{...e,pitch})))))))
}
function changed(source:Score,fifths:number) {
 const staff=source.parts[0].staves[0],measure=staff.measures[0],before=structuredClone(source),command=buildKeySignatureCommand(source,{type:'measure',measureId:measure.id,address:{partId:source.parts[0].id,staffId:staff.id,measureId:measure.id,voiceId:measure.voices[0].id}},{fifths,mode:'major'})
 expect(command).toBeDefined();const result=applyScoreCommand(source,command!)
 expect(resolved(result.score)).toEqual(resolved(source));expect(createPlaybackTimeline(result.score)).toEqual(createPlaybackTimeline(source));expect(serializeMidi(result.score)).toEqual(serializeMidi(source))
 expect(serializeMidi(parseMusicXml(serializeMusicXml(result.score)))).toEqual(serializeMidi(source))
 expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(result.score)
 expect(applyScoreCommand(result.score,result.undo).score).toEqual(source)
 expect(source).toEqual(before)
 return result.score
}

it.each([0,2,-1])('preserves every implicit chord tone while changing G major to fifths%i and keeps exact undo/native/XML/MIDI',fifths=>{
 changed(implicitChordFixture('key').source,fifths)
})
it('keeps the authoritative chord first tone and pitch field consistent when that tone needs a newly explicit sharp',()=>{
 const source=implicitChordFixture('key').source,measure=source.parts[0].staves[0].measures[0],event=measure.voices[0].events[0]as Note
 event.pitch={step:'F',octave:4};event.pitches=[event.pitch,{step:'A',octave:4}]
 const next=changed(source,0).parts[0].staves[0].measures[0].voices[0].events[0]as Note
 expect(next.pitch).toEqual(next.pitches![0]);expect(next.pitch.alter).toBe(1)
})
it('preserves both octaves and same-voice accidental memory without leaking into a second voice',()=>{
 const source=implicitChordFixture('key').source,measure=source.parts[0].staves[0].measures[0],event=measure.voices[0].events[0]as Note
 event.pitches=[event.pitch,{step:'F',octave:4},{step:'F',octave:5}]
 const other=structuredClone(measure.voices[0]);other.id='voice-2';other.events.forEach(e=>{e.id='other-'+e.id;if(e.type==='note'){e.pitch={step:'F',octave:4,alter:0};delete e.pitches}});measure.voices.push(other)
 changed(source,0)
})
it('preserves an inherited grace accidental and spells out a natural required by the new key', () => {
  const source = implicitChordFixture('preceding').source
  const event = source.parts[0].staves[0].measures[0].voices[0].events[1] as Note
  event.graceNotes = [
    { pitch: { step: 'E', octave: 4 } },
    { pitch: { step: 'F', octave: 4 } },
    { pitch: { step: 'B', octave: 4, alter: -1 }, slash: true }
  ]

  const next = changed(source, 1).parts[0].staves[0].measures[0].voices[0].events[1] as Note
  expect(next.graceNotes).toEqual([
    event.graceNotes[0],
    { pitch: { step: 'F', octave: 4, alter: 0 } },
    event.graceNotes[2]
  ])
})

it('preserves a grace note inherited from the old key when changing the key signature', () => {
  const source = implicitChordFixture('key').source
  const event = source.parts[0].staves[0].measures[0].voices[0].events[0] as Note
  event.graceNotes = [
    { pitch: { step: 'F', octave: 4 }, slash: true },
    { pitch: { step: 'B', octave: 4, alter: -1 }, slash: false }
  ]

  const next = changed(source, 0)
  const notes = (next.parts[0].staves[0].measures[0].voices[0].events[0] as Note).graceNotes
  expect(notes).toEqual([
    { pitch: { step: 'F', octave: 4, alter: 1 }, slash: true },
    event.graceNotes[1]
  ])

  const copy = parseMusicXml(serializeMusicXml(next))
  const imported = (copy.parts[0].staves[0].measures[0].voices[0].events[0] as Note).graceNotes!
  expect(imported.map(grace => grace.pitch)).toEqual(notes!.map(grace => grace.pitch))
  expect(imported.map(grace => Boolean(grace.slash))).toEqual([true, false])
})
