import { expect,it } from 'vitest'
import { createMusicXmlSignatureConflictError,MusicXmlSignatureConflictError } from './musicxml-signature-conflicts'

it('translates a known signature field and keeps the exact original diagnostic',()=>{
 const raw='Original (systemTexts)',error=createMusicXmlSignatureConflictError(['systemTexts'],raw)!
 expect(error).toBeInstanceOf(MusicXmlSignatureConflictError);expect(error.message).toContain('시스템 텍스트');expect(error.message).toContain('프로젝트로 저장');expect(error.message).not.toContain('systemTexts');expect(error.technicalMessage).toBe(raw)
})
it('uses canonical mixed-field labels without promising an unsupported editor',()=>{
 const fields=['systemTexts','composer','title'],before=[...fields],error=createMusicXmlSignatureConflictError(fields,'Raw (title, composer, systemTexts)')!
 expect(error.message).toContain('제목·작곡가·시스템 텍스트');expect(error.message).not.toContain('악보 정보’에서');expect(error.message).not.toContain('수정하면');expect(fields).toEqual(before)
})
it('bounds the summary while keeping all diagnostics for a large mixed mismatch',()=>{
 const fields=['title','composer','tempo','tempoEvents','parts','systemTexts'],raw=fields.join(', '),error=createMusicXmlSignatureConflictError(fields,raw)!
 expect(error.message).toContain('제목·작곡가·빠르기 외 3개 항목');expect(error.message).not.toContain('systemTexts');expect(error.technicalMessage).toBe(raw)
})
it('does not expose unknown field names or prototype properties as user labels',()=>{
 const error=createMusicXmlSignatureConflictError(['futureField','toString'],'Raw (futureField, toString)')!
 expect(error.message).toContain('그 밖의 악보 정보');expect(error.message).not.toContain('futureField');expect(error.message).not.toContain('function');expect(error.technicalMessage).toBe('Raw (futureField, toString)')
})
it('deduplicates user categories without mutating the complete original diagnostic',()=>{
 const raw='Raw (slurs, slurs, octaveShifts)',error=createMusicXmlSignatureConflictError(['slurs','slurs','octaveShifts'],raw)!
 expect(error.message).toContain('슬러·옥타브 선');expect(error.message.match(/슬러/g)).toHaveLength(1);expect(error.technicalMessage).toBe(raw)
})
it('does not invent a mismatch for an empty difference list',()=>{
 expect(createMusicXmlSignatureConflictError([],'Raw')).toBeUndefined()
})
