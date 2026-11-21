// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { createStaffVisibilityFixture } from '../../testing/staff-visibility-fixture'
import { focusTestBody, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
afterEach(()=>document.getSelection()?.removeAllRanges())
async function setup() {
 window.history.replaceState({},'', '/?fixture=release-test')
 const xml=createStaffVisibilityFixture('hidden-second')
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'readable.musicxml',filePath:'/fixture/readable.musicxml',contents:xml})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일')
 fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=await screen.findByRole('region',{name:'MusicXML 경고 상세'}),technical=within(report).getByRole('button',{name:'기술 정보'})
 fireEvent.click(technical)
 const original=structuredClone(playbackMockState.lastScore!)
 fireEvent.keyDown(window,{key:'ArrowUp',code:'ArrowUp'})
 const copied=structuredClone(playbackMockState.lastScore!)
 expect(copied).not.toEqual(original)
 fireEvent.keyDown(window,{key:'c',code:'KeyC',ctrlKey:true})
 const target=copied.parts[0].staves[0].measures[1].voices[0].events[0]
 fireEvent.click(screen.getByRole('button',{name:target.id+' 선택'}))
 return {report,technical,original,copied,target,score:structuredClone(playbackMockState.lastScore!),preview:screen.getByTestId('notation-preview')}
}
function selectText(element:Element) {
 const selection=document.getSelection()!,range=document.createRange();range.selectNodeContents(element)
 selection.removeAllRanges();selection.addRange(range);expect(selection.toString()).not.toBe('')
 return selection
}
function key(target:Element,key:string,code:string,meta=false,shift=false) {
 const event=new KeyboardEvent('keydown',{key,code,bubbles:true,cancelable:true,ctrlKey:!meta,metaKey:meta,shiftKey:shift})
 fireEvent(target,event);return event
}
const cases=(['copy','cut','paste'] as const).flatMap(action=>(['button','body'] as const).flatMap(origin=>([false,true]).map(meta=>({action,origin,meta}))))
it.each(cases)('leaves $action / $origin / Meta=$meta to selected diagnostic text',async({action,origin,meta})=>{
 const state=await setup(),raw=state.report.querySelector('code')!
 if(origin==='button')act(()=>state.technical.focus());else focusTestBody()
 const selection=selectText(raw),before=selection.toString(),status=document.querySelector('.editor-status')!.textContent,selected=state.preview.getAttribute('data-selected-event-id')
 const event=key(origin==='button'?state.technical:document.body,{copy:'c',cut:'x',paste:'v'}[action],{copy:'KeyC',cut:'KeyX',paste:'KeyV'}[action],meta)
 expect(playbackMockState.lastScore).toEqual(state.score)
 expect(event.defaultPrevented).toBe(false)
 expect(selection.toString()).toBe(before);expect(document.querySelector('.editor-status')).toHaveTextContent(status!)
 expect(playbackMockState.lastScore).toEqual(state.score);expect(state.preview).toHaveAttribute('data-selected-event-id',selected!)
 expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
 expect(window.inC.project.save).not.toHaveBeenCalled();expect(window.inC.musicXml.save).not.toHaveBeenCalled()
})
it.each(['summary','status'] as const)('keeps selected %s text copy separate from score copy',async surface=>{
 const state=await setup(),text=surface==='summary'?state.report.querySelector('li > :is(p,span)')!:document.querySelector('.studio-status__result')!
 focusTestBody();selectText(text);const status=document.querySelector('.editor-status')!.textContent
 const event=key(document.body,'c','KeyC',true)
 expect(event.defaultPrevented).toBe(false);expect(document.querySelector('.editor-status')).toHaveTextContent(status!);expect(playbackMockState.lastScore).toEqual(state.score)
})
it.each(['collapsed','score-focus','hidden'] as const)('preserves the existing score copy for $scenario',async scenario=>{
 const state=await setup();act(()=>state.technical.focus());const selection=selectText(state.report.querySelector('code')!)
 let target:Element=state.technical
 if(scenario==='collapsed')selection.collapseToStart()
 else if(scenario==='hidden')fireEvent.click(state.technical)
 else{target=screen.getByRole('button',{name:state.target.id+' 선택'});act(()=>(target as HTMLElement).focus())}
 expect(key(target,'c','KeyC').defaultPrevented).toBe(true)
 expect(playbackMockState.lastScore).toEqual(state.score);expect(document.querySelector('.editor-status')).toHaveTextContent('개 이벤트를 복사했습니다.')
})
it.each([false,true])('retains document Save with a report text selection, Meta=%s',async meta=>{
 const state=await setup();act(()=>state.technical.focus());selectText(state.report.querySelector('code')!)
 expect(key(state.technical,'s','KeyS',meta).defaultPrevented).toBe(true)
 await waitFor(()=>expect(window.inC.musicXml.save).toHaveBeenCalledOnce());expect(playbackMockState.lastScore).toEqual(state.score)
})
it('keeps the existing manual text-copy scope',async()=>{
 const state=await setup();fireEvent.click(screen.getByRole('button',{name:'도움말'}));fireEvent.click(screen.getByRole('menuitem',{name:'사용설명서'}))
 const dialog=await screen.findByRole('dialog',{name:'띠로리 Studio 사용설명서'}),article=within(dialog).getByRole('article',{name:'사용설명서 본문'}),close=within(dialog).getByRole('button',{name:'닫기'})
 act(()=>close.focus());selectText(article.querySelector('p')!)
 expect(key(close,'c','KeyC').defaultPrevented).toBe(false);expect(playbackMockState.lastScore).toEqual(state.score)
})

