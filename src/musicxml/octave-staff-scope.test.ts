import {expect,it} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {applyScoreCommand,createDuration,createMeasure,createNote,createPart,createScore,createStaff,createVoice,TICKS_PER_QUARTER,type Score} from '../score-core'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../project/schema'
import {parseMusicXml,serializeMusicXml} from './index'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {createPlaybackTimeline} from '../renderer/src/playback/timeline'

function source(){
 const q=TICKS_PER_QUARTER
 const quarters=(prefix:string,octave:number,steps:readonly ('C'|'D'|'E'|'F')[]= ['C','D','E','F'])=>steps.map((step,i)=>createNote({id:`${prefix}-${i}`,position:{tick:i*q},pitch:{step,octave,alter:0},duration:createDuration('quarter')}))
 return createScore({id:'octave-scope-score',title:'옥타브 보표 시간 범위',parts:[
  createPart({id:'piano',name:'Piano',staves:[createStaff({id:'upper',measures:[createMeasure({id:'upper-bar',voices:[
   createVoice({id:'voice-1',events:quarters('upper',4)}),
   createVoice({id:'voice-2',events:[createNote({id:'held-before',pitch:{step:'G',octave:3,alter:0},duration:createDuration('half')}),createNote({id:'other-inside',position:{tick:2*q},pitch:{step:'A',octave:3,alter:0}}),createNote({id:'other-after',position:{tick:3*q},pitch:{step:'B',octave:3,alter:0}})]})
  ]})]}),createStaff({id:'lower',measures:[createMeasure({id:'lower-bar',voices:[createVoice({events:quarters('lower',3,['C','C','C','C'])})]})]})]}),
  createPart({id:'peer',name:'Peer',staves:[createStaff({id:'peer-staff',measures:[createMeasure({id:'peer-bar',voices:[createVoice({events:quarters('peer',5,['C','C','C','C'])})]})]})]})
 ]})
}
function vector(score:Score,partIndex:number,staffIndex:number,voiceId:string){
 const part=score.parts[partIndex],staff=part.staves[staffIndex]
 return createPlaybackTimeline(score).events.filter(e=>e.partId===part.id&&e.staffId===staff.id&&e.voiceId===voiceId).sort((a,b)=>a.startBeat-b.startBeat).map(e=>[e.startBeat,e.durationBeats,Math.round(69+12*Math.log2(e.frequency!/440))])
}
it.each([['8va',12],['8vb',-12],['15ma',24],['15mb',-24]] as const)('%s keeps all-voice onset scope, other staves and exact undo/native/XML/MIDI', (type,semitones)=>{
 const s=source(),original=encodeNativeProject(createNativeProject(s)),changed=applyScoreCommand(s,{type:'score-octave-shifts.update',octaveShifts:[{id:'staff-time-shift',type,startEventId:'upper-1',endEventId:'upper-2'}]})
 const expected=source();for(const [voiceIndex,eventIndex] of [[0,1],[0,2],[1,1]]){const note=expected.parts[0].staves[0].measures[0].voices[voiceIndex].events[eventIndex];if(note.type!=='note')throw Error('Typed expected note');note.pitch.octave+=semitones/12}
 const xml=serializeMusicXml(changed.score),native=encodeNativeProject(createNativeProject(changed.score))
 for(const candidate of [changed.score,decodeNativeProject(native).score,parseMusicXml(xml)]){
  expect(vector(candidate,0,0,'voice-1')).toEqual([[0,1,60],[1,1,62+semitones],[2,1,64+semitones],[3,1,65]])
  expect(vector(candidate,0,0,'voice-2')).toEqual([[0,2,55],[2,1,57+semitones],[3,1,59]])
  expect(vector(candidate,0,1,'voice-1')).toEqual([[0,1,48],[1,1,48],[2,1,48],[3,1,48]])
  expect(vector(candidate,1,0,'voice-1')).toEqual([[0,1,72],[1,1,72],[2,1,72],[3,1,72]])
  expect(serializeMidi(candidate)).toEqual(serializeMidi(expected))
 }
 expect(changed.score.parts).toEqual(s.parts)
 expect(encodeNativeProject(createNativeProject(applyScoreCommand(changed.score,changed.undo).score))).toBe(original)
 expect(encodeNativeProject(createNativeProject(s))).toBe(original)
 const dir=process.env.STUDIO_OCTAVE_SCOPE_QA_DIR
 if(dir){mkdirSync(dir,{recursive:true});writeFileSync(join(dir,`${type}.musicxml`),xml,{flag:'wx'});writeFileSync(join(dir,`${type}.chromatics`),native,{flag:'wx'});writeFileSync(join(dir,`${type}.mid`),serializeMidi(changed.score),{flag:'wx'})}
})

