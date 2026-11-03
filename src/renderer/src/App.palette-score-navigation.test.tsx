// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,fireEvent,render,screen,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {playbackMockState,registerAppTestHooks} from './App.test-harness'

registerAppTestHooks()
async function setup(kind:'event'|'tuplet'='event'){
 window.history.replaceState({},'', '/?fixture=release-test');const {App}=await import('./App');render(<App/>);const preview=screen.getByTestId('notation-preview')
 const entries=preview.getAttribute('data-all-event-pitches')!.split(',').map(v=>{const[partId,staffId,measureId,voiceId,eventId,pitch]=v.split(':');return{partId,staffId,measureId,voiceId,eventId,pitch}})
 let target:HTMLElement
 if(kind==='tuplet'){
  const rest=entries.filter(e=>e.pitch==='rest').at(-1)!;fireEvent.click(screen.getByRole('button',{name:`${rest.eventId} 선택`}));fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}));fireEvent.click(screen.getByRole('button',{name:/셋잇단음표 적용 또는 입력 준비/}));fireEvent.keyDown(window,{key:'c',code:'KeyC'});target=screen.getByLabelText('악보 캔버스');expect(document.querySelector('.editor-status')).toHaveTextContent('셋잇단음표 1/3')
 }else{
  const entry=entries[0]!;fireEvent.click(screen.getByRole('button',{name:`${entry.eventId} 선택`}));target=document.createElement('button');target.className='notation-event is-selected';Object.assign(target.dataset,entry);target.tabIndex=0;preview.append(target)
 }
 target.scrollIntoView=vi.fn();fireEvent.click(screen.getByRole('button',{name:'추가'}));fireEvent.click(screen.getByRole('menuitem',{name:'셈여림 팔레트'}));const origin=screen.getByRole('button',{name:'p 셈여림 적용'});act(()=>origin.focus());return{target,origin,preview,before:preview.getAttribute('data-all-event-pitches'),score:structuredClone(playbackMockState.lastScore!)}
}
it.each(['event','tuplet'] as const)('returns from the notation palette to %s with F6 and no command',async kind=>{
 const data=await setup(kind);fireEvent.keyDown(data.origin,{key:'F6',code:'F6'});expect(data.target).toHaveFocus();expect(data.target.scrollIntoView).toHaveBeenCalledOnce();expect(playbackMockState.lastScore).toEqual(data.score);expect(data.preview).toHaveAttribute('data-all-event-pitches',data.before!);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');if(kind==='tuplet')expect(document.querySelector('.editor-status')).toHaveTextContent('셋잇단음표 1/3');expect(window.inC.project.save).not.toHaveBeenCalled();expect(playbackMockState.play).not.toHaveBeenCalled()
})
it('retains composition and modified F6 ownership in the notation palette',async()=>{
 const data=await setup();for(const guard of [{isComposing:true},{keyCode:229},{ctrlKey:true},{metaKey:true},{altKey:true}]){fireEvent.keyDown(data.origin,{key:'F6',code:'F6',...guard});expect(data.origin).toHaveFocus()}expect(data.target.scrollIntoView).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(data.score);expect(window.inC.project.save).not.toHaveBeenCalled();expect(playbackMockState.play).not.toHaveBeenCalled()
})
it('keeps the palette search text field in its existing keyboard context',async()=>{
 const data=await setup(),search=screen.getByRole('searchbox',{name:'표기 기호 검색'});act(()=>search.focus());fireEvent.change(search,{target:{value:'p'}});fireEvent.keyDown(search,{key:'F6',code:'F6'});expect(search).toHaveFocus();expect(search).toHaveValue('p');expect(data.target.scrollIntoView).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(data.score);expect(window.inC.project.save).not.toHaveBeenCalled();expect(playbackMockState.play).not.toHaveBeenCalled()
})
it.each(['switcher','property-button','property-select'] as const)('returns from the shared dock %s through the same F6 action',async kind=>{
 const previousMedia=window.matchMedia
 if(kind==='switcher')Object.defineProperty(window,'matchMedia',{configurable:true,writable:true,value:vi.fn((query:string)=>({matches:query.includes('min-width: 761px'),media:query,onchange:null,addListener:vi.fn(),removeListener:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn(),dispatchEvent:()=>false}))})
 try{
  const data=await setup(),dock=kind==='switcher'?undefined:screen.getByRole('complementary',{name:'속성 도크'})
  const origin=kind==='switcher'?within(screen.getByRole('radiogroup',{name:'도크 보기'})).getByRole('radio',{name:'팔레트'}):kind==='property-button'?within(dock!).getByRole('button',{name:'페르마타'}):within(dock!).getByRole('combobox',{name:'선택 마디 셈여림'})
  act(()=>origin.focus());fireEvent.keyDown(origin,{key:'F6',code:'F6'});expect(data.target).toHaveFocus();expect(data.target.scrollIntoView).toHaveBeenCalledOnce();expect(playbackMockState.lastScore).toEqual(data.score);expect(data.preview).toHaveAttribute('data-all-event-pitches',data.before!);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(window.inC.project.save).not.toHaveBeenCalled();expect(playbackMockState.play).not.toHaveBeenCalled()
 }finally{if(kind==='switcher')Object.defineProperty(window,'matchMedia',{configurable:true,writable:true,value:previousMedia})}
})
it.each(['open-select','text-draft'] as const)('preserves the property %s keyboard context',async kind=>{
 const data=await setup(),dock=screen.getByRole('complementary',{name:'속성 도크'})
 const origin=kind==='open-select'?within(dock).getByRole('combobox',{name:'선택 마디 셈여림'}):within(dock).getByRole('textbox',{name:'선택 요약 코드'})
 act(()=>origin.focus());if(kind==='open-select'){fireEvent.click(origin);expect(origin).toHaveAttribute('aria-expanded','true')}else fireEvent.change(origin,{target:{value:'C7'}})
 fireEvent.keyDown(origin,{key:'F6',code:'F6'});expect(origin).toHaveFocus();if(kind==='open-select')expect(origin).toHaveAttribute('aria-expanded','true');else expect(origin).toHaveValue('C7');expect(data.target.scrollIntoView).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(data.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(window.inC.project.save).not.toHaveBeenCalled();expect(playbackMockState.play).not.toHaveBeenCalled()
})
