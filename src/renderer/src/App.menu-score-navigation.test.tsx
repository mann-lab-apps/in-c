// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
async function setup(kind:'event'|'tuplet'='event'){
  window.history.replaceState({},'', '/?fixture=release-test');const {App}=await import('./App');render(<App/>);const preview=screen.getByTestId('notation-preview')
  const entries=preview.getAttribute('data-all-event-pitches')!.split(',').map(v=>{const[partId,staffId,measureId,voiceId,eventId,pitch]=v.split(':');return{partId,staffId,measureId,voiceId,eventId,pitch}})
  let target:HTMLElement
  if(kind==='tuplet'){
    const entry=entries.filter(e=>e.pitch==='rest').at(-1)!;fireEvent.click(screen.getByRole('button',{name:`${entry.eventId} 선택`}));fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}));fireEvent.click(screen.getByRole('button',{name:/셋잇단음표 적용 또는 입력 준비/}));fireEvent.keyDown(window,{key:'c',code:'KeyC'});target=screen.getByLabelText('악보 캔버스');expect(document.querySelector('.editor-status')).toHaveTextContent('셋잇단음표 1/3')
  }else{
    const entry=entries[0];fireEvent.click(screen.getByRole('button',{name:`${entry.eventId} 선택`}))
    // The mocked notation surface supplies only the real SVG focus contract.
    target=document.createElement('button');target.className='notation-event is-selected';Object.assign(target.dataset,entry);target.tabIndex=0;preview.append(target)
  }
  target.scrollIntoView=vi.fn();const trigger=screen.getByRole('button',{name:'편집'});act(()=>trigger.focus());return{preview,target,trigger,before:preview.getAttribute('data-all-event-pitches'),score:structuredClone(playbackMockState.lastScore!)}
}
it.each(['event','tuplet'] as const)('studio.menu-score-navigation F6 returns from a closed title to %s without commands',async kind=>{
  const {preview,target,trigger,before,score}=await setup(kind)
  expect(trigger).toHaveAttribute('aria-expanded','false');fireEvent.keyDown(trigger,{key:'F6',code:'F6'})
  expect(target).toHaveFocus();expect(target.scrollIntoView).toHaveBeenCalledOnce();expect(preview).toHaveAttribute('data-all-event-pitches',before);expect(playbackMockState.lastScore).toEqual(score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');if(kind==='tuplet')expect(document.querySelector('.editor-status')).toHaveTextContent('셋잇단음표 1/3')
  expect(window.inC.project.save).not.toHaveBeenCalled();expect(playbackMockState.play).not.toHaveBeenCalled()
})
it('studio.menu-score-navigation retains modified keys and composition ownership',async()=>{
  const {trigger,target,before,preview}=await setup()
  for(const guard of [{isComposing:true},{keyCode:229},{ctrlKey:true},{metaKey:true},{altKey:true}]){fireEvent.keyDown(trigger,{key:'F6',code:'F6',...guard});expect(trigger).toHaveFocus()}
  expect(target.scrollIntoView).not.toHaveBeenCalled();expect(preview).toHaveAttribute('data-all-event-pitches',before);expect(playbackMockState.play).not.toHaveBeenCalled()
})
it('studio.menu-score-navigation keeps an open menu in its own keyboard context',async()=>{
  const {trigger,target,before,preview}=await setup();fireEvent.click(trigger);const menu=screen.getByRole('menu'),item=menu.querySelector<HTMLButtonElement>('button:not(:disabled)')!;expect(item).not.toBeNull();act(()=>item.focus());fireEvent.keyDown(item,{key:'F6',code:'F6'});expect(item).toHaveFocus();expect(target.scrollIntoView).not.toHaveBeenCalled();expect(preview).toHaveAttribute('data-all-event-pitches',before);expect(playbackMockState.play).not.toHaveBeenCalled()
})
