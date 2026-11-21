// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { registerAppTestHooks, openStudioWorkspace, playbackMockState } from './App.test-harness'
registerAppTestHooks()
it('opens an offline handbook from Help, searches a real procedure, and keeps the score and music shortcuts isolated', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { App } = await import('./App')
  render(<App />)
  const score = playbackMockState.lastScore
  fireEvent.click(screen.getByRole('button', { name: '도움말' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '사용설명서' }))
  const dialog = await screen.findByRole('dialog', { name: '띠로리 Studio 사용설명서' })
  const search = within(dialog).getByRole('searchbox', { name: '사용설명서 검색' })
  fireEvent.change(search, { target: { value: '옥타브' } })
  fireEvent.click(within(dialog).getByRole('button', { name: /음높이·옥타브/ }))
  expect(within(dialog).getByRole('heading', { name: '음높이·옥타브 이동' })).toBeInTheDocument()
  expect(within(dialog).getByRole('article', { name: '사용설명서 본문' })).toHaveTextContent('⌘/Ctrl+↑/↓')
  for (const key of [' ', 'ArrowUp', 'Delete', 'n', 't']) fireEvent.keyDown(dialog, { key, code: key === 'n' ? 'KeyN' : key })
  fireEvent.keyDown(dialog, { key: 's', code: 'KeyS', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(score)
  expect(window.inC.project.save).not.toHaveBeenCalled()
  fireEvent.keyDown(dialog, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '띠로리 Studio 사용설명서' })).not.toBeInTheDocument())
  expect(screen.getByRole('button', { name: '도움말' })).toHaveFocus()
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '단축키 도움말' }))
  expect(screen.getByRole('dialog', { name: '단축키 도움말' })).toBeInTheDocument()
})

it('preserves a dirty score, selection and undo after opening and closing the handbook, including a failed save', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { App } = await import('./App'); render(<App />)
  const original = playbackMockState.lastScore
  fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
  const edited = playbackMockState.lastScore; expect(edited).not.toEqual(original)
  vi.mocked(window.inC.project.save).mockRejectedValueOnce(new Error('manual QA save denied'))
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
  await waitFor(() => expect(screen.getAllByText(/manual QA save denied/).length).toBeGreaterThan(0))
  const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
  fireEvent.click(screen.getByRole('button', { name: '도움말' })); fireEvent.click(screen.getByRole('menuitem', { name: '사용설명서' }))
  const dialog = screen.getByRole('dialog', { name: '띠로리 Studio 사용설명서' })
  fireEvent.keyDown(dialog, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(edited)
  fireEvent.keyDown(dialog, { key: 'Escape' })
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selected)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(original)
})

it('help explains actual octave, mode, grace and save mappings without triggering playback',async()=>{
 window.history.replaceState({},'', '/?fixture=release-test');const {App}=await import('./App');render(<App />)
 fireEvent.click(screen.getByRole('button',{name:'도움말'}));fireEvent.click(screen.getByRole('menuitem',{name:'단축키 도움말'}))
 const dialog=screen.getByRole('dialog',{name:'단축키 도움말'})
 expect(within(dialog).getByText('한 옥타브 올리기/내리기')).toBeVisible()
 expect(within(dialog).getByText('Mac: ⌘+↑/↓ · Windows/Linux: Ctrl+↑/↓')).toBeVisible()
 expect(within(dialog).getByText('기존 음표를 꾸밈음으로 변환')).toBeInTheDocument()
 expect(within(dialog).getByText('현재 형식으로 저장')).toBeInTheDocument()
 fireEvent.keyDown(dialog,{key:' '});expect(playbackMockState.play).not.toHaveBeenCalled()
 fireEvent.click(within(dialog).getByRole('button',{name:'확인'}));expect(screen.queryByRole('dialog',{name:'단축키 도움말'})).not.toBeInTheDocument()
})

it('shows every previously omitted support-boundary category in the actual offline Help chapter without editing the score', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { App } = await import('./App'); render(<App />)
  const source = structuredClone(playbackMockState.lastScore)
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
  fireEvent.click(screen.getByRole('button', { name: '도움말' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '사용설명서' }))
  const dialog = await screen.findByRole('dialog', { name: '띠로리 Studio 사용설명서' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'MuseScore와의 차이' }))
  const article = within(dialog).getByRole('article', { name: '사용설명서 본문' })
  const backlog = JSON.parse(readFileSync('docs/product/studio-musescore-gap-backlog-20261104.json', 'utf8'))
  for (const id of ['SMG-046', 'SMG-047', 'SMG-027-001', 'SMG-026-002']) {
    const entry = backlog.entries.find((item: { id: string }) => item.id === id)
    expect(entry).toBeDefined()
    expect(article, id).toHaveTextContent(entry.title)
    expect(article, id).toHaveTextContent(entry.publicSummary)
  }
  expect(playbackMockState.lastScore).toEqual(source)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selection)
  expect(window.inC.project.save).not.toHaveBeenCalled()
  fireEvent.keyDown(dialog, { key: 'Escape' })
  expect(screen.getByRole('button', { name: '도움말' })).toHaveFocus()
})
