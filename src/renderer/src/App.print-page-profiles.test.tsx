// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createPracticeLoopFixture} from '../../testing/practice-loop-fixture'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../../project/schema'
import {playbackMockState,registerAppTestHooks,openStudioWorkspace,chooseScoreView} from './App.test-harness'
registerAppTestHooks()
const key='studio.print-page-profiles.v1'
const applied={pageSize:'letter',orientation:'landscape',pageMarginMm:9,staffSizePercent:88,systemSpacingPercent:94} as const
const custom={pageSize:'letter',orientation:'landscape',pageMarginMm:8.5,staffSizePercent:87.5,systemSpacingPercent:93.75} as const
async function setup(){
 window.history.replaceState({},'','/?fixture=release-test')
 const score=createPracticeLoopFixture()
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/print.chromatics',fileName:'print.chromatics',contents:encodeNativeProject(createNativeProject(score))})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(score));return structuredClone(score)
}
function open(){openStudioWorkspace('내보내기');const trigger=screen.getByRole('button',{name:'출력 설정 프리셋 관리'});act(()=>trigger.focus());fireEvent.click(trigger);return within(screen.getByRole('dialog',{name:'출력 설정 프리셋'}))}
async function saved(){openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalled());const calls=vi.mocked(window.inC.project.save).mock.calls;return decodeNativeProject(calls[calls.length-1][0].contents)}
function seed(){localStorage.setItem(key,JSON.stringify({version:1,profiles:[{id:'custom',name:'소수 설정',setup:custom}]}))}
it('keeps local snapshot writes outside history and preserves redo and music',async()=>{
 const source=await setup(),note=screen.getByRole('button',{name:`${source.parts[0].staves[0].measures[0].voices[0].events[0].id} 선택`});act(()=>note.focus());fireEvent.keyDown(note,{key:'ArrowUp',code:'ArrowUp'});const changed=structuredClone(playbackMockState.lastScore!);fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
 const d=open(),name=d.getByRole('textbox',{name:'새 출력 설정 이름'});fireEvent.change(name,{target:{value:'나의 출력'}});fireEvent.click(d.getByRole('button',{name:'현재 출력 설정 저장'}));fireEvent.click(d.getByRole('button',{name:'선택 프리셋 갱신'}));fireEvent.click(d.getByRole('button',{name:'선택 프리셋 적용'}));expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(changed);expect(JSON.parse(localStorage.getItem(key)!).profiles[0].name).toBe('나의 출력')
})
it('previews the existing rounded application of fractional profiles and applies once to the total score and supports exact undo/redo',async()=>{
 seed();const source=await setup(),d=open();expect(d.getByText(/적용할 값:/)).toHaveTextContent('여백 9 mm · 보표 88% · 시스템 간격 94%');expect(JSON.parse(localStorage.getItem(key)!).profiles[0].setup).toEqual(custom);fireEvent.click(d.getByRole('button',{name:'선택 프리셋 적용'}));const changed=structuredClone(playbackMockState.lastScore!);expect(changed).toEqual({...source,layout:{...source.layout,pageSetup:applied}});expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');expect(screen.queryByRole('dialog',{name:'출력 설정 프리셋'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'출력 설정 프리셋 관리'})).toHaveFocus()
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source);fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(changed)
 fireEvent.click(screen.getByRole('button',{name:'출력 설정 프리셋 관리'}));fireEvent.click(screen.getByRole('button',{name:'선택 프리셋 적용'}));expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
})
it('applies only to the selected part and preserves the total and neighboring part',async()=>{
 seed();const source=await setup();openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',source.parts[1].id)
 const d=open();expect(d.getByText(/파트보에 적용/)).toBeVisible();fireEvent.click(d.getByRole('button',{name:'선택 프리셋 적용'}));const changed=structuredClone(playbackMockState.lastScore!);expect(changed.parts).toEqual(source.parts);expect(changed.layout).toEqual(source.layout);const project=await saved();expect(project.partLayouts[0]).toMatchObject({partId:source.parts[1].id,layout:{pageSetup:applied}});expect(project.partLayouts).toHaveLength(1)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source);fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(changed)
 const calls=vi.mocked(window.inC.project.save).mock.calls.length;openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(calls+1));expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls.at(-1)![0].contents).partLayouts).toEqual(project.partLayouts)
})
it('keeps IME and dialog drafts out of project commands and cancels without a write',async()=>{
 const source=await setup(),d=open(),input=d.getByRole('textbox',{name:'새 출력 설정 이름'}),form=d.getByRole('form',{name:'현재 출력 설정 저장'})
 fireEvent.change(input,{target:{value:'한글 설정'}});fireEvent.compositionStart(input);fireEvent.submit(form);fireEvent.keyDown(input,{key:'Escape',isComposing:true});expect(screen.getByRole('dialog',{name:'출력 설정 프리셋'})).toBeVisible();expect(localStorage.getItem(key)).toBeNull();fireEvent.compositionEnd(input);fireEvent.submit(form);expect(JSON.parse(localStorage.getItem(key)!).profiles).toHaveLength(1)
 fireEvent.keyDown(input,{key:'s',code:'KeyS',ctrlKey:true});expect(window.inC.project.save).not.toHaveBeenCalled();expect(d.getByRole('alert')).toHaveTextContent('닫은 뒤');fireEvent.keyDown(input,{key:'Escape'});expect(screen.queryByRole('dialog',{name:'출력 설정 프리셋'})).not.toBeInTheDocument();expect(playbackMockState.lastScore).toEqual(source)
})
it('refuses to open over a pending page margin draft instead of capturing the old number',async()=>{
 const source=await setup();openStudioWorkspace('내보내기');const input=screen.getByRole('spinbutton',{name:'PDF 여백 mm'});act(()=>input.focus());fireEvent.change(input,{target:{value:'17'}});fireEvent.click(screen.getByRole('button',{name:'출력 설정 프리셋 관리'}));expect(screen.queryByRole('dialog',{name:'출력 설정 프리셋'})).not.toBeInTheDocument();expect(input).toHaveValue(17);await waitFor(()=>expect(input).toHaveFocus());expect(playbackMockState.lastScore).toEqual(source)
})
it('closes an old manager when an owned pending open replaces the document, without applying its profile',async()=>{
 seed();const source=await setup();let finish!:(value:{fileName:string;filePath:string;contents:string})=>void
 vi.mocked(window.inC.project.open).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));open();const second={...source,id:'second-print-score',title:'다른 악보'}
 await act(async()=>finish({fileName:'second.chromatics',filePath:'/fixture/second.chromatics',contents:encodeNativeProject(createNativeProject(second))}))
 await waitFor(()=>expect(playbackMockState.lastScore).toEqual(second));expect(screen.queryByRole('dialog',{name:'출력 설정 프리셋'})).not.toBeInTheDocument();expect(JSON.parse(localStorage.getItem(key)!).profiles[0].setup).toEqual(custom);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('reports a failed device write and keeps a session list after close/reopen',async()=>{
 const source=await setup(),d=open(),target=Object.getPrototypeOf(localStorage)===Storage.prototype?Storage.prototype:localStorage
 const spy=vi.spyOn(target,'setItem').mockImplementation(()=>{throw Error('owned quota')})
 try{fireEvent.change(d.getByRole('textbox',{name:'새 출력 설정 이름'}),{target:{value:'세션 출력'}});fireEvent.click(d.getByRole('button',{name:'현재 출력 설정 저장'}));expect(d.getByRole('alert')).toHaveTextContent('세션에서만');fireEvent.click(d.getByRole('button',{name:'프리셋 창 닫기'}));const reopened=open();expect(reopened.getByRole('combobox',{name:'저장한 출력 설정'})).toHaveTextContent('세션 출력');expect(playbackMockState.lastScore).toEqual(source)}finally{spy.mockRestore()}
})
