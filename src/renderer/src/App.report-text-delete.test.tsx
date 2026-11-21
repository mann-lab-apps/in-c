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
const readingCases=(['report','primary','operation']as const).flatMap(surface=>['Delete','Backspace'].map(key=>({surface,key})))
it.each(readingCases)('keeps $key with selected $surface text instead of deleting the score',async({surface,key})=>{
 const s=await setup();const target=surface==='primary'?document.body:surface==='report'?s.reportButton:s.operationButton
 if(target===document.body)focusTestBody();else act(()=>(target as HTMLElement).focus())
 const node=surface==='primary'?document.querySelector('.studio-status__result')!:surface==='report'?s.report.querySelector('code')!:within(s.group).getByText('Owned Native read failure /fixture/read.chromatics');const text=select(node),status=document.querySelector('.editor-status')!.textContent
 expect(press(target,key).defaultPrevented).toBe(false);assertSame(s);expect(document.getSelection()!.toString()).toBe(text);expect(document.querySelector('.editor-status')).toHaveTextContent(status!)
})
it.each(['Delete','Backspace'])('retains %s on an explicit score destination despite a lingering report Range',async key=>{
 const s=await setup(),destination=screen.getByRole('button',{name:s.selected+' 선택'});act(()=>destination.focus());select(s.report.querySelector('code')!)
 expect(press(destination,key).defaultPrevented).toBe(true);expect(playbackMockState.lastScore).not.toEqual(s.score);expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(s.score)
})
it.each(['Delete','Backspace'])('retains %s when the reading selection has collapsed',async key=>{
 const s=await setup();focusTestBody();select(s.report.querySelector('code')!);document.getSelection()!.collapseToStart()
 expect(press(document.body,key).defaultPrevented).toBe(true);expect(playbackMockState.lastScore).not.toEqual(s.score)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(s.score)
})
it('honors a configured delete key in the reader and the explicit score context',async()=>{
 const s=await setup();fireEvent.click(screen.getByRole('button',{name:'편집'}));fireEvent.click(screen.getByRole('menuitem',{name:'단축키 설정…'}))
 fireEvent.click(screen.getByRole('combobox',{name:'단축키 명령'}));fireEvent.click(screen.getByRole('option',{name:'삭제'}));fireEvent.keyDown(screen.getByRole('textbox',{name:'새 단축키'}),{key:'D',code:'KeyD',ctrlKey:true,shiftKey:true});fireEvent.click(screen.getByRole('button',{name:'단축키 적용'}));fireEvent.click(screen.getByRole('button',{name:'설정 창 닫기'}))
 act(()=>s.operationButton.focus());select(within(s.group).getByText('Owned Native read failure /fixture/read.chromatics'));expect(press(s.operationButton,'D',{code:'KeyD',ctrlKey:true,shiftKey:true}).defaultPrevented).toBe(false);assertSame(s)
 const destination=screen.getByRole('button',{name:s.selected+' 선택'});act(()=>destination.focus());select(s.report.querySelector('code')!);expect(press(destination,'D',{code:'KeyD',ctrlKey:true,shiftKey:true}).defaultPrevented).toBe(true);expect(playbackMockState.lastScore).not.toEqual(s.score);fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(s.score)
})
it('retains document Save and history while diagnostic text is selected',async()=>{
 const s=await setup();act(()=>s.operationButton.focus());select(within(s.group).getByText('Owned Native read failure /fixture/read.chromatics'))
 expect(press(s.operationButton,'s',{code:'KeyS',ctrlKey:true}).defaultPrevented).toBe(true);await waitFor(()=>expect(window.inC.musicXml.save).toHaveBeenCalledOnce());expect(playbackMockState.lastScore).toEqual(s.score)
 focusTestBody();select(document.querySelector('.studio-status__result')!);expect(press(document.body,'z',{code:'KeyZ',ctrlKey:true}).defaultPrevented).toBe(true);expect(playbackMockState.lastScore).toEqual(s.original);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
