export class MusicXmlSignatureConflictError extends Error {
  constructor(message:string,readonly technicalMessage:string){
    super(message)
    this.name='MusicXmlSignatureConflictError'
  }
}

const fieldLabels:Readonly<Record<string,string>>={
  title:'제목',composer:'작곡가',tempo:'빠르기',tempoEvents:'위치별 빠르기',rhythmFeel:'리듬 스타일',
  parts:'파트·보표·음표',harmonies:'코드 심벌',rehearsalMarks:'연습표',staffTexts:'보표 텍스트',
  systemTexts:'시스템 텍스트',expressionTexts:'표현 텍스트',dynamics:'셈여림',hairpins:'헤어핀',
  slurs:'슬러',octaveShifts:'옥타브 선',pedalEvents:'서스테인 페달'
}

/** Last presentation fallback for a proven save-signature mismatch. This does
 * not infer a repair path or change what XML can preserve. More specific repeat
 * and metadata feedback must be chosen first by the caller.
 */
export function createMusicXmlSignatureConflictError(differences:readonly string[],diagnostic:string):MusicXmlSignatureConflictError|undefined{
  if(!differences.length)return undefined
  const fields=new Set(differences)
  const labels=Object.entries(fieldLabels).filter(([field])=>fields.has(field)).map(([,label])=>label)
  if(differences.some(field=>!Object.hasOwn(fieldLabels,field)))labels.push('그 밖의 악보 정보')
  const summary=labels.slice(0,3).join('·')+(labels.length>3?` 외 ${labels.length-3}개 항목`:'')
  return new MusicXmlSignatureConflictError(
    `MusicXML 저장 검증에 실패했습니다. ${summary} 정보가 MusicXML에서 달라질 수 있어 파일을 쓰지 않았습니다. 원본을 유지하려면 프로젝트로 저장해 주세요. 자세한 검사 내용은 기술 정보에서 확인할 수 있습니다.`,
    diagnostic
  )
}
