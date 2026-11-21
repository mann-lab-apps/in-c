// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
const a={filePath:'/fixture/missing-A.musicxml',fileName:'missing-A.musicxml',openedAt:'2026-11-07T00:00:00Z'}
const b={filePath:'/fixture/missing-B.musicxml',fileName:'missing-B.musicxml',openedAt:'2026-11-07T00:00:00Z'}
const errorA='최근 파일을 찾을 수 없습니다: owned missing A',errorB='최근 파일을 찾을 수 없습니다: owned missing B'
async function setup(target = b) {
 window.history.replaceState({},'', '/')
 vi.mocked(window.inC.recentMusicXml.list).mockResolvedValueOnce([a,target])
 vi.mocked(window.inC.recentMusicXml.open).mockRejectedValueOnce(new Error(errorA))
 let finish!:(files:typeof a[])=>void,fail!:(error:Error)=>void
 vi.mocked(window.inC.recentMusicXml.remove).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject}))
 const {App}=await import('./App');render(<App/>)
 fireEvent.click(await screen.findByRole('button',{name:/missing-A.musicxml/}))
 const remove=await screen.findByRole('button',{name:'목록에서 지우기'})
 expect(screen.getByText(errorA)).not.toBeVisible()
 fireEvent.click(remove);expect(window.inC.recentMusicXml.remove).toHaveBeenCalledWith({filePath:a.filePath})
 return {finish,fail,score:structuredClone(playbackMockState.lastScore!)}
}
it.each((['xml','native'] as const).flatMap(format=>(['after-new-failure','before-new-failure'] as const).flatMap(order=>(['success','failure'] as const).map(outcome=>({format,order,outcome})))) )('keeps newer $format missing B ownership when A removal $outcome completes $order',async({format,order,outcome})=>{
 const b = format==='native' ? {filePath:'/fixture/missing-B.chromatics',fileName:'missing-B.chromatics',openedAt:'2026-11-07T00:00:00Z',format:'native' as const} : {filePath:'/fixture/missing-B.musicxml',fileName:'missing-B.musicxml',openedAt:'2026-11-07T00:00:00Z'}
 const s=await setup(b);let failB!:(error:Error)=>void
 vi.mocked(window.inC.recentMusicXml.open).mockImplementationOnce(()=>new Promise((_resolve,reject)=>{failB=reject}))
 fireEvent.click(screen.getByRole('button',{name:/missing-B\.(musicxml|chromatics)/}))
 expect(window.inC.recentMusicXml.open).toHaveBeenLastCalledWith({filePath:b.filePath})
 if(order==='after-new-failure')await act(async()=>failB(new Error(errorB)))
 await act(async()=>{if(outcome==='success')s.finish([b]);else s.fail(new Error('owned old remove A failure'))})
 if(order==='before-new-failure')await act(async()=>failB(new Error(errorB)))
 expect(screen.getByText(errorB)).not.toBeVisible()
 expect(screen.queryByText('owned old remove A failure')).not.toBeInTheDocument()
 expect(screen.getByRole('button',{name:/missing-B\.(musicxml|chromatics)/}).closest('article')).toHaveTextContent('파일을 찾을 수 없음')
 const remove=screen.getByRole('button',{name:'목록에서 지우기'});expect(remove).toBeEnabled()
 if(outcome==='success')expect(screen.queryByRole('button',{name:/missing-A.musicxml/})).not.toBeInTheDocument()
 else expect(screen.getByRole('button',{name:/missing-A.musicxml/})).toBeVisible()
 expect(screen.queryByText('최근 파일 목록에서 지웠습니다.')).not.toBeInTheDocument()
 expect(playbackMockState.lastScore).toEqual(s.score);expect(window.inC.project.save).not.toHaveBeenCalled()
 vi.mocked(window.inC.recentMusicXml.remove).mockResolvedValueOnce(outcome==='success'?[]:[a])
 fireEvent.click(remove);await waitFor(()=>expect(window.inC.recentMusicXml.remove).toHaveBeenCalledTimes(2))
 expect(window.inC.recentMusicXml.remove).toHaveBeenLastCalledWith({filePath:b.filePath})
 await waitFor(()=>expect(screen.queryByRole('button',{name:/missing-B\.(musicxml|chromatics)/})).not.toBeInTheDocument())
})
it.each(['success','failure'] as const)('retains normal single removal %s and its retry',async outcome=>{
 const s=await setup();await act(async()=>{if(outcome==='success')s.finish([b]);else s.fail(new Error('owned current A removal failure'))})
 if(outcome==='success') {
  expect(screen.queryByRole('button',{name:/missing-A.musicxml/})).not.toBeInTheDocument()
  expect(screen.queryByRole('button',{name:'목록에서 지우기'})).not.toBeInTheDocument()
  expect(screen.getByText('최근 파일 목록에서 지웠습니다.')).toBeVisible()
 }else {
  expect(screen.getByText('owned current A removal failure')).not.toBeVisible()
  const retry=screen.getByRole('button',{name:'목록에서 지우기'});expect(retry).toBeEnabled()
  vi.mocked(window.inC.recentMusicXml.remove).mockResolvedValueOnce([b]);fireEvent.click(retry)
  await waitFor(()=>expect(screen.queryByRole('button',{name:/missing-A.musicxml/})).not.toBeInTheDocument())
  expect(window.inC.recentMusicXml.remove).toHaveBeenLastCalledWith({filePath:a.filePath})
 }
 expect(playbackMockState.lastScore).toEqual(s.score);expect(window.inC.project.save).not.toHaveBeenCalled()
})
