// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createPartSpanResetFixture } from '../../testing/part-span-reset-fixture'
import { encodeNativeProject, decodeNativeProject } from '../../project/schema'
import { serializeMusicXml } from '../../musicxml'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'

registerAppTestHooks()
it.each((['native','xml'] as const).flatMap(format => (['refuse','accept','cancel','error'] as const).map(outcome => [format,outcome] as const)))('studio.part-layout-open-race %s %s after saved-then-edited part metadata reuses the dirty count', async (format,outcome) => {
  window.history.replaceState({}, '', '/?fixture=demo')
  const source = createPartSpanResetFixture(), replacement = structuredClone(source)
  replacement.score.title = 'Older pending response'
  const out = process.env.DDIRORI_PART_OPEN_RACE_QA_DIR
  if(out && format==='native' && outcome==='refuse') { mkdirSync(out,{recursive:true});writeFileSync(join(out,'source.chromatics'),encodeNativeProject(source));writeFileSync(join(out,'incoming.chromatics'),encodeNativeProject(replacement));writeFileSync(join(out,'incoming.musicxml'),serializeMusicXml(replacement.score)) }
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/current.chromatics', fileName: 'current.chromatics', contents: encodeNativeProject(source) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/current.chromatics', fileName: 'current.chromatics' })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score))
  const title = (value: string) => { fireEvent.click(screen.getByRole('button',{name:'파트보 제목 수정'})); const n = screen.getByRole('textbox',{name:'파트보 제목 입력'}); fireEvent.change(n,{target:{value}}); fireEvent.keyDown(n,{key:'Enter'}); fireEvent.blur(n) }
  title('Initial dirty title')
  expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
  let finish!: (value: {filePath:string;fileName:string;contents:string}|null) => void, fail!: (error: Error) => void
  if(format==='native')vi.mocked(window.inC.project.open).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject}))
  else vi.mocked(window.inC.musicXml.open).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject}))
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button',{name:format==='native'?'프로젝트 열기':'MusicXML 가져오기'}))
  expect(finish).toBeTypeOf('function')
  title('Saved intermediate title')
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
  await waitFor(()=>expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음'))
  const persisted = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
  expect(persisted.partLayouts.find(p=>p.partId==='P2')!.title).toBe('Saved intermediate title')
  title('Latest unsaved title')
  expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
  const confirm = vi.mocked(window.confirm);confirm.mockClear();confirm.mockReturnValue(outcome==='accept')
  await act(async()=>{if(outcome==='error')fail(new Error('Owned pending read failure'));else finish(outcome==='cancel'?null:{filePath:format==='native'?'/fixture/old.chromatics':'/fixture/old.musicxml',fileName:format==='native'?'old.chromatics':'old.musicxml',contents:format==='native'?encodeNativeProject(replacement):serializeMusicXml(replacement.score)})})
  if(outcome==='accept'||outcome==='refuse')expect(confirm).toHaveBeenCalledWith(format==='native'?'파일 선택 중 편집한 내용을 버리고 프로젝트를 열까요?':'파일 선택 중 편집한 내용을 버리고 MusicXML을 가져올까요?')
  else expect(confirm).not.toHaveBeenCalled()
  if(outcome==='accept') { expect(playbackMockState.lastScore!.title).toBe('Older pending response');expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음');return }
  expect(playbackMockState.lastScore).toEqual(source.score)
  expect(screen.getByRole('button',{name:'파트보 제목 수정'})).toHaveTextContent('Latest unsaved title')
  expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
  expect(screen.getByRole('button',{name:'파트보 제목 수정'})).toHaveTextContent('Saved intermediate title')
})
