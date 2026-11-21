// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {beforeEach,expect,it,vi} from 'vitest'
import {createPracticeLoopFixture} from '../../testing/practice-loop-fixture'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../../project/schema'
import {registerAppTestHooks,playbackMockState,openStudioWorkspace} from './App.test-harness'
registerAppTestHooks()
beforeEach(()=>Object.defineProperty(Element.prototype,'scrollIntoView',{configurable:true,value:vi.fn()}))
async function setup(kind:'normal'|'repeat'|'boundary'='normal'){
 window.history.replaceState({},'','/?fixture=release-test')
 const score=createPracticeLoopFixture()
 if(kind==='repeat')score.parts[1].staves[0].measures[0].repeat={start:true}
 if(kind==='boundary'){const notes=score.parts[1].staves[0].measures[0].voices[0].events;if(notes[0].type==='note')notes[0].ties={start:true};if(notes[1].type==='note')notes[1].ties={stop:true}}
 const project=decodeNativeProject(encodeNativeProject(createNativeProject(score)))
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/practice.chromatics',fileName:'practice.chromatics',contents:encodeNativeProject(project)})
 const {App}=await import('./App');const view=render(<App/>);fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score))
 fireEvent.click(screen.getByRole('button',{name:'upper-note-1 선택'}));fireEvent.click(screen.getByRole('button',{name:'upper-note-6 선택'}),{shiftKey:true})
 return {project,view}
}
it('configures only session rehearsal and preserves selection, score, dirty, undo and native payload',async()=>{
 const {project}=await setup();const toggle=screen.getByRole('button',{name:'연습 루프'});expect(toggle).toHaveAttribute('aria-pressed','false')
 fireEvent.click(toggle);expect(toggle).toHaveAttribute('aria-pressed','true');expect(playbackMockState.lastPracticeLoop).toMatchObject({startBeat:1,endBeat:7});expect(screen.getByLabelText('연습 구간')).toHaveTextContent('총보')
 expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(project.score)
})
it('retains the configured range after another selection and releases it explicitly without history',async()=>{
 await setup();fireEvent.click(screen.getByRole('button',{name:'연습 루프'}));fireEvent.click(screen.getByRole('button',{name:'upper-note-10 선택'}));expect(playbackMockState.lastPracticeLoop).toMatchObject({startBeat:1,endBeat:7})
 fireEvent.keyDown(screen.getByRole('button',{name:'연습 루프'}),{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'연습 루프'}));expect(playbackMockState.lastPracticeLoop).toBeUndefined();expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it.each(['repeat','boundary']as const)('explains unsupported %s while leaving ordinary Play available',async kind=>{
 const {project}=await setup(kind);expect(screen.getByRole('button',{name:'연습 루프'})).toBeDisabled();expect(screen.getByLabelText('연습 루프 적용 안내')).toHaveTextContent(kind==='repeat'?'반복':'타이');expect(screen.getByRole('button',{name:'재생'})).toBeEnabled();expect(playbackMockState.lastScore).toEqual(project.score)
})
it('clears old anchors after a real musical edit and does not resurrect them on undo',async()=>{
 const {project}=await setup();fireEvent.click(screen.getByRole('button',{name:'연습 루프'}));fireEvent.click(screen.getByRole('button',{name:'upper-note-2 선택'}));fireEvent.keyDown(window,{key:'ArrowUp',code:'ArrowUp'})
 expect(playbackMockState.lastScore).not.toEqual(project.score);expect(playbackMockState.lastPracticeLoop).toBeUndefined();fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score);expect(playbackMockState.lastPracticeLoop).toBeUndefined()
})
it('does not persist the rehearsal range across remount',async()=>{
 const {view}=await setup();fireEvent.click(screen.getByRole('button',{name:'연습 루프'}));view.unmount();await setup();expect(screen.getByRole('button',{name:'연습 루프'})).toHaveAttribute('aria-pressed','false');expect(playbackMockState.lastPracticeLoop).toBeUndefined()
})
