import { createNote, durationToTicks } from '../score-core'
import { createNativeProject } from '../project/schema'
import { createPartSpanResetFixture } from './part-span-reset-fixture'

export function createStudioEditingFixture() {
  const score=createPartSpanResetFixture().score
  score.title='Studio editing QA';score.slurs=undefined;score.hairpins=undefined;score.octaveShifts=undefined
  const voice=score.parts[0].staves[0].measures[0].voices[0]
  voice.tuplets=undefined
  voice.events=['source','host','third','fourth'].map((id,index)=>createNote({id:`editing-${id}`,position:{tick:index*durationToTicks({value:'quarter',dots:0})},pitch:{step:index<2?'F':'A',octave:4,...(index===0?{alter:1 as const}:{})}}))
  return createNativeProject(score)
}
