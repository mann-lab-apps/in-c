import { createInteriorHairpinFixture } from './interior-hairpin-fixture'
export function createPrintHeaderFixture(kind: 'short'|'wrapped'|'no-tempo'|'swing'|'tempo-text'|'tall-no-tempo') {
  const project=createInteriorHairpinFixture(false,false),score=project.score
  score.title=(kind==='wrapped'||kind==='swing')?'긴 제목의 줄바꿈과 빠르기 표시가 겹치지 않는지 확인하는 악보 '.repeat(3).trim():'Header'
  if(kind==='tall-no-tempo')score.title='긴 제목의 줄바꿈과 악보단 배치를 확인하는 악보 '.repeat(12).trim()
  delete score.hairpins;delete score.dynamics;delete score.expressionTexts
  for(const part of score.parts)for(const staff of part.staves)for(const measure of staff.measures)for(const voice of measure.voices)for(const event of voice.events)if(event.type==='note')delete event.lyrics
  if(kind==='no-tempo'||kind==='tall-no-tempo')delete score.tempo
  if(kind==='swing')score.rhythmFeel={unit:'eighth'}
  if(kind==='tempo-text')score.tempo!.text='Allegro molto vivace e con espressione, sempre leggiero e cantabile'
  return project
}
