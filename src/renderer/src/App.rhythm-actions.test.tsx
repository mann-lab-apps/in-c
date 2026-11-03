// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen,waitFor,within } from '@testing-library/react'
import { expect,it,vi } from 'vitest'
import { createStudioEditingFixture } from '../../testing/studio-editing-fixture'
import {encodeNativeProject,decodeNativeProject} from '../../project/schema'
import {serializeMusicXml,parseMusicXml} from '../../musicxml'
import {serializeMidi} from './midi/serialize-midi'
import {registerAppTestHooks,playbackMockState,openStudioWorkspace} from './App.test-harness'
registerAppTestHooks()
async function open(){window.history.replaceState({},'', '/?fixture=release-test');const source=createStudioEditingFixture();vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/edit.chromatics',fileName:'edit.chromatics',contents:encodeNativeProject(source)});const {App}=await import('./App');render(<App />);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(source.score));return source}
it('grace conversion is visible, zero-duration and reversible, and preserves native/XML/MIDI contracts',async()=>{
 const source=await open();const before=encodeNativeProject(source)
 const button=screen.getByRole('button',{name:'꾸밈음으로 변환, 단축키 Alt+Shift+G'});expect(button).toBeVisible();expect(button).toBeEnabled();fireEvent.click(button)
 const next=playbackMockState.lastScore!,voice=next.parts[0].staves[0].measures[0].voices[0]
 expect(voice.events[0]).toMatchObject({id:'editing-host',position:{tick:0},graceNotes:[{pitch:{step:'F',octave:4,alter:1},slash:true}]})
 expect(voice.events.at(-1)).toMatchObject({type:'rest'})
 expect(serializeMidi(parseMusicXml(serializeMusicXml(next)))).toEqual(serializeMidi(next))
 expect(decodeNativeProject(encodeNativeProject({...source,score:next})).score).toEqual(next)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source.score)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(next)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source.score)
 fireEvent.keyDown(window,{key:'g',code:'KeyG',altKey:true,shiftKey:true})
 const repeated=playbackMockState.lastScore!.parts[0].staves[0].measures[0].voices[0].events
 expect(repeated.slice(0,-1)).toEqual(voice.events.slice(0,-1))
 expect(repeated.at(-1)).toMatchObject({type:'rest',duration:voice.events.at(-1)!.duration,position:voice.events.at(-1)!.position})
 expect(encodeNativeProject(source)).toBe(before)
})
it('duration growth confirms overwrite, cancel preserves score and one undo restores every note',async()=>{
 const source=await open()
 const grow=()=>fireEvent.click(screen.getByRole('button',{name:'2분음표, 단축키 6'}))
 grow();const first=screen.getByRole('dialog',{name:'뒤 음표를 덮어쓸까요?'})
 expect(playbackMockState.lastScore).toEqual(source.score)
 fireEvent.click(within(first).getByRole('button',{name:'취소'}));expect(playbackMockState.lastScore).toEqual(source.score)
 grow();fireEvent.click(within(screen.getByRole('dialog',{name:'뒤 음표를 덮어쓸까요?'})).getByRole('button',{name:'덮어쓰고 음가 늘리기'}))
 const next=playbackMockState.lastScore!,voice=next.parts[0].staves[0].measures[0].voices[0]
 expect(voice.events[0]).toMatchObject({id:'editing-source',duration:{value:'half'}})
 expect(voice.events.find(n=>n.id==='editing-host')).toBeUndefined()
 expect(voice.events.find(n=>n.id==='editing-third')?.position).toEqual(source.score.parts[0].staves[0].measures[0].voices[0].events[2].position)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source.score)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(next)
 expect(serializeMidi(parseMusicXml(serializeMusicXml(next)))).toEqual(serializeMidi(next))
})
