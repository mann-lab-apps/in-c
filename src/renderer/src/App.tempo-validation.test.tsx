// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { tempoSaveDraftFixture } from '../../testing/tempo-save-draft-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMusicXmlWithReport } from '../../musicxml'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
async function open(value=96) {
 window.history.replaceState({},'', '/?fixture=release-test')
 const source=structuredClone(tempoSaveDraftFixture('change').project);source.score.tempoEvents![0]!.bpm=value
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/tempo.chromatics',fileName:'tempo.chromatics',contents:encodeNativeProject(source)})
 vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/fixture/tempo.chromatics',fileName:'tempo.chromatics'})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(source.score))
 openStudioWorkspace('악보');return source
}
it.each(['0','999','96.5'])('rejects tempo %s without changing score/neighbor; valid correction has exactly one undo',async draft=>{
 const source=await open();const field=screen.getByRole('spinbutton',{name:'위치별 빠르기 BPM'});field.focus();fireEvent.change(field,{target:{value:draft}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
 expect(playbackMockState.lastScore).toEqual(source.score);expect(field).toHaveValue(Number(draft));expect(field).toHaveAttribute('aria-invalid','true')
 await act(async()=>fireEvent.keyDown(window,{key:'s',code:'KeyS',ctrlKey:true}));expect(window.inC.project.save).not.toHaveBeenCalled()
 fireEvent.change(field,{target:{value:'101'}});field.focus();fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
 const changed=structuredClone(playbackMockState.lastScore!);expect(changed.tempoEvents?.find(x=>x.id==='tempo-save-current')?.bpm).toBe(101)
 expect(changed.tempoEvents?.find(x=>x.id==='tempo-save-neighbor')).toEqual(source.score.tempoEvents![1])
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source.score)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(changed)
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
 expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(changed)
})
it('preserves imported out-of-authoring-range BPM on no-edit blur/save and Escape, including XML/MIDI',async()=>{
 const source=await open(360),field=screen.getByRole('spinbutton',{name:'위치별 빠르기 BPM'});field.focus();fireEvent.blur(field)
 expect(playbackMockState.lastScore).toEqual(source.score)
 fireEvent.change(field,{target:{value:'999'}});fireEvent.blur(field);fireEvent.keyDown(field,{key:'Escape'});expect(field).toHaveValue(360)
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
 const saved=decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
 expect(saved).toEqual(source);expect(serializeMusicXmlWithReport(saved.score).contents).toEqual(serializeMusicXmlWithReport(source.score).contents);expect(serializeMidi(saved.score)).toEqual(serializeMidi(source.score))
})
