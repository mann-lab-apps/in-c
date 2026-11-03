// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { registerAppTestHooks, openStudioWorkspace, playbackMockState } from './App.test-harness'
import { createPrintHeaderFixture } from '../../testing/print-header-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'

describe('backup restore ownership after dialog replacement',()=>{
 registerAppTestHooks()
 it.each(['success','failure'] as const)('keeps the newer same-id restore pending after canceled %s',async outcome=>{
  window.history.replaceState({},'','/?fixture=release-test')
  const stale=createPrintHeaderFixture('short'),fresh=structuredClone(stale);stale.score.title='Canceled backup';fresh.score.title='Current backup'
  vi.mocked(window.inC.project.listBackups).mockResolvedValue([{id:'same-id',fileName:'same.chromatics',title:'Same listed backup',updatedAt:''}])
  let finishA!:(value:{contents:string})=>void,failA!:(error:Error)=>void,finishB!:(value:{contents:string})=>void
  vi.mocked(window.inC.project.readBackup).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finishA=resolve;failA=reject})).mockImplementationOnce(()=>new Promise(resolve=>{finishB=resolve}))
  const {App}=await import('./App');render(<App />)
  fireEvent.keyDown(window,{code:'ArrowUp',key:'ArrowUp',altKey:true,shiftKey:true})
  const baseline=structuredClone(playbackMockState.lastScore),selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
  openStudioWorkspace('파일');const trigger=screen.getByRole('button',{name:'프로젝트 백업'})
  fireEvent.click(trigger)
  const first=screen.getByRole('dialog',{name:'프로젝트 백업'})
  fireEvent.click(await within(first).findByRole('button',{name:'Same listed backup 복구'}))
  expect(window.inC.project.readBackup).toHaveBeenCalledOnce()
  fireEvent.keyDown(first,{key:'Escape'})
  fireEvent.click(trigger)
  const second=screen.getByRole('dialog',{name:'프로젝트 백업'})
  expect(second).not.toBe(first)
  const restore=await within(second).findByRole('button',{name:'Same listed backup 복구'})
  fireEvent.click(restore);expect(window.inC.project.readBackup).toHaveBeenCalledTimes(2)
  await act(async()=>{if(outcome==='success')finishA({contents:encodeNativeProject(stale)});else failA(new Error('Canceled old backup failure'))})
  expect(second).toBeInTheDocument();expect(restore).toBeDisabled()
  expect(within(second).getByText('복구 파일을 불러오는 중입니다. 닫으면 복구를 취소합니다.')).toBeVisible()
  expect(within(second).queryByRole('alert')).not.toBeInTheDocument()
  expect(playbackMockState.lastScore).toEqual(baseline)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selection)
  expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
  fireEvent.click(restore);expect(window.inC.project.readBackup).toHaveBeenCalledTimes(2)
  await act(async()=>finishB({contents:encodeNativeProject(fresh)}))
  expect(screen.queryByRole('dialog',{name:'프로젝트 백업'})).not.toBeInTheDocument()
  expect(playbackMockState.lastScore).toEqual(fresh.score)
  expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
  fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(fresh.score)
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
  await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(fresh)
 })
})
