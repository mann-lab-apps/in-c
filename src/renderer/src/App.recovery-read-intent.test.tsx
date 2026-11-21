// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { registerAppTestHooks, openStudioWorkspace, playbackMockState } from './App.test-harness'
import { createPartSpanResetFixture } from '../../testing/part-span-reset-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMusicXml } from '../../musicxml'
registerAppTestHooks()

async function setup() {
  window.history.replaceState({}, '', '/')
  const recovered=createPartSpanResetFixture(); recovered.score.title='Chosen recovery'
  vi.mocked(window.inC.autosave.read).mockResolvedValue({score:recovered.score,project:recovered,metadata:{title:recovered.score.title,updatedAt:'2026-11-09T00:00:00Z',version:'test'}})
  return recovered
}
async function save(expected: ReturnType<typeof createPartSpanResetFixture>) {
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
  await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(expected)
}
it.each((['native','xml'] as const).flatMap(format=>(['success','failure'] as const).map(outcome=>({format,outcome}))))('recovery owns busy state and a later Native read before stale $format $outcome',async({format,outcome})=>{
  const recovered=await setup(),older=structuredClone(recovered),fresh=structuredClone(recovered);older.score.title='Obsolete recent document';fresh.score.title='Later explicit document'
  const entry={filePath:'/owned/older.'+(format==='native'?'chromatics':'musicxml'),fileName:'older.'+(format==='native'?'chromatics':'musicxml'),openedAt:'2026-11-09',...(format==='native'?{format:'native' as const}:{})}
  vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([entry])
  let finishOld!:(value:{filePath:string;fileName:string;contents:string})=>void,failOld!:(error:Error)=>void,finishNew!:(value:{filePath:string;fileName:string;contents:string})=>void
  vi.mocked(window.inC.recentMusicXml.open).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finishOld=resolve;failOld=reject}))
  vi.mocked(window.inC.project.open).mockImplementationOnce(()=>new Promise(resolve=>{finishNew=resolve}))
  const {App}=await import('./App');render(<App />)
  const recovery=await screen.findByRole('button',{name:'복구본 열기'});await waitFor(()=>expect(recovery).toBeEnabled())
  fireEvent.click(await screen.findByRole('button',{name:new RegExp(entry.fileName.replaceAll('.','\\.'))}))
  expect(window.inC.recentMusicXml.open).toHaveBeenCalledOnce()
  fireEvent.click(recovery);expect(playbackMockState.lastScore).toEqual(recovered.score)
  openStudioWorkspace('파일');const open=screen.getByRole('button',{name:'프로젝트 열기'})
  expect(open).toBeEnabled();expect(screen.getByRole('button',{name:'MusicXML 가져오기'})).toBeEnabled()
  fireEvent.click(open);expect(window.inC.project.open).toHaveBeenCalledOnce();expect(open).toBeDisabled()
  await act(async()=>{if(outcome==='success')finishOld({...entry,contents:format==='native'?encodeNativeProject(older):serializeMusicXml(older.score)});else failOld(Error('Obsolete recent failure'))})
  expect(open).toBeDisabled();expect(playbackMockState.lastScore).toEqual(recovered.score)
  expect(screen.queryByText('Obsolete recent failure')).not.toBeInTheDocument()
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
  await act(async()=>finishNew({filePath:'/owned/current.chromatics',fileName:'current.chromatics',contents:encodeNativeProject(fresh)}))
  expect(playbackMockState.lastScore).toEqual(fresh.score);expect(open).toBeEnabled()
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  await save(fresh)
})
it('ordinary recovery keeps Native geometry and opens controls without a pending read',async()=>{
  const recovered=await setup();const {App}=await import('./App');render(<App />)
  fireEvent.click(await screen.findByRole('button',{name:'복구본 열기'}))
  expect(playbackMockState.lastScore).toEqual(recovered.score)
  openStudioWorkspace('파일');expect(screen.getByRole('button',{name:'프로젝트 열기'})).toBeEnabled();expect(screen.getByRole('button',{name:'MusicXML 가져오기'})).toBeEnabled()
  await save(recovered)
})
