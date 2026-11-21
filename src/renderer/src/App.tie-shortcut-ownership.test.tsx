// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {beforeEach,expect,it,vi} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createPracticeLoopFixture} from '../../testing/practice-loop-fixture'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../../project/schema'
import {serializeMidi} from './midi/serialize-midi'
import {serializeMusicXml} from '../../musicxml'
import {registerAppTestHooks,playbackMockState} from './App.test-harness'
registerAppTestHooks()
beforeEach(()=>Object.defineProperty(Element.prototype,'scrollIntoView',{configurable:true,value:vi.fn()}))
async function setup(){
 window.history.replaceState({},'','/?fixture=release-test')
 const score=createPracticeLoopFixture(),project=decodeNativeProject(encodeNativeProject(createNativeProject(score)))
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/tie-keys.chromatics',fileName:'tie-keys.chromatics',contents:encodeNativeProject(project)})
 const {App}=await import('./App');render(<App/>);fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score));fireEvent.click(screen.getByRole('button',{name:'upper-note-0 선택'}));return project
}
it.each([{ctrlKey:true},{metaKey:true},{altKey:true},{ctrlKey:true,shiftKey:true},{metaKey:true,shiftKey:true},{altKey:true,shiftKey:true}])('keeps unsupported modified T out of tie editing: %j',async modifiers=>{
 const project=await setup();fireEvent.keyDown(window,{key:modifiers.shiftKey?'T':'t',code:'KeyT',...modifiers})
 expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id','upper-note-0')
})
it.each([false,true])('preserves plain T, shift=%s, and exactly one undo/redo',async shiftKey=>{
 const project=await setup();fireEvent.keyDown(window,{key:shiftKey?'T':'t',code:'KeyT',shiftKey});const changed=structuredClone(playbackMockState.lastScore!)
 const expected=structuredClone(project.score),notes=expected.parts[0].staves[0].measures[0].voices[0].events
 if(notes[0].type==='note')notes[0].ties={start:true};if(notes[1].type==='note')notes[1].ties={stop:true}
 expect(changed).toEqual(expected);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score);fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(expected)
 const dir=process.env.STUDIO_TIE_KEY_GUARD_QA_DIR
 if(dir&&!shiftKey){mkdirSync(dir,{recursive:true});for(const[name,score]of[['source',project.score],['tied',expected]]as const){writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject({...project,score}),{flag:'wx'});writeFileSync(join(dir,name+'.musicxml'),serializeMusicXml(score),{flag:'wx'});writeFileSync(join(dir,name+'.mid'),serializeMidi(score),{flag:'wx'})}}
})
it.each([{isComposing:true},{keyCode:229},{key:'Process'}])('keeps IME ownership for %j',async extra=>{
 const project=await setup();fireEvent.keyDown(window,{key:'t',code:'KeyT',...extra});expect(playbackMockState.lastScore).toEqual(project.score)
})
