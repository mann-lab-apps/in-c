// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { partLabelSaveDraftFixture } from '../../testing/part-label-save-draft-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { parseMusicXml } from '../../musicxml'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
const advisory = '입력 중인 미확정 값은 포함되지 않았습니다.'
const channels = ['native', 'musicxml'] as const
it.each(channels.flatMap(channel => (['pending', 'equal', 'cancelled', 'failure'] as const).map(state => ({ channel, state }))))('studio.save-completion-draft $channel $state distinguishes saved snapshot without changing draft focus or history', async ({ channel, state }) => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = partLabelSaveDraftFixture('name-change').project
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/source.chromatics', fileName: 'source.chromatics', contents: encodeNativeProject(source) })
  let finish!: (value: { filePath: string; fileName: string }) => void, fail!: (error: Error) => void
  const result = new Promise<{ filePath: string; fileName: string }>((resolve, reject) => { finish = resolve; fail = reject })
  const operation = channel === 'native' ? window.inC.project.save : window.inC.musicXml.save
  vi.mocked(operation).mockReturnValueOnce(result)
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score))
  if (channel === 'native') await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
  else { const menu = within(screen.getByRole('navigation', { name: '앱 메뉴' })); fireEvent.click(menu.getByRole('button', { name: '파일' })); fireEvent.click(menu.getByRole('menuitem', { name: 'MusicXML로 저장' })) }
  await waitFor(() => expect(operation).toHaveBeenCalledOnce())
  const payload = vi.mocked(operation).mock.calls[0]![0].contents
  fireEvent.click(screen.getByRole('button', { name: '악보 정보' })); fireEvent.click(screen.getByRole('button', { name: '악보 제목 편집' }))
  const input = screen.getByRole('textbox', { name: '악보 제목' }); input.focus(); fireEvent.change(input, { target: { value: state === 'equal' ? `  ${source.score.title}  ` : '저장 요청 뒤 새 초안' } })
  if (state === 'cancelled') fireEvent.keyDown(input, { key: 'Escape' })
  const focus = document.activeElement
  const fileName = channel === 'native' ? 'saved.chromatics' : 'saved.musicxml'
  await act(async () => { if (state === 'failure') fail(new Error('deliberate write failure')); else finish({ filePath: '/fixture/' + fileName, fileName }) })
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent(state === 'failure' ? '마무리하지 못했습니다.' : fileName))
  const status = document.querySelector('.studio-status__result')!
  if (state === 'pending') expect(status).toHaveTextContent(advisory)
  else expect(status).not.toHaveTextContent(advisory)
  expect(document.activeElement).toBe(focus); expect(operation).toHaveBeenCalledOnce(); expect(playbackMockState.lastScore).toEqual(source.score)
  if (state !== 'cancelled') expect(input).toHaveValue(state === 'equal' ? `  ${source.score.title}  ` : '저장 요청 뒤 새 초안')
  if (channel === 'native') expect(decodeNativeProject(payload)).toEqual(source)
  else expect(parseMusicXml(payload).title).toBe(source.score.title)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
