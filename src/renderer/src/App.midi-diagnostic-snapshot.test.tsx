// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMidiWarningScore } from '../../testing/midi-warning-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMusicXml } from '../../musicxml'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

// Resolve the current public surface after workspace/document remounts; never cache old fields.
const hvFileTools = () => within(screen.getByRole('region', { name: '파일 및 선택 도구' }))
const hvExportTools = () => within(screen.getByRole('region', { name: '내보내기 작업' }))

registerAppTestHooks()

async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const original = createMidiWarningScore('percussion')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath:'/fixture/diagnostics.chromatics',fileName:'diagnostics.chromatics',contents:encodeNativeProject(createNativeProject(original)) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(hvFileTools().getByRole('button',{name:'프로젝트 열기'}))
  await waitFor(()=>expect(playbackMockState.lastScore).toEqual(original))
  fireEvent.click(screen.getByRole('button',{name:'악보 제목 수정'}))
  fireEvent.change(screen.getByRole('textbox', { name: '악보 제목' }),{target:{value:'진단 결과 소유권'}})
  fireEvent.keyDown(screen.getByRole('textbox', { name: '악보 제목' }),{key:'Enter'})
  const score=structuredClone(playbackMockState.lastScore!), xml=serializeMusicXml(score)
  expect(score).toEqual({...original,title:'진단 결과 소유권'})
  const selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-address'),dirty=document.querySelector('.studio-document__state')!.textContent
  openStudioWorkspace('내보내기')
  const save=async()=>{await act(async()=>fireEvent.click(hvExportTools().getByRole('button',{name:'MIDI 내보내기'})))}
  const preserve=async()=>{
    expect(playbackMockState.lastScore).toEqual(score);expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(xml)
    expect(document.querySelector('.studio-document__state')!.textContent).toBe(dirty)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',selected!)
    expect(vi.mocked(window.inC.midi.save).mock.calls.every(([request])=>JSON.stringify(request.contents)===JSON.stringify(Array.from(serializeMidi(score))))).toBe(true)
    openStudioWorkspace('파일');fireEvent.click(hvFileTools().getByRole('button',{name:'프로젝트 저장'}))
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(original)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(score)
  }
  return {save,preserve,original,score}
}

it.each(['same-name','different-name'] as const)('starts a fresh MIDI warning snapshot collapsed after %s success',async name=>{
  const {save,preserve}=await setup(),fileName=name==='same-name'?'first.mid':'second.mid'
  vi.mocked(window.inC.midi.save).mockResolvedValueOnce({fileName:'first.mid'}).mockResolvedValueOnce({fileName})
  await save();const first=within(await screen.findByRole('region',{name:'MIDI 경고 상세'}))
  fireEvent.click(first.getByRole('button',{name:'기술 정보'}));expect(first.getByRole('button',{name:'기술 정보'})).toHaveAttribute('aria-expanded','true')
  expect(first.getByText('part[2].staff[1].measure[1].clef')).toBeVisible()
  await save();expect(window.inC.midi.save).toHaveBeenCalledTimes(2)
  const current=within(screen.getByRole('region',{name:'MIDI 경고 상세'}));expect(current.getByText(fileName)).toBeVisible()
  expect(current.getByRole('button',{name:'기술 정보'})).toHaveAttribute('aria-expanded','false')
  expect(current.getByText('part[2].staff[1].measure[1].clef')).not.toBeVisible()
  fireEvent.click(current.getByRole('button',{name:'기술 정보'}));expect(current.getByText('part[2].staff[1].measure[1].clef')).toBeVisible()
  await preserve()
})

it.each(['same-error','different-error'] as const)('starts a fresh MIDI failure snapshot collapsed after %s retry',async kind=>{
  const {save,preserve}=await setup(),firstRaw='First private MIDI path /fixture/first.mid',nextRaw=kind==='same-error'?firstRaw:'Second private MIDI path /fixture/second.mid'
  vi.mocked(window.inC.midi.save).mockRejectedValueOnce(new Error(firstRaw)).mockRejectedValueOnce(new Error(nextRaw))
  await save();const first=within(await screen.findByRole('region',{name:'MIDI 오류 상세'}))
  expect(first.getByText(firstRaw)).not.toBeVisible();fireEvent.click(first.getByRole('button',{name:'기술 정보'}));expect(first.getByText(firstRaw)).toBeVisible()
  await save();expect(window.inC.midi.save).toHaveBeenCalledTimes(2)
  const current=within(screen.getByRole('region',{name:'MIDI 오류 상세'}))
  expect(current.getByRole('button',{name:'기술 정보'})).toHaveAttribute('aria-expanded','false');expect(current.getByText(nextRaw)).not.toBeVisible()
  fireEvent.click(current.getByRole('button',{name:'기술 정보'}));expect(current.getByText(nextRaw)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(nextRaw)
  await preserve()
})

it('keeps the accepted MIDI warning disclosure through a pending request and cancellation',async()=>{
  const {save,preserve}=await setup();vi.mocked(window.inC.midi.save).mockResolvedValueOnce({fileName:'accepted.mid'})
  await save();const prior=within(screen.getByRole('region',{name:'MIDI 경고 상세'}));fireEvent.click(prior.getByRole('button',{name:'기술 정보'}))
  let finish!:(value:null)=>void
  vi.mocked(window.inC.midi.save).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
  await save();expect(window.inC.midi.save).toHaveBeenCalledTimes(2)
  expect(prior.getByRole('button',{name:'기술 정보'})).toHaveAttribute('aria-expanded','true')
  await act(async()=>finish(null))
  expect(prior.getByText('accepted.mid')).toBeVisible();expect(prior.getByRole('button',{name:'기술 정보'})).toHaveAttribute('aria-expanded','true')
  await preserve()
})

it('keeps the accepted warning disclosure through unrelated document edits and exact undo/redo',async()=>{
  const {save,preserve,original,score}=await setup();vi.mocked(window.inC.midi.save).mockResolvedValueOnce({fileName:'accepted.mid'})
  await save();const prior=within(screen.getByRole('region',{name:'MIDI 경고 상세'}));fireEvent.click(prior.getByRole('button',{name:'기술 정보'}))
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(original)
  expect(prior.getByRole('button',{name:'기술 정보'})).toHaveAttribute('aria-expanded','true')
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(score)
  expect(prior.getByText('accepted.mid')).toBeVisible();expect(prior.getByRole('button',{name:'기술 정보'})).toHaveAttribute('aria-expanded','true')
  await preserve()
})
