// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { createStaffVisibilityFixture } from '../../testing/staff-visibility-fixture'
import { serializeMusicXml } from '../../musicxml'
import { focusTestBody, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
afterEach(() => document.getSelection()?.removeAllRanges())

async function setup(status: 'stopped' | 'paused' | 'playing' = 'stopped') {
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({
    fileName: 'reading.musicxml', filePath: '/fixture/reading.musicxml', contents: createStaffVisibilityFixture('hidden-second')
  })
  const { App } = await import('./App')
  const view = render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = await screen.findByRole('region', { name: 'MusicXML 경고 상세' })
  fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
  vi.mocked(window.inC.project.open).mockRejectedValueOnce(new Error('Owned file read failure'))
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await screen.findByRole('group', { name: '프로젝트 열기 기술 정보' })
  playbackMockState.value.status = status
  view.rerender(<App />)
  playbackMockState.play.mockClear(); playbackMockState.playFromEvent.mockClear(); playbackMockState.pause.mockClear()
  return { report, score: structuredClone(playbackMockState.lastScore!),
    selection: screen.getByTestId('notation-preview').getAttribute('data-selected-event-address'),
    selected: screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')!,
    dirty: document.querySelector('.studio-document__state')!.textContent,
    history: [...document.querySelector('.editor-status')!.children].find(n => /^\d+회 수정$/.test(n.textContent!))!.textContent }
}
function selectText(node: Element) {
  const range = document.createRange(), selection = document.getSelection()!
  range.selectNodeContents(node); selection.removeAllRanges(); selection.addRange(range)
  expect(selection.toString()).not.toBe('')
  return selection.toString()
}
function space(target: Element, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true, ...init })
  fireEvent(target, event)
  return event
}
function unchanged(s: Awaited<ReturnType<typeof setup>>) {
  expect(playbackMockState.lastScore).toEqual(s.score)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', s.selection!)
  expect(document.querySelector('.studio-document__state')!.textContent).toBe(s.dirty)
  expect(document.querySelector('.editor-status')).toHaveTextContent(s.history!)
  expect(playbackMockState.play).not.toHaveBeenCalled()
  expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  expect(playbackMockState.pause).not.toHaveBeenCalled()
}

it.each((['primary', 'report'] as const).flatMap(surface => (['stopped', 'paused', 'playing'] as const).map(status => ({ surface, status }))))(
  'keeps selected $surface text Space with the reader while transport is $status', async ({ surface, status }) => {
    const s = await setup(status)
    focusTestBody()
    const text = selectText(surface === 'primary' ? document.querySelector('.studio-status__result')! : s.report.querySelector('li > :is(p,span)')!)
    expect(space(document.body).defaultPrevented).toBe(false)
    unchanged(s)
    expect(document.getSelection()!.toString()).toBe(text)
    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
    expect(window.inC.project.save).not.toHaveBeenCalled()
  }
)
it.each(['collapsed', 'score-focus', 'hidden'] as const)('keeps ordinary Space playback for %s', async scenario => {
  const s = await setup()
  focusTestBody()
  const text = document.querySelector('.studio-status__result')! as HTMLElement
  let target: Element = document.body
  if (scenario === 'score-focus') { target = screen.getByRole('button', { name: s.selected + ' 선택' }); act(() => (target as HTMLElement).focus()) }
  selectText(text)
  if (scenario === 'collapsed') document.getSelection()!.collapseToStart()
  if (scenario === 'hidden') text.hidden = true
  try {
    expect(space(target).defaultPrevented).toBe(true)
    expect(playbackMockState.play.mock.calls.length + playbackMockState.playFromEvent.mock.calls.length).toBe(1)
    expect(playbackMockState.pause).not.toHaveBeenCalled()
    expect(playbackMockState.lastScore).toEqual(s.score)
  } finally { text.hidden = false }
})
it.each([{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { isComposing: true }, { keyCode: 229 }])(
  'keeps modified/IME Space with its existing owner: %j', async init => {
    const s = await setup(); focusTestBody(); selectText(document.querySelector('.studio-status__result')!)
    expect(space(document.body, init).defaultPrevented).toBe(false)
    unchanged(s)
  }
)
it('keeps technical disclosure activation local and retains document save/undo/redo', async () => {
  const s = await setup(), technical = within(s.report).getByRole('button', { name: '기술 정보' })
  fireEvent.click(technical); act(() => technical.focus()); selectText(s.report.querySelector('code')!)
  expect(space(technical).defaultPrevented).toBe(false); unchanged(s)
  focusTestBody(); selectText(document.querySelector('.studio-status__result')!)
  const save = new KeyboardEvent('keydown', { key: 's', code: 'KeyS', ctrlKey: true, bubbles: true, cancelable: true })
  fireEvent(document.body, save); expect(save.defaultPrevented).toBe(true)
  await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledOnce())
  expect(vi.mocked(window.inC.musicXml.save).mock.calls[0]![0].contents).toBe(serializeMusicXml(s.score))
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(playbackMockState.lastScore).not.toEqual(s.score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(s.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
})

it('includes the approved reading exception in the actual bundled shortcut source', async () => {
  const { studioShortcutMarkdown } = await import('./studio-shortcuts')
  const markdown = studioShortcutMarkdown()
  expect(markdown).toContain('표시된 오류·경고 안내 글자를 선택해 읽는 동안에는 Space로 재생하거나 일시정지하지 않습니다.')
  expect(markdown).toContain('글자 선택을 해제하거나 악보로 돌아오면 기존 Space 동작을 사용합니다.')
})
