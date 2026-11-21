// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {createStaffVisibilityFixture} from '../../testing/staff-visibility-fixture'
import {focusTestBody,openStudioWorkspace,playbackMockState,registerAppTestHooks} from './App.test-harness'
registerAppTestHooks()
afterEach(()=>document.getSelection()?.removeAllRanges())
async function setup(){
 window.history.replaceState({},'','/?fixture=release-test')
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'reading.musicxml',filePath:'/fixture/reading.musicxml',contents:createStaffVisibilityFixture('hidden-second')})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=await screen.findByRole('region',{name:'MusicXML 경고 상세'}),reportButton=within(report).getByRole('button',{name:'기술 정보'});fireEvent.click(reportButton)
 const original=structuredClone(playbackMockState.lastScore!);fireEvent.keyDown(window,{key:'ArrowUp',code:'ArrowUp'});const score=structuredClone(playbackMockState.lastScore!);expect(score).not.toEqual(original)
 vi.mocked(window.inC.project.open).mockRejectedValueOnce(new Error('Owned Native read failure /fixture/read.chromatics'))
 fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));const group=await screen.findByRole('group',{name:'프로젝트 열기 기술 정보'}),operationButton=within(group).getByRole('button',{name:'기술 정보'});fireEvent.click(operationButton)
 const selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')!
 return{report,reportButton,group,operationButton,original,score,selected}
}
function select(n:Element){const range=document.createRange();range.selectNodeContents(n);const s=document.getSelection()!;s.removeAllRanges();s.addRange(range);expect(s.toString()).not.toBe('');return s.toString()}
function press(target:Element,key:string,extra:KeyboardEventInit={}){const e=new KeyboardEvent('keydown',{key,code:key,...extra,bubbles:true,cancelable:true});fireEvent(target,e);return e}
function assertSame(s:Awaited<ReturnType<typeof setup>>){expect(playbackMockState.lastScore).toEqual(s.score);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',s.selected);expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경');expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');expect(window.inC.project.save).not.toHaveBeenCalled()}
const navigationKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']
it.each(navigationKeys)('leaves selected file-result %s navigation to its browser owner', async key => {
 const s = await setup()
 for (const modifiers of [{}, {ctrlKey:true}, {metaKey:true}, {altKey:true}, {shiftKey:true}]) {
  focusTestBody()
  const text = select(document.querySelector('.studio-status__result')!)
  const status = document.querySelector('.editor-status')!.textContent
  expect(press(document.body, key, modifiers).defaultPrevented).toBe(false)
  assertSame(s)
  expect(document.getSelection()!.toString()).toBe(text)
  expect(document.querySelector('.editor-status')).toHaveTextContent(status!)
 }
})
it.each(['ArrowUp', 'ArrowDown'])('retains explicit score %s with a lingering diagnostic Range and one undo', async key => {
 const s = await setup(), destination = screen.getByRole('button', {name:s.selected+' 선택'})
 act(()=>destination.focus())
 select(document.querySelector('.studio-status__result')!)
 expect(press(destination, key).defaultPrevented).toBe(true)
 expect(playbackMockState.lastScore).not.toEqual(s.score)
 expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
 fireEvent.keyDown(window, {key:'z', code:'KeyZ', ctrlKey:true})
 expect(playbackMockState.lastScore).toEqual(s.score)
})
it.each(['ArrowUp', 'ArrowDown'])('retains body %s when diagnostic text selection has collapsed', async key => {
 const s = await setup()
 focusTestBody()
 select(document.querySelector('.studio-status__result')!)
 document.getSelection()!.collapseToStart()
 expect(press(document.body, key).defaultPrevented).toBe(true)
 expect(playbackMockState.lastScore).not.toEqual(s.score)
 fireEvent.keyDown(window, {key:'z', code:'KeyZ', ctrlKey:true})
 expect(playbackMockState.lastScore).toEqual(s.score)
})
