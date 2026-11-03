import { expect,it } from 'vitest'
import { createMusicXmlMetadataConflictError,MusicXmlMetadataConflictError } from './musicxml-metadata-conflicts'

it.each([['title','제목'],['composer','작곡가']])('describes only the changed metadata field %s and preserves the original diagnostic', (field,label)=>{
 const raw=`MusicXML 저장 검증에 실패했습니다. (${field})`,error=createMusicXmlMetadataConflictError([field],raw)!
 expect(error).toBeInstanceOf(MusicXmlMetadataConflictError);expect(error.message).toContain(`${label} 표기`);expect(error.message).toContain('악보 정보');expect(error.message).toContain('프로젝트로 저장');expect(error.message).not.toContain(field);expect(error.technicalMessage).toBe(raw)
})
it('uses canonical user labels without mutating the difference list',()=>{
 const fields=['composer','title'],before=[...fields],raw='Original (title, composer)'
 expect(createMusicXmlMetadataConflictError(fields,raw)?.message).toContain('제목·작곡가');expect(fields).toEqual(before)
})
it.each([{fields:[]},{fields:['title','parts']},{fields:['tempoEvents']}])('does not reclassify empty or non-metadata save losses $fields',({fields})=>{
 expect(createMusicXmlMetadataConflictError(fields,'Original diagnostic')).toBeUndefined()
})
