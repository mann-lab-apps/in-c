// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createPracticeLoopFixture} from '../../testing/practice-loop-fixture'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../project/schema'
import {openStudioWorkspace,playbackMockState,registerAppTestHooks} from './App.test-harness'
registerAppTestHooks()
const conflict='Native project changed on disk. Reopen it or save to another file.'
const recovery='파일 → 프로젝트 다른 이름으로 저장'
async function setup(){
 window.history.replaceState({},'','/?fixture=release-test')
 const project=createNativeProject(createPracticeLoopFixture()),filePath='/fixture/current.chromatics'
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'current.chromatics',filePath,contents:encodeNativeProject(project)})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
 await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score))
 const first=project.score.parts[0].staves[0].measures[0].voices[0].events[0]
 fireEvent.click(screen.getByRole('button',{name:first.id+' 선택'}));fireEvent.keyDown(window,{key:'ArrowUp',code:'ArrowUp'})
 const dirty=structuredClone(playbackMockState.lastScore!);expect(dirty).not.toEqual(project.score)
 const selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
 openStudioWorkspace('파일')
 return{project,filePath,dirty,selected}
}
async function failed(diagnostic:string){
 fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
 const status=screen.getByRole('status',{name:'편집 및 파일 상태'})
 await waitFor(()=>expect(status).toHaveTextContent('프로젝트 저장을 마무리하지 못했습니다.'))
 expect(status).not.toHaveTextContent(diagnostic)
 const group=screen.getByRole('group',{name:'프로젝트 저장 기술 정보'}),button=within(group).getByRole('button',{name:'기술 정보'})
 expect(button).toHaveAttribute('aria-expanded','false');fireEvent.click(button);expect(within(group).getByText(diagnostic)).toBeVisible()
 return status
}
it.each([conflict,`Error invoking remote method 'project:save': Error: ${conflict}`])('guides an unwritten disk conflict to safe Save As while preserving the exact project and undo: %s',async diagnostic=>{
 const s=await setup();vi.mocked(window.inC.project.save).mockRejectedValueOnce(new Error(diagnostic))
 const status=await failed(diagnostic)
 expect(status).toHaveTextContent('파일이 앱 밖에서 변경되어 덮어쓰지 않았습니다.')
 expect(status).toHaveTextContent(recovery)
 expect(status).toHaveTextContent('편집 내용은 유지됩니다.')
 expect(playbackMockState.lastScore).toEqual(s.dirty);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',s.selected!)
 expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경');expect(status).toHaveTextContent('1회 수정')
 const first=vi.mocked(window.inC.project.save).mock.calls[0][0];expect(first.filePath).toBe(s.filePath);expect(decodeNativeProject(first.contents).score).toEqual(s.dirty)
 fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(s.project.score)
 fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(s.dirty)
 vi.mocked(window.inC.project.save).mockResolvedValueOnce({filePath:'/fixture/recovered.chromatics',fileName:'recovered.chromatics'})
 fireEvent.click(screen.getByRole('button',{name:'프로젝트 다른 이름으로 저장'}))
 await waitFor(()=>expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음'))
 const second=vi.mocked(window.inC.project.save).mock.calls[1][0];expect(second.filePath).toBeUndefined();expect(decodeNativeProject(second.contents).score).toEqual(s.dirty)
 expect(screen.queryByRole('group',{name:'프로젝트 저장 기술 정보'})).not.toBeInTheDocument()
})
it.each(['recent','cleanup']as const)('does not claim no overwrite when the %s step fails after a successful file write',async stage=>{
 const s=await setup();vi.mocked(window.inC.project.save).mockResolvedValueOnce({filePath:s.filePath,fileName:'current.chromatics'})
 if(stage==='recent')vi.mocked(window.inC.recentMusicXml.add).mockRejectedValueOnce(new Error(conflict))
 else vi.mocked(window.inC.autosave.clear).mockRejectedValueOnce(new Error(conflict))
 const status=await failed(conflict);expect(status).not.toHaveTextContent('덮어쓰지 않았습니다');expect(status).not.toHaveTextContent(recovery)
 expect(status).toHaveTextContent('기술 정보를 확인한 뒤 다시 시도해 주세요.')
 expect(playbackMockState.lastScore).toEqual(s.dirty);expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
})
it.each([`Not a project-save conflict: ${conflict}`,`Error invoking remote method 'recent:add': Error: ${conflict}`])('keeps the generic recovery for an unrelated diagnostic: %s',async diagnostic=>{
 await setup();vi.mocked(window.inC.project.save).mockRejectedValueOnce(new Error(diagnostic))
 const status=await failed(diagnostic);expect(status).not.toHaveTextContent('덮어쓰지 않았습니다');expect(status).not.toHaveTextContent(recovery)
 expect(status).toHaveTextContent('기술 정보를 확인한 뒤 다시 시도해 주세요.')
})
