// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { encodeNativeProject } from '../../project/schema'
import { serializeMusicXml } from '../../musicxml'
import { createPartSpanResetFixture } from '../../testing/part-span-reset-fixture'
import { registerAppTestHooks, playbackMockState } from './App.test-harness'

registerAppTestHooks()

it.each((['native','xml'] as const).flatMap(format=>(['success','failure','cancel'] as const).map(outcome=>({format,outcome}))))('studio.backup-read-intent keeps a later backup $outcome ahead of an older $format read', async ({format,outcome})=>{
  window.history.replaceState({},'','/')
  const project=createPartSpanResetFixture(),older=structuredClone(project);older.score.title='Obsolete picker document'
  const fresh=structuredClone(project);fresh.score.title='Latest requested backup'
  let finishOlder!: (file:{filePath:string;fileName:string;contents:string})=>void
  if(format==='native')vi.mocked(window.inC.project.open).mockImplementationOnce(()=>new Promise(resolve=>{finishOlder=resolve}))
  else vi.mocked(window.inC.musicXml.open).mockImplementationOnce(()=>new Promise(resolve=>{finishOlder=resolve}))
  vi.mocked(window.inC.project.listBackups).mockResolvedValue([{id:'current',fileName:'current.chromatics',title:'Latest backup',updatedAt:''}])
  let finishBackup!: (file:{contents:string})=>void,failBackup!: (error:Error)=>void
  vi.mocked(window.inC.project.readBackup).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finishBackup=resolve;failBackup=reject}))
  const {App}=await import('./App');render(<App />)
  const initial=structuredClone(playbackMockState.lastScore)
  fireEvent.click(screen.getByRole('button',{name:format==='native'?'프로젝트 열기':'MusicXML 가져오기'}))
  fireEvent.click(screen.getByRole('button',{name:'프로젝트 백업'}))
  const dialog=screen.getByRole('dialog',{name:'프로젝트 백업'})
  fireEvent.click(await within(dialog).findByRole('button',{name:'Latest backup 복구'}))
  await act(async()=>finishOlder({filePath:'/fixture/old.'+(format==='native'?'chromatics':'musicxml'),fileName:'old.'+(format==='native'?'chromatics':'musicxml'),contents:format==='native'?encodeNativeProject(older):serializeMusicXml(older.score)}))
  expect(playbackMockState.lastScore).toEqual(initial)
  expect(dialog).toBeInTheDocument()
  if(outcome==='cancel')fireEvent.keyDown(dialog,{key:'Escape'})
  await act(async()=>{if(outcome==='failure')failBackup(Error('Newest backup failure'));else finishBackup({contents:encodeNativeProject(fresh)})})
  expect(window.inC.recentMusicXml.add).not.toHaveBeenCalled()
  if(outcome==='success'){
    expect(playbackMockState.lastScore).toEqual(fresh.score)
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(screen.queryByRole('dialog',{name:'프로젝트 백업'})).not.toBeInTheDocument()
  }else{
    expect(playbackMockState.lastScore).toEqual(initial)
    if(outcome==='failure')expect(within(dialog).getByRole('alert')).toHaveTextContent('백업을 확인하지 못했습니다.')
    else expect(screen.queryByRole('dialog',{name:'프로젝트 백업'})).not.toBeInTheDocument()
  }
})
