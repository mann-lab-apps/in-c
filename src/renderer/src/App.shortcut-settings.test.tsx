// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createPracticeLoopFixture} from '../../testing/practice-loop-fixture'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../../project/schema'
import {openStudioWorkspace,playbackMockState,registerAppTestHooks,chooseSpanReference} from './App.test-harness'
registerAppTestHooks()
const storageKey='studio.edit-shortcuts.v1'
async function setup(span=false){
 window.history.replaceState({},'','/?fixture=release-test');localStorage.removeItem(storageKey)
 const score=createPracticeLoopFixture();if(span)score.slurs=[{id:'shortcut-slur',startEventId:'upper-note-0',endEventId:'upper-note-1',engraving:{offsetY:0,height:4}}]
 const project=decodeNativeProject(encodeNativeProject(createNativeProject(score)))
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/shortcuts.chromatics',fileName:'shortcuts.chromatics',contents:encodeNativeProject(project)})
 const{App}=await import('./App');const view=render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score));fireEvent.click(screen.getByRole('button',{name:'upper-note-0 선택'}));return{project,view}
}
function openSettings(){fireEvent.click(screen.getByRole('button',{name:'편집'}));fireEvent.click(screen.getByRole('menuitem',{name:'단축키 설정…'}))}
function chooseCommand(label:string){fireEvent.click(screen.getByRole('combobox',{name:'단축키 명령'}));fireEvent.click(screen.getByRole('option',{name:label}))}
function record(code='KeyD',key='D'){fireEvent.keyDown(screen.getByRole('textbox',{name:'새 단축키'}),{key,code,ctrlKey:true,shiftKey:true})}
function bind(label:string){openSettings();chooseCommand(label);record();fireEvent.click(screen.getByRole('button',{name:'단축키 적용'}));fireEvent.click(screen.getByRole('button',{name:'설정 창 닫기'}))}
const key=(code:string,extra={})=>fireEvent.keyDown(window,{key:code.startsWith('Key')?code.slice(3).toLowerCase():code,code,ctrlKey:true,...extra})
it('rebinds score undo, removes its old key and restores all legacy aliases without adding score history',async()=>{
 const{project}=await setup();fireEvent.keyDown(window,{key:'ArrowUp',code:'ArrowUp'});const edited=structuredClone(playbackMockState.lastScore!);expect(edited).not.toEqual(project.score)
 bind('실행 취소');expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');expect(localStorage.getItem(storageKey)).toContain('KeyD')
 key('KeyZ');expect(playbackMockState.lastScore).toEqual(edited);key('KeyD',{shiftKey:true});expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 key('KeyY');expect(playbackMockState.lastScore).toEqual(edited)
 openSettings();chooseCommand('실행 취소');fireEvent.click(screen.getByRole('button',{name:'선택 명령 단축키 해제'}));fireEvent.click(screen.getByRole('button',{name:'설정 창 닫기'}));key('KeyD',{shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
 openSettings();chooseCommand('실행 취소');fireEvent.click(screen.getByRole('button',{name:'선택 명령 기본값 복원'}));fireEvent.click(screen.getByRole('button',{name:'설정 창 닫기'}));key('KeyZ');expect(playbackMockState.lastScore).toEqual(project.score)
})
it.each(['copy','cut','paste'] as const)('executes configured %s through its existing selection command and preserves one-undo semantics',async action=>{
 const{project}=await setup();bind({copy:'복사',cut:'잘라내기',paste:'붙여넣기'}[action])
 if(action==='copy'){
  key('KeyD',{shiftKey:true});fireEvent.click(screen.getByRole('button',{name:'lower-note-0 선택'}));key('KeyC');fireEvent.click(screen.getByRole('button',{name:'lower-note-4 선택'}));key('KeyV')
 }else if(action==='cut'){
  key('KeyX');expect(playbackMockState.lastScore).toEqual(project.score);key('KeyD',{shiftKey:true});expect(playbackMockState.lastScore!.parts[0].staves[0].measures[0].voices[0].events[0].type).toBe('rest');key('KeyZ');expect(playbackMockState.lastScore).toEqual(project.score);return
 }else{
  key('KeyC');fireEvent.click(screen.getByRole('button',{name:'lower-note-4 선택'}));key('KeyV');expect(playbackMockState.lastScore).toEqual(project.score);key('KeyD',{shiftKey:true})
 }
 expect(playbackMockState.lastScore!.parts[1].staves[0].measures[1].voices[0].events[0]).toMatchObject({type:'note',pitch:{step:'C',octave:4}});expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');key('KeyZ');expect(playbackMockState.lastScore).toEqual(project.score)
})
it('rejects fixed/duplicate shortcuts, ignores IME and cancels stale capture when the command changes',async()=>{
 const{project}=await setup();openSettings();chooseCommand('실행 취소');record('KeyS','S');expect(screen.getByRole('button',{name:'단축키 적용'})).toBeDisabled();expect(screen.getByRole('alert')).toHaveTextContent(/저장|예약/);expect(window.inC.project.save).not.toHaveBeenCalled()
 record('KeyC','C');expect(screen.getByRole('button',{name:'단축키 적용'})).toBeDisabled();expect(screen.getByRole('alert')).toHaveTextContent('복사')
 record();chooseCommand('복사');expect(screen.getByRole('button',{name:'단축키 적용'})).toBeDisabled();const input=screen.getByRole('textbox',{name:'새 단축키'});fireEvent.compositionStart(input);fireEvent.keyDown(input,{key:'D',code:'KeyD',ctrlKey:true,shiftKey:true,isComposing:true});fireEvent.keyDown(input,{key:'Escape',code:'Escape',isComposing:true});expect(screen.getByRole('dialog',{name:'단축키 설정'})).toBeVisible();expect(screen.getByRole('button',{name:'단축키 적용'})).toBeDisabled();fireEvent.compositionEnd(input)
 expect(localStorage.getItem(storageKey)).toBeNull();expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it.each(['closed-select','span'] as const)('keeps configured undo in the existing %s scope',async scope=>{
 const{project}=await setup(scope==='span');fireEvent.keyDown(window,{key:'ArrowUp',code:'ArrowUp'});const edited=structuredClone(playbackMockState.lastScore!);bind('실행 취소')
 if(scope==='closed-select'){openStudioWorkspace('파일');const target=screen.getByRole('combobox',{name:'선택 필터'});target.focus();fireEvent.keyDown(target,{key:'D',code:'KeyD',ctrlKey:true,shiftKey:true})}
 else{chooseSpanReference('slur:shortcut-slur');key('KeyZ');expect(playbackMockState.lastScore).toEqual(edited);key('KeyD',{shiftKey:true})}
 expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('updates menu accessibility, toolbar hints and the actual shortcut help after remapping',async()=>{
 await setup();fireEvent.keyDown(window,{key:'ArrowUp',code:'ArrowUp'});bind('실행 취소');fireEvent.click(screen.getByRole('button',{name:'편집'}));expect(screen.getByRole('menuitem',{name:'실행 취소'})).toHaveAttribute('aria-keyshortcuts','Meta+Shift+D Control+Shift+D');fireEvent.keyDown(screen.getByRole('menuitem',{name:'실행 취소'}),{key:'Escape',code:'Escape'});openStudioWorkspace('파일');fireEvent.focus(screen.getByRole('button',{name:'실행 취소'}));expect(screen.getByRole('tooltip')).toHaveTextContent('⌘/Ctrl+Shift+D');fireEvent.click(screen.getByRole('button',{name:'단축키 도움말'}));const row=Array.from(document.querySelectorAll('.studio-shortcut-row')).find(row=>row.querySelector('dt')?.textContent?.startsWith('실행 취소'));expect(row?.querySelector('dd')).toHaveTextContent('⌘/Ctrl+Shift+D');expect(screen.getByRole('button',{name:'단축키 설정 열기'})).toBeEnabled()
})
it('leaves text editing and composition with their owner and restores the menu trigger after closing',async()=>{
 const{project}=await setup();bind('실행 취소');fireEvent.keyDown(window,{key:'ArrowUp',code:'ArrowUp'});const edited=structuredClone(playbackMockState.lastScore!);const input=document.createElement('input');document.body.append(input);input.focus();fireEvent.keyDown(input,{key:'D',code:'KeyD',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited);fireEvent.keyDown(window,{key:'D',code:'KeyD',ctrlKey:true,shiftKey:true,isComposing:true});expect(playbackMockState.lastScore).toEqual(edited);input.remove();openSettings();const capture=screen.getByRole('textbox',{name:'새 단축키'});record();fireEvent.keyDown(capture,{key:'Escape',code:'Escape'});expect(capture).toHaveValue('');expect(screen.getByRole('dialog',{name:'단축키 설정'})).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'설정 창 닫기'}));await waitFor(()=>expect(screen.getByRole('button',{name:'편집'})).toHaveFocus());key('KeyD',{shiftKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
})
it('rebinds redo independently and removes both old redo aliases',async()=>{
 const{project}=await setup();fireEvent.keyDown(window,{key:'ArrowUp',code:'ArrowUp'});const edited=structuredClone(playbackMockState.lastScore!);key('KeyZ');expect(playbackMockState.lastScore).toEqual(project.score);bind('다시 실행');key('KeyY');key('KeyZ',{shiftKey:true});expect(playbackMockState.lastScore).toEqual(project.score);key('KeyD',{shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');key('KeyZ');expect(playbackMockState.lastScore).toEqual(project.score)
})
