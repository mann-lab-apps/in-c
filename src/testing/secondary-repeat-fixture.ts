import {createScore,createNote} from '../score-core'

export function secondaryRepeatFixture(owner:'primary'|'lower'|'other',kind:'repeat'|'volta'){
 const score=createScore();score.title='Secondary repeat '+kind;const part=score.parts[0],base=part.staves[0].measures[0];part.name='Piano'
 part.staves[0].measures=['C','D','E','F'].map((step,index)=>({...structuredClone(base),id:'primary-bar-'+(index+1),number:index+1,voices:[{id:'voice-1',events:[createNote({id:'primary-note-'+index,pitch:{step:step as 'C'|'D'|'E'|'F',octave:4},duration:{value:'whole',dots:0}})]}]}))
 const lower=structuredClone(part.staves[0]);lower.id='lower-staff';for(const [index,m]of lower.measures.entries()){m.id='lower-bar-'+(index+1);m.voices[0].events[0].id='lower-note-'+index;if(m.voices[0].events[0].type==='note')m.voices[0].events[0].pitch.octave=3}part.staves.push(lower)
 const other=structuredClone(part);other.id='other-part';other.name='Violin';other.staves=[structuredClone(part.staves[0])];other.staves[0].id='other-staff';for(const [index,m]of other.staves[0].measures.entries()){m.id='other-bar-'+(index+1);m.voices[0].events[0].id='other-note-'+index;if(m.voices[0].events[0].type==='note')m.voices[0].events[0].pitch.octave=5}score.parts.push(other)
 const input=structuredClone(score),staff=owner==='lower'?lower:owner==='other'?other.staves[0]:part.staves[0]
 staff.measures[0].repeat={start:true};staff.measures[1].repeat={end:true,times:2}
 if(kind==='volta'){staff.measures[1].volta={number:1,start:true,end:true};staff.measures[2].volta={number:2,start:true}}
 return{score,input,staff}
}


export function partRepeatProjectionFixture(kind:'repeat'|'volta'|'empty'|'identical') {
 const {score,staff}=secondaryRepeatFixture('primary','repeat');score.title='Part repeat projection '+kind
 const lower=score.parts[0].staves[1]
 if(kind!=='empty')for(const [i,m]of lower.measures.entries())m.repeat=structuredClone(staff.measures[i].repeat)
 if(kind==='repeat')lower.measures[1].repeat={end:true,times:3}
 if(kind==='volta')lower.measures[1].volta={number:1,start:true,end:true}
 const part=structuredClone(score.parts[0]);for(const target of part.staves)for(const [i,m]of target.measures.entries()){m.repeat=structuredClone(staff.measures[i].repeat);m.volta=structuredClone(staff.measures[i].volta)}
 return {score,expected:{...score,parts:[part]}}
}
