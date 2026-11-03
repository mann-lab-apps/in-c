import { createDuration,createNote,createScore,TICKS_PER_QUARTER } from '../score-core'

/** Existing native compatibility shape. XML's primary-only system text path
 * cannot preserve the off-primary owner;no new schema or unsupported editor.
 */
export function musicXmlSignatureConflictFixture(kind:'system'|'mixed'|'broad'){
  const score=createScore()
  score.title='Generated measure dynamics consistency · 저장 검증 안내'+(kind!=='system'?'  ':'')
  score.composer='원본 작곡가'+(kind!=='system'?'  ':'')
  const primary=score.parts[0]
  primary.id='signature-primary';primary.name='Piano'
  const staff=primary.staves[0],measure=staff.measures[0]
  staff.id='signature-primary-staff';measure.id='signature-primary-measure'
  measure.voices[0].events=[createNote({id:'signature-note',pitch:{step:'C',octave:4},duration:createDuration('whole')})]
  const other=structuredClone(primary)
  other.id='signature-other';other.name='Flute';other.staves[0].id='signature-other-staff'
  const otherMeasure=other.staves[0].measures[0]
  otherMeasure.id='signature-other-measure'
  otherMeasure.voices[0].events=[createNote({id:'signature-other-note',pitch:{step:'G',octave:5},duration:createDuration('whole')})]
  score.parts.push(other)
  score.systemTexts=[{id:'legacy-other-system',measureId:otherMeasure.id,text:'원본 시스템 텍스트'}]
  if(kind==='broad')score.tempoEvents=[{id:'legacy-other-tempo',measureId:otherMeasure.id,tick:TICKS_PER_QUARTER,bpm:72,beatUnit:'quarter',dots:0,text:'Other rit'}]
  return score
}
