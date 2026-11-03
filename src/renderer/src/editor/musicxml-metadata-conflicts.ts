export class MusicXmlMetadataConflictError extends Error {
  constructor(message:string,readonly technicalMessage:string){
    super(message)
    this.name='MusicXmlMetadataConflictError'
  }
}

/** Describe a metadata-only mismatch without accepting or changing any value.
 * Other signature losses must keep their existing validation/feedback path.
 */
export function createMusicXmlMetadataConflictError(differences:readonly string[],diagnostic:string):MusicXmlMetadataConflictError|undefined{
  if(!differences.length||differences.some(field=>field!=='title'&&field!=='composer'))return undefined
  const fields=[...(differences.includes('title')?['제목']:[]),...(differences.includes('composer')?['작곡가']:[])].join('·')
  return new MusicXmlMetadataConflictError(
    `MusicXML 저장 검증에 실패했습니다. ${fields} 표기가 MusicXML에서 달라질 수 있어 파일을 쓰지 않았습니다. ‘악보 정보’에서 ${fields} 항목을 확인하고 다시 내보내 주세요. 원본을 유지하려면 프로젝트로 저장해 주세요.`,
    diagnostic
  )
}
