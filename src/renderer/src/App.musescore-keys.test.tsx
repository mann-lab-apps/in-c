// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createStudioEditingFixture} from '../../testing/studio-editing-fixture'
import {encodeNativeProject} from '../../project/schema'
import {pitchToMidi,resolveNotePitch,type Score,type Note} from '../../score-core'
import {openStudioWorkspace,registerAppTestHooks,playbackMockState} from './App.test-harness'
registerAppTestHooks()
const midi=(score:Score)=>{const m=score.parts[0].staves[0].measures[0],v=m.voices[0];return pitchToMidi(resolveNotePitch(m,v,v.events[0] as Note))}
async function open(){window.history.replaceState({},'', '/?fixture=release-test');const source=createStudioEditingFixture();vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/keys.chromatics',fileName:'keys.chromatics',contents:encodeNativeProject(source)});const{App}=await import('./App');render(<App />);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(source.score));return source.score}
it.each(['up','down','ctrl-octave','cmd-octave','diatonic-down'] as const)('MuseScore pitch shortcut %s edits a selected note and undoes exactly',async kind=>{
 const before=await open(),down=kind==='down'||kind==='diatonic-down',octave=kind.includes('octave')
 fireEvent.keyDown(window,{key:down?'ArrowDown':'ArrowUp',code:down?'ArrowDown':'ArrowUp',ctrlKey:kind==='ctrl-octave',metaKey:kind==='cmd-octave',altKey:kind==='diatonic-down',shiftKey:kind==='diatonic-down'})
 expect(midi(playbackMockState.lastScore!)).toBe(midi(before)+(kind==='diatonic-down'?-2:down?-1:octave?12:1))
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(before)
})
it('does not reinterpret unsupported chord-note selection or range extension as pitch edits',async()=>{
 const before=await open()
 fireEvent.keyDown(window,{key:'ArrowUp',code:'ArrowUp',ctrlKey:true,altKey:true})
 expect(playbackMockState.lastScore).toEqual(before)
 expect(screen.getByText('화음 안의 개별 구성음 선택은 현재 지원하지 않습니다.',{exact:false})).toBeInTheDocument()
 fireEvent.keyDown(window,{key:'ArrowDown',code:'ArrowDown',shiftKey:true})
 expect(playbackMockState.lastScore).toEqual(before)
})
it('Alt+Down navigates staff without changing pitch; IME and text fields keep their own arrows',async()=>{
 const before=await open();fireEvent.keyDown(window,{key:'ArrowDown',code:'ArrowDown',altKey:true})
 expect(playbackMockState.lastScore).toEqual(before)
 expect(screen.getByTestId('notation-preview')).not.toHaveAttribute('data-selected-event-id','editing-source')
 fireEvent.keyDown(window,{key:'ArrowUp',code:'ArrowUp',isComposing:true});expect(playbackMockState.lastScore).toEqual(before)
 fireEvent.click(screen.getByRole('button',{name:'악보 정보'}));fireEvent.click(screen.getByRole('button',{name:'악보 제목 편집'}));fireEvent.keyDown(screen.getByRole('textbox',{name:'악보 제목'}),{key:'ArrowUp',code:'ArrowUp'});expect(playbackMockState.lastScore).toEqual(before)
})
