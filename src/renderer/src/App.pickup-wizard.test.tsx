// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,within,waitFor} from '@testing-library/react'
import {it,expect} from 'vitest'
import {TICKS_PER_QUARTER} from '../../score-core'
import {registerAppTestHooks,playbackMockState} from './App.test-harness'
registerAppTestHooks()
it('creates an explicit first pickup from the real wizard and cancels without changing the old score',async()=>{
 const{App}=await import('./App');render(<App/>);const before=structuredClone(playbackMockState.lastScore)
 fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}));let d=within(screen.getByRole('dialog',{name:'새 악보 만들기'}))
 fireEvent.click(d.getByRole('checkbox',{name:'첫 마디를 못갖춘마디로 만들기'}))
 expect(d.getByRole('spinbutton',{name:'못갖춘마디 개수'})).toHaveValue(1)
 fireEvent.click(d.getByRole('button',{name:'취소'}));expect(playbackMockState.lastScore).toEqual(before)
 fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}));d=within(screen.getByRole('dialog',{name:'새 악보 만들기'}))
 fireEvent.click(d.getByRole('checkbox',{name:'첫 마디를 못갖춘마디로 만들기'}));fireEvent.click(d.getByRole('button',{name:'피아노 grand staff 템플릿'}))
 fireEvent.submit(d.getByRole('form',{name:'새 악보 만들기'}));await waitFor(()=>expect(screen.queryByRole('dialog',{name:'새 악보 만들기'})).not.toBeInTheDocument())
 expect(playbackMockState.lastScore!.parts[0].staves.map(s=>s.measures[0].timing)).toEqual([{type:'pickup',durationTicks:TICKS_PER_QUARTER/2},{type:'pickup',durationTicks:TICKS_PER_QUARTER/2}])
 const empty=structuredClone(playbackMockState.lastScore!)
 fireEvent.keyDown(window,{key:'n',code:'KeyN'});fireEvent.keyDown(window,{key:'4',code:'Digit4'});fireEvent.keyDown(window,{key:'c',code:'KeyC'})
 expect(playbackMockState.lastScore!.parts[0].staves[0].measures[0].voices[0].events[0]).toMatchObject({type:'note',duration:{value:'eighth'}})
 const entered=structuredClone(playbackMockState.lastScore!)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(empty)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(entered)

})
it('keeps invalid pickup drafts local and protects IME before creation',async()=>{
 const{App}=await import('./App');render(<App/>);const before=structuredClone(playbackMockState.lastScore)
 fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}));const d=within(screen.getByRole('dialog',{name:'새 악보 만들기'}));fireEvent.click(d.getByRole('checkbox',{name:'첫 마디를 못갖춘마디로 만들기'}))
 const f=d.getByRole('spinbutton',{name:'못갖춘마디 개수'}),form=d.getByRole('form',{name:'새 악보 만들기'})
 for(const value of ['0','-1','1.5','','8','999']){fireEvent.change(f,{target:{value}});fireEvent.submit(form);expect(f).toHaveAttribute('aria-invalid','true');expect(playbackMockState.lastScore).toEqual(before)}
 fireEvent.change(f,{target:{value:'2'}});fireEvent.compositionStart(f);fireEvent.submit(form);expect(playbackMockState.lastScore).toEqual(before);fireEvent.compositionEnd(f)
 fireEvent.click(d.getByRole('checkbox',{name:'첫 마디를 못갖춘마디로 만들기'}));fireEvent.submit(form)
 expect(playbackMockState.lastScore!.parts[0].staves[0].measures[0].timing).toEqual({type:'regular'})
})
