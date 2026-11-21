// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { serializeMusicXml } from '../../musicxml'
import { focusTestBody, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each((['newest-first','oldest-first','older-while-pending','latest-already-focused'] as const).flatMap(order=>(['success','cancel','failure'] as const).map(outcome=>({order,outcome}))))('keeps latest connected copy trigger after $order / older PDF $outcome',async({order,outcome})=>{
 window.history.replaceState({},'', '/?fixture=release-test')
 let endPdf!:(v:{fileName:string}|null)=>void,failPdf!:(e:Error)=>void,endXml!:(v:null)=>void
 vi.mocked(window.inC.pdf.save).mockImplementationOnce(()=>new Promise((resolve,reject)=>{endPdf=resolve;failPdf=reject}))
 vi.mocked(window.inC.musicXml.exportCopy).mockImplementationOnce(()=>new Promise(resolve=>{endXml=resolve}))
 const {App}=await import('./App');render(<App/>);fireEvent.keyDown(window,{key:'d',code:'KeyD'})
 const score=structuredClone(playbackMockState.lastScore!),preview=screen.getByTestId('notation-preview'),selected=preview.getAttribute('data-selected-event-id')
 openStudioWorkspace('내보내기');const older=screen.getByRole('button',{name:'PDF 변환'}),latest=screen.getByRole('button',{name:'MusicXML 내보내기'})
 act(()=>older.focus());fireEvent.click(older);await waitFor(()=>expect(window.inC.pdf.save).toHaveBeenCalledOnce())
 act(()=>latest.focus());fireEvent.click(latest);await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
 expect(latest).toBeDisabled();expect(older.isConnected).toBe(true)
 // Chromium blurs the disabled latest button. This adapter models that DOM
 // state only; native OS activation and PDF rendering remain separate gates.
 focusTestBody()
 const settlePdf=()=>outcome==='failure'?failPdf(new Error('owned old PDF failure')):endPdf(outcome==='cancel'?null:{fileName:'older.pdf'})
 if(order==='older-while-pending') {
  await act(async()=>settlePdf())
  expect(document.body).toHaveFocus();expect(older).not.toHaveFocus();expect(latest).toBeDisabled()
  await act(async()=>endXml(null))
 } else if(order==='latest-already-focused') {
  await act(async()=>endXml(null));await waitFor(()=>expect(latest).toHaveFocus())
  await act(async()=>settlePdf())
 } else {
  await act(async()=>{if(order==='newest-first'){endXml(null);settlePdf()}else{settlePdf();endXml(null)}})
 }
 await waitFor(()=>expect(latest).toBeEnabled());await waitFor(()=>expect(latest).toHaveFocus())
 expect(older).not.toHaveFocus();expect(older.isConnected).toBe(true)
 expect(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents).toBe(serializeMusicXml(score))
 expect(playbackMockState.lastScore).toEqual(score);expect(preview).toHaveAttribute('data-selected-event-id',selected!)
 expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
 expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
 expect(window.inC.project.save).not.toHaveBeenCalled();expect(window.inC.autosave.clear).not.toHaveBeenCalled()
})
