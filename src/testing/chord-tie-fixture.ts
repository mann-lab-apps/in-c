// Owned existing-model whole-chord ties. Partial/member-specific ties are not defined here.
import { createDuration,createMeasure,createNote,createPart,createScore,createStaff,createVoice } from '../score-core'
export function createWholeChordTieScore(crossSystem: boolean, chord = true) {
  const measures = [0,1].map(index => {
    const note=createNote({id:`chord-tie-${index+1}`,pitch:{step:'C',octave:4,alter:0},pitches:[{step:'C',octave:4,alter:0},{step:'E',octave:4,alter:0}],duration:createDuration('whole')})
    if (!chord) delete note.pitches
    note.ties=index===0?{start:true}:{stop:true}
    return createMeasure({id:`chord-tie-measure-${index+1}`,number:index+1,voices:[createVoice({id:'voice-1',events:[note]})]})
  })
  const score=createScore({id:'whole-chord-ties',title:chord?'Whole chord ties':'Single note ties',tempo:{bpm:120,beatUnit:'quarter',text:'♩ = 120'},parts:[createPart({id:'tie-part',name:'Tie QA',staves:[createStaff({id:'tie-staff',measures})]})]})
  if(crossSystem)score.layout={systemBreakBeforeMeasureIds:[measures[1]!.id]}
  return score
}

// Same authored whole chord, different storage order of the upper members.
// The primary C is unchanged, so this is already accepted by the event-level model.
export function createReorderedWholeChordTieScore(crossSystem: boolean, primary = false) {
  const score = createWholeChordTieScore(crossSystem)
  const notes = score.parts[0].staves[0].measures.map(m => m.voices[0].events[0])
  for (const [index, note] of notes.entries()) {
    if (note.type !== 'note') throw Error('Expected fixture note')
    const c = { step: 'C' as const, octave: 4, alter: 0 as const }
    const e = { step: 'E' as const, octave: 4, alter: 1 as const }
    const g = { step: 'G' as const, octave: 4, alter: 0 as const }
    note.pitches = index === 0 ? [c, e, g] : primary ? [e, g, c] : [c, g, e]
    note.pitch = note.pitches[0]
  }
  score.title = primary ? 'Reordered primary chord ties' : 'Reordered whole chord ties'
  return score
}

export function createUnequalChordTieScore(kind: 'changed-member' | 'fewer-members' | 'changed-alter') {
  const score = createReorderedWholeChordTieScore(false)
  const target = score.parts[0].staves[0].measures[1].voices[0].events[0]
  if (target.type !== 'note') throw Error('Expected note fixture')
  if (kind === 'changed-member') target.pitches![1] = { step: 'A', octave: 4, alter: 0 }
  if (kind === 'fewer-members') target.pitches!.splice(1, 1)
  if (kind === 'changed-alter') target.pitches![2].alter = 0
  return score
}
