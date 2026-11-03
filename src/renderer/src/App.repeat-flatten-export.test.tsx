// @vitest-environment jsdom
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {registerAppTestHooks,openStudioWorkspace,playbackMockState} from './App.test-harness'
import {createRepeatTempoStateFixture} from '../../testing/repeat-tempo-state-fixture'
import {createNativeProject,encodeNativeProject} from '../../project/schema'
import {serializeMusicXml,parseMusicXml} from '../../musicxml'
import {serializeMidi} from './midi/serialize-midi'
registerAppTestHooks()
const label='반복 펼치기 MusicXML 내보내기'
async function setup(unsupported=false){
 window.history.replaceState({},'','/?fixture=release-test')
 const score=createRepeatTempoStateFixture();if(unsupported)score.slurs=[{id:'keep-slur',startEventId:'tempo-a',endEventId:'tempo-c'}]
 const project=createNativeProject(score)
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/owned/repeat.chromatics',fileName:'repeat.chromatics',contents:encodeNativeProject(project)})
 const {App}=await import('./App');render(<App />);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
 await waitFor(()=>expect(playbackMockState.lastScore).toEqual(score));openStudioWorkspace('내보내기');return score
}
it('studio.repeat-flatten-export keeps the default XML exact and adds a separately named performed copy',async()=>{
 const score=await setup(),native=encodeNativeProject(createNativeProject(score))
 vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValue({filePath:'/owned/expanded.musicxml',fileName:'expanded.musicxml'})
 fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}));await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
 expect(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents).toBe(serializeMusicXml(score))
 const button=screen.getByRole('button',{name:label});await waitFor(()=>expect(button).toBeEnabled());fireEvent.click(button)
 await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(2))
 const copy=vi.mocked(window.inC.musicXml.exportCopy).mock.calls[1][0];expect(copy.suggestedName).toContain('반복펼치기');expect(copy.contents).not.toContain('<repeat');expect(serializeMidi(parseMusicXml(copy.contents))).toEqual(serializeMidi(score))
 await screen.findByText(/반복을 마디로 펼친 사본/)
 expect(playbackMockState.lastScore).toEqual(score);expect(encodeNativeProject(createNativeProject(playbackMockState.lastScore!))).toBe(native);expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
})
it('studio.repeat-flatten-export blocks unsupported spans before IPC with an ordinary export fallback',async()=>{
 const score=await setup(true);fireEvent.click(screen.getByRole('button',{name:label}))
 await screen.findByText(/일반 MusicXML 내보내기나 프로젝트 저장/)
 expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(score)
 fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}));await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
 expect(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents).toBe(serializeMusicXml(score))
})
it.each(['success','cancel','failure'] as const)('studio.repeat-flatten-export preserves edits and one undo through pending %s',async outcome=>{
 const score=await setup();let finish!:(value:{filePath:string;fileName:string}|null)=>void,fail!:(e:Error)=>void
 vi.mocked(window.inC.musicXml.exportCopy).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject}))
 const button=screen.getByRole('button',{name:label});fireEvent.click(button);fireEvent.click(button);await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
 expect(screen.getByRole('button',{name:'MusicXML 내보내기'})).toBeDisabled()
 fireEvent.click(screen.getByRole('button',{name:'악보 제목 수정'}));fireEvent.change(screen.getByLabelText('악보 제목'),{target:{value:'편집은 원본에'}});fireEvent.keyDown(screen.getByLabelText('악보 제목'),{key:'Enter'})
 const edited=structuredClone(playbackMockState.lastScore!),selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
 await act(async()=>{if(outcome==='failure')fail(Error('Owned expanded copy failure'));else finish(outcome==='cancel'?null:{filePath:'/owned/expanded.musicxml',fileName:'expanded.musicxml'})})
 await waitFor(()=>expect(button).toBeEnabled());expect(playbackMockState.lastScore).toEqual(edited);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selected);expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
 expect(window.inC.autosave.clear).not.toHaveBeenCalled();if(outcome==='success')expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).toHaveTextContent('내보내기 시작 이후의 수정 내용은 포함되지 않았습니다')
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
})
it.each(['success','failure'] as const)('studio.repeat-flatten-export isolates an older document result %s',async outcome=>{
 await setup();let finish!:(value:{filePath:string;fileName:string})=>void,fail!:(e:Error)=>void
 vi.mocked(window.inC.musicXml.exportCopy).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject}))
 fireEvent.click(screen.getByRole('button',{name:label}));await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}));const wizard=within(screen.getByRole('dialog',{name:'새 악보 만들기'}));fireEvent.change(wizard.getByRole('textbox',{name:'제목'}),{target:{value:'새 문서'}});fireEvent.click(wizard.getByRole('button',{name:'만들기'}));const fresh=structuredClone(playbackMockState.lastScore!)
 await act(async()=>{if(outcome==='failure')fail(Error('Old expanded failure'));else finish({filePath:'/owned/old-expanded.musicxml',fileName:'old-expanded.musicxml'})})
 expect(playbackMockState.lastScore).toEqual(fresh);expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).not.toHaveTextContent(/old-expanded|Old expanded failure/);expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
})
