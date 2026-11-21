// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { decodeNativeProject } from '../../project/schema'
import { focusTestBody, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

const cases = (['native-accepted', 'native-refused', 'xml-accepted'] as const).flatMap(entry => {
 const phases = entry === 'native-refused' ? ['pending'] as const : ['pending', 'cancelled', 'failed'] as const
 return (['success', 'cancel', 'failure'] as const).flatMap(outcome => phases.map(phase => ({entry, outcome, phase})))
})
it.each(cases)('keeps newer $entry / $phase intent while older save finishes with $outcome',async({entry,outcome,phase})=>{
 window.history.replaceState({},'', '/?fixture=release-test')
 vi.spyOn(window,'confirm').mockReturnValue(entry!=='native-refused')
 let endSave!:(v:{filePath:string;fileName:string}|null)=>void,failSave!:(e:Error)=>void,endOpen!:(v:null)=>void,failOpen!:(e:Error)=>void
 vi.mocked(window.inC.project.save).mockImplementationOnce(()=>new Promise((resolve,reject)=>{endSave=resolve;failSave=reject}))
 const bridge=entry==='xml-accepted'?vi.mocked(window.inC.musicXml.open):vi.mocked(window.inC.project.open)
 bridge.mockImplementationOnce(()=>new Promise((resolve,reject)=>{endOpen=resolve;failOpen=reject}))
 const {App}=await import('./App');render(<App/>)
 const original=structuredClone(playbackMockState.lastScore!)
 fireEvent.keyDown(window,{key:'d',code:'KeyD'})
 const score=structuredClone(playbackMockState.lastScore!),preview=screen.getByTestId('notation-preview'),selected=preview.getAttribute('data-selected-event-id')
 openStudioWorkspace('파일');const older=screen.getByRole('button',{name:'프로젝트 저장'}),latest=screen.getByRole('button',{name:entry==='xml-accepted'?'MusicXML 가져오기':'프로젝트 열기'})
 act(()=>older.focus());fireEvent.click(older);await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
 expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
 act(()=>latest.focus());fireEvent.click(latest)
 if(entry==='native-refused'){expect(bridge).not.toHaveBeenCalled();expect(latest).toBeEnabled()}
 else{await waitFor(()=>expect(bridge).toHaveBeenCalledOnce());expect(latest).toBeDisabled()}
 expect(older.isConnected).toBe(true)
 // Model the DOM body-focus state after disabled/native-confirm controls;
 // this is a unit adapter, not proof of OS activation or real picker input.
 focusTestBody()
 if(entry!=='native-refused' && phase!=='pending') {
  await act(async()=>{if(phase==='failed')failOpen(new Error('owned newer open failure'));else endOpen(null)})
  await waitFor(()=>expect(latest).toBeEnabled())
 }
 await act(async()=>{if(outcome==='failure')failSave(new Error('owned old save failure'));else endSave(outcome==='cancel'?null:{filePath:'/fixture/older.chromatics',fileName:'older.chromatics'})})
 await waitFor(()=>expect(older).toBeEnabled())
 if(entry==='native-refused')await waitFor(()=>expect(older).toHaveFocus())
 else{expect(document.body).toHaveFocus();expect(older).not.toHaveFocus();if(phase==='pending')expect(latest).toBeDisabled();else expect(latest).toBeEnabled()}
 expect(playbackMockState.lastScore).toEqual(score);expect(preview).toHaveAttribute('data-selected-event-id',selected!)
 expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
 expect(document.querySelector('.studio-document__state')).toHaveTextContent(outcome==='success'?'변경 없음':'저장하지 않은 변경')
 if(entry!=='native-refused' && phase==='pending'){await act(async()=>endOpen(null));await waitFor(()=>expect(latest).toBeEnabled())}
 expect(playbackMockState.lastScore).toEqual(score);expect(window.inC.project.save).toHaveBeenCalledOnce()
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(original)
 fireEvent.keyDown(window,{key:'y',code:'KeyY',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
})
