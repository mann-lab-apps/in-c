// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { serializeMusicXml } from '../../musicxml'
import { createPartSpanResetFixture } from '../../testing/part-span-reset-fixture'
import { decodeNativeProject } from '../../project/schema'
import { registerAppTestHooks, openStudioWorkspace, chooseScoreView, choosePageSetup, playbackMockState } from './App.test-harness'

registerAppTestHooks()

it.each(['success', 'cancel', 'failure'] as const)('studio.xml-layout-save keeps newer part page preferences through %s', async outcome => {
  window.history.replaceState({}, '', '/?fixture=demo')
  const xml = serializeMusicXml(createPartSpanResetFixture().score)
  const path = '/fixture/layout.musicxml'
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: path, fileName: 'layout.musicxml', contents: xml })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore?.title).toBe('Independent part structural layout'))
  openStudioWorkspace('악보')
  chooseScoreView('악보 보기', 'part')
  chooseScoreView('파트보 선택', 'P2')
  openStudioWorkspace('내보내기')
  choosePageSetup('PDF 설정 프리셋', '컴팩트 파트보')
  const score = structuredClone(playbackMockState.lastScore)
  let finish!: (value: {filePath: string; fileName: string} | null) => void
  let fail!: (error: Error) => void
  vi.mocked(window.inC.musicXml.save).mockImplementationOnce(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
  expect(finish).toBeTypeOf('function')
  openStudioWorkspace('내보내기')
  choosePageSetup('PDF 용지', 'Letter')
  const latest = window.localStorage.getItem('chromatics.part-page-setup.v1')
  expect(latest).toContain('"pageSize":"letter"')
  vi.mocked(window.inC.autosave.clear).mockClear()
  await act(async () => {
    if (outcome === 'failure') fail(new Error('Owned layout save failure'))
    else finish(outcome === 'cancel' ? null : { filePath: path, fileName: 'layout.musicxml' })
  })
  expect(window.localStorage.getItem('chromatics.part-page-setup.v1')).toBe(latest)
  expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
  if (outcome === 'success') expect(screen.getByRole('status', {name: '편집 및 파일 상태'})).toHaveTextContent('저장 중 추가한 변경사항은 아직 저장되지 않았습니다.')
  if (outcome === 'failure') expect(screen.getByRole('status', {name: '편집 및 파일 상태'})).toHaveTextContent('MusicXML 저장을 마무리하지 못했습니다.')
  expect(window.inC.autosave.clear).not.toHaveBeenCalled()
  expect(playbackMockState.lastScore).toEqual(score)
  vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/fixture/layout.chromatics', fileName:'layout.chromatics'})
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', {name: '프로젝트 저장'}))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const project = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
  expect(project.partLayouts.find(p => p.partId === 'P2')?.layout.pageSetup?.pageSize).toBe('letter')
  fireEvent.keyDown(window, {key:'z', code:'KeyZ', ctrlKey:true})
  fireEvent.click(screen.getByRole('button', {name:'프로젝트 저장'}))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1][0].contents).partLayouts.find(p => p.partId === 'P2')?.layout.pageSetup?.pageSize).toBe('a4')
})

it('studio.xml-layout-save restores a portable recovery snapshot when the first part edit arrives during cleanup', async () => {
  window.history.replaceState({}, '', '/?fixture=demo')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/cleanup.musicxml', fileName:'cleanup.musicxml', contents:serializeMusicXml(createPartSpanResetFixture().score)})
  vi.mocked(window.inC.musicXml.save).mockResolvedValueOnce({filePath:'/fixture/cleanup.musicxml', fileName:'cleanup.musicxml'})
  let finishClear!: () => void
  vi.mocked(window.inC.autosave.clear).mockImplementationOnce(() => new Promise(resolve => { finishClear = resolve }))
  const {App} = await import('./App'); render(<App />)
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
  await waitFor(() => expect(playbackMockState.lastScore?.title).toBe('Independent part structural layout'))
  openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택','P2')
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML로 저장'}))
  await waitFor(() => expect(finishClear).toBeTypeOf('function'))
  openStudioWorkspace('내보내기');choosePageSetup('PDF 용지','Letter')
  await act(async () => finishClear())
  expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
  expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).toHaveTextContent('저장 중 추가한 변경사항은 아직 저장되지 않았습니다.')
  const recovery = vi.mocked(window.inC.autosave.write).mock.calls.at(-1)![0]
  expect(recovery.project?.partLayouts.find(p => p.partId === 'P2')?.layout.pageSetup?.pageSize).toBe('letter')
})
