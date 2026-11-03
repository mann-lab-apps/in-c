// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { partLabelSaveDraftFixture } from '../../testing/part-label-save-draft-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const guidance = 'Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'
const fields = [['title', '악보 제목'], ['composer', '작곡가'], ['partTitle', '파트보 제목 입력']] as const
const status = () => document.querySelector('.studio-status__result')!
const shortcut = (target: Window | HTMLInputElement = window) => fireEvent.keyDown(target, { key: 's', code: 'KeyS', ctrlKey: true })
async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = partLabelSaveDraftFixture('name-change').project
  source.score.composer = 'Original composer'
  source.view = { mode: 'part', partId: source.score.parts[0]!.id }
  source.partLayouts = [{ partId: source.score.parts[0]!.id, title: 'Original part title', layout: {} }]
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/source.chromatics', fileName: 'source.chromatics', contents: encodeNativeProject(source) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/saved.chromatics', fileName: 'saved.chromatics' })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score))
  return source
}
function edit(label: string) {
  fireEvent.click(screen.getByRole('button', { name: '악보 정보' }))
  fireEvent.click(screen.getByRole('button', { name: label === '파트보 제목 입력' ? '파트보 제목 편집' : `${label} 편집` }))
  const input = screen.getByRole('textbox', { name: label }) as HTMLInputElement
  act(() => input.focus()); return input
}
async function blocked(input: HTMLInputElement) {
  fireEvent.change(input, { target: { value: '새 정보' } })
  await act(async () => shortcut(input))
  expect(status()).toHaveTextContent(guidance); expect(input).toHaveFocus()
}
function noUndo() {
  const menu = within(screen.getByRole('navigation', { name: '앱 메뉴' }))
  fireEvent.click(menu.getByRole('button', { name: '편집' }))
  expect(menu.getByRole('menuitem', { name: '실행 취소' })).toBeDisabled()
}

it.each(fields.flatMap(([field, label]) => ['confirm', 'cancel'].map(action => ({ field, label, action }))))(
  'studio.metadata-guide-lifecycle $field $action settles only its obsolete save instruction',
  async ({ field, label, action }) => {
    const source = await setup(), input = edit(label); await blocked(input)
    fireEvent.keyDown(input, { key: action === 'confirm' ? 'Enter' : 'Escape' }); fireEvent.blur(input)
    expect(status()).not.toHaveTextContent(guidance)
    expect(screen.queryByRole('textbox', { name: label })).not.toBeInTheDocument()
    expect(window.inC.project.save).not.toHaveBeenCalled()
    const expected = structuredClone(source)
    if (action === 'confirm') {
      if (field === 'partTitle') expected.partLayouts[0]!.title = '새 정보'
      else expected.score[field as 'title' | 'composer'] = '새 정보'
    }
    await act(async () => shortcut())
    expect(window.inC.project.save).toHaveBeenCalledOnce()
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(expected)
    if (action === 'confirm') fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    noUndo()
  }
)
it.each(fields)('studio.metadata-guide-lifecycle %s no-op confirmation retires the instruction without history', async (_field, label) => {
  await setup(); const input = edit(label), original = input.value; await blocked(input)
  fireEvent.change(input, { target: { value: original } }); fireEvent.keyDown(input, { key: 'Enter' })
  expect(status()).not.toHaveTextContent(guidance); expect(window.inC.project.save).not.toHaveBeenCalled(); noUndo()
})
it('studio.metadata-guide-lifecycle part-title blur retires the instruction without taking the next focus', async () => {
  await setup(); const input = edit('파트보 제목 입력'); await blocked(input)
  const destination = screen.getByRole('button', { name: '악보로 이동' })
  act(() => destination.focus())
  expect(status()).not.toHaveTextContent(guidance); expect(destination).toHaveFocus()
  expect(window.inC.project.save).not.toHaveBeenCalled()
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); noUndo()
})
it('studio.metadata-guide-lifecycle resolves a save instruction and Escape queued in the same React batch', async () => {
  await setup(); const input = edit('악보 제목'); fireEvent.change(input, { target: { value: '임시 제목' } })
  act(() => { shortcut(input); fireEvent.keyDown(input, { key: 'Escape' }) })
  expect(status()).not.toHaveTextContent(guidance); expect(window.inC.project.save).not.toHaveBeenCalled(); noUndo()
})
it.each(['success', 'failure'].flatMap(result => ['confirm', 'cancel'].map(action => ({ result, action }))))(
  'studio.metadata-guide-lifecycle preserves newer native $result when part-title $action resolves the old guide',
  async ({ result, action }) => {
    const source = await setup()
    let finish!: (value: { filePath: string; fileName: string }) => void, fail!: (error: Error) => void
    vi.mocked(window.inC.project.save).mockReturnValueOnce(new Promise((resolve, reject) => { finish = resolve; fail = reject }))
    await act(async () => shortcut()); expect(window.inC.project.save).toHaveBeenCalledOnce()
    const input = edit('파트보 제목 입력'); await blocked(input)
    await act(async () => {
      if (result === 'success') finish({ filePath: '/fixture/newer.chromatics', fileName: 'newer.chromatics' })
      else fail(new Error('newer IO failure'))
    })
    await waitFor(() => expect(status()).toHaveTextContent(result === 'success' ? 'newer.chromatics' : '마무리하지 못했습니다.'))
    const newer = status().textContent
    if (result === 'success') expect(status()).toHaveTextContent('입력 중인 미확정 값은 포함되지 않았습니다.')
    fireEvent.keyDown(input, { key: action === 'confirm' ? 'Enter' : 'Escape' }); fireEvent.blur(input)
    expect(status().textContent).toBe(newer)
    expect(window.inC.project.save).toHaveBeenCalledOnce()
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(source)
    expect(document.querySelector('.studio-document__state')).toHaveTextContent(action === 'confirm' ? '저장하지 않은 변경' : '변경 없음')
    if (action === 'confirm') fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    noUndo()
  }
)