it('keeps the prior score clipboard while copying diagnostic text',async()=>{
 const state=await setup();act(()=>state.technical.focus());selectText(state.report.querySelector('code')!)
 expect(key(state.technical,'c','KeyC').defaultPrevented).toBe(false)
 document.getSelection()!.removeAllRanges()
 const destination=screen.getByRole('button',{name:state.target.id+' 선택'});act(()=>destination.focus())
 fireEvent.keyDown(window,{key:'Delete',code:'Delete'})
 const cleared=structuredClone(playbackMockState.lastScore!)
 expect(cleared.parts[0].staves[0].measures[1].voices[0].events[0].type).toBe('rest')
 fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true})
 const copied=state.copied.parts[0].staves[0].measures[0].voices[0].events[0]
 if(copied.type!=='note')throw Error('Owned fixture note required')
 expect(playbackMockState.lastScore!.parts[0].staves[0].measures[1].voices[0].events[0]).toMatchObject({type:'note',pitch:copied.pitch})
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(cleared)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(state.score)
})
it('keeps configured score cut outside the selected-text reading context',async()=>{
 const state=await setup()
 fireEvent.click(screen.getByRole('button',{name:'편집'}));fireEvent.click(screen.getByRole('menuitem',{name:'단축키 설정…'}))
 fireEvent.click(screen.getByRole('combobox',{name:'단축키 명령'}));fireEvent.click(screen.getByRole('option',{name:'잘라내기'}))
 fireEvent.keyDown(screen.getByRole('textbox',{name:'새 단축키'}),{key:'D',code:'KeyD',ctrlKey:true,shiftKey:true})
 fireEvent.click(screen.getByRole('button',{name:'단축키 적용'}));fireEvent.click(screen.getByRole('button',{name:'설정 창 닫기'}))
 act(()=>state.technical.focus());selectText(state.report.querySelector('code')!)
 const status=document.querySelector('.editor-status')!.textContent
 expect(key(state.technical,'D','KeyD',false,true).defaultPrevented).toBe(false)
 expect(key(state.technical,'x','KeyX').defaultPrevented).toBe(false)
 expect(playbackMockState.lastScore).toEqual(state.score);expect(document.querySelector('.editor-status')).toHaveTextContent(status!)
 document.getSelection()!.removeAllRanges();const destination=screen.getByRole('button',{name:state.target.id+' 선택'});act(()=>destination.focus())
 expect(key(destination,'D','KeyD',false,true).defaultPrevented).toBe(true)
 expect(playbackMockState.lastScore).not.toEqual(state.score)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(state.score)
})
it('keeps a selected standalone file-error diagnostic out of score clipboard commands',async()=>{
 const state=await setup(),message='Owned PDF failure /fixture/output.pdf'
 vi.mocked(window.inC.pdf.save).mockRejectedValueOnce(new Error(message));openStudioWorkspace('내보내기')
 fireEvent.click(screen.getByRole('button',{name:'PDF 변환'}))
 const group=await screen.findByRole('group',{name:'PDF 출력 기술 정보'}),technical=within(group).getByRole('button',{name:'기술 정보'})
 fireEvent.click(technical);act(()=>technical.focus());selectText(within(group).getByText(message))
 expect(key(technical,'x','KeyX').defaultPrevented).toBe(false);expect(playbackMockState.lastScore).toEqual(state.score)
})