it('uses different numbers only when octave directions across staves overlap in file order', () => {
  const score = source()
  const [upper, lower] = score.parts[0].staves
  score.parts = score.parts.slice(0, 1)
  for (const [index, staff] of [upper, lower].entries()) {
    const next = structuredClone(staff.measures[0])
    next.number = 2
    next.id = 'next-' + next.id
    next.voices.forEach(voice => voice.events.forEach(event => { event.id = 'next-' + event.id }))
    staff.measures.push(next)
    const prefix = index === 0 ? 'upper' : 'lower'
    ;(score.octaveShifts ??= []).push({
      id: prefix + '-octave', startEventId: prefix + '-1', endEventId: 'next-' + prefix + '-2',
      type: index === 0 ? '8va' : '8vb'
    })
  }
  const numbers = (xml: string) => [...xml.matchAll(/<octave-shift type="(up|down|stop)"([^>]*)\/>/g)]
    .map(match => [match[1], match[2].match(/number="([^"]+)"/)?.[1] ?? '1'])
  const crossing = serializeMusicXml(score)
  expect(numbers(crossing)).toEqual([['down','1'],['up','2'],['stop','1'],['stop','2']])
  expect(serializeMidi(parseMusicXml(crossing))).toEqual(serializeMidi(score))

  score.octaveShifts!.forEach(span => { span.endEventId = span.endEventId.replace('next-', '') })
  const separate = serializeMusicXml(score)
  expect(numbers(separate)).toEqual([['down','1'],['stop','1'],['up','1'],['stop','1']])
  expect(serializeMidi(parseMusicXml(separate))).toEqual(serializeMidi(score))
})

it('preserves inherited accidentals in octave-shift chords and graces, and after the line ends', () => {
  const score = createScore({ title: 'Accidentals at an octave line' })
  const bar = score.parts[0].staves[0].measures[0]
  const voice = bar.voices[0]
  const c = { step: 'C', octave: 4 } as const
  const g = { step: 'G', octave: 4 } as const
  const f = { step: 'F', octave: 4 } as const

  voice.events = [
    createNote({ id: 'written-c-sharp', pitch: { ...c, alter: 1 } }),
    createNote({
      id: 'chord', position: { tick: TICKS_PER_QUARTER },
      pitch: g, pitches: [g, c], graceNotes: [{ pitch: c, slash: true }]
    }),
    createNote({ id: 'written-f-sharp', position: { tick: 2 * TICKS_PER_QUARTER }, pitch: { ...f, alter: 1 } }),
    createNote({ id: 'after-line', position: { tick: 3 * TICKS_PER_QUARTER }, pitch: f })
  ]
  score.octaveShifts = [{ id: 'octave-line', type: '8va', startEventId: 'chord', endEventId: 'written-f-sharp' }]
  const source = structuredClone(score)
  const native = encodeNativeProject(createNativeProject(score))
  const midiPitches = (candidate: Score) => createPlaybackTimeline(candidate).events.map(event =>
    event.frequencies?.map(frequency => Math.round(69 + 12 * Math.log2(frequency / 440))))
  const expected = [[61], [79, 73], [78], [66]]

  expect(midiPitches(score)).toEqual(expected)
  expect(midiPitches(decodeNativeProject(native).score)).toEqual(expected)
  const xml = serializeMusicXml(score)
  expect(xml).toMatch(/<grace[^>]*\/>\s*<pitch>\s*<step>C<\/step>\s*<alter>1<\/alter>\s*<octave>5<\/octave>/)
  const reopened = parseMusicXml(xml)
  expect(midiPitches(reopened)).toEqual(expected)
  expect(serializeMidi(reopened)).toEqual(serializeMidi(score))
  expect(score).toEqual(source)
})

it('does not add an accidental at the played octave of a shifted note', () => {
  const score = createScore()
  const bar = score.parts[0].staves[0].measures[0]
  const voice = bar.voices[0]
  voice.events = [
    createNote({ id: 'shifted', pitch: { step: 'C', alter: 1, octave: 4 } }),
    createNote({ id: 'natural-one', position: { tick: TICKS_PER_QUARTER }, pitch: { step: 'C', octave: 5 } }),
    createNote({ id: 'natural-two', position: { tick: 2 * TICKS_PER_QUARTER }, pitch: { step: 'C', octave: 5 } }),
    createNote({ id: 'explicit-flat', position: { tick: 3 * TICKS_PER_QUARTER }, pitch: { step: 'C', alter: -1, octave: 5 } })
  ]
  score.octaveShifts = [{ id: 'line', type: '8va', startEventId: 'shifted', endEventId: 'shifted' }]
  const pitches = (candidate: Score) => createPlaybackTimeline(candidate).events.map(event =>
    Math.round(69 + 12 * Math.log2(event.frequency! / 440)))
  expect(pitches(score)).toEqual([73, 72, 72, 71])
  expect(pitches(parseMusicXml(serializeMusicXml(score)))).toEqual([73, 72, 72, 71])
})
