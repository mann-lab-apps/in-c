// @vitest-environment jsdom
import {expect,it} from 'vitest'
import {manualSections,searchManual} from './studio-manual'
it.each([
 ['02-workspace.md','menus','전역 메뉴와 명령 검색'],
 ['02-workspace.md','editing-shortcuts','편집 단축키 설정'],
 ['05-notation.md','tie','타이: 같은 소리를 이어 연주'],
 ['07-playback.md','transport','선택 위치 재생·일시정지·정지·처음으로'],
 ['09-files.md','project','프로젝트 열기·저장·다른 이름 저장']
])('keeps task %s#%s under its own searchable heading', (file,anchor,title)=>{
 const sections=manualSections().filter(s=>s.file===file&&s.anchor===anchor)
 expect(sections).toHaveLength(1)
 expect(sections[0].title).toBe(title)
})
it('finds source part-symbol limitations under import rather than PDF to Score transfer',()=>{
 const results=searchManual('part-symbol').filter(s=>s.file==='09-files.md')
 expect(results.map(s=>s.anchor)).toEqual(['import'])
 expect(results[0].title).toBe('MusicXML·MXL 가져오기와 원본 보호')
})
it('finds shortcut unbinding under its own task rather than saved dock layouts',()=>{
 const result=searchManual('선택 명령 단축키 해제').find(s=>s.file==='02-workspace.md'&&s.content.includes('선택 명령 단축키 해제'))
 expect(result?.anchor).toBe('editing-shortcuts')
 expect(result?.title).toBe('편집 단축키 설정')
})

it('keeps pointer-selection guidance in the selection task rather than global menus',()=>{
 const results=searchManual('포인터 음악 기호').filter(s=>s.file==='02-workspace.md'&&s.content.includes('선택한 음악 기호로 대상을 확인'))
 expect(results.map(s=>s.anchor)).toEqual(['selection'])
})
