// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createScore } from '../../score-core'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
async function setup(mode: 'event' | 'tuplet' = 'event') {
  const source = createScore(), second = structuredClone(source.parts[0]!)
  second.id = 'second-part'; second.name = 'Second'; second.staves[0]!.id = 'second-staff'
  second.staves[0]!.measures[0]!.id = 'second-measure'
  second.staves[0]!.measures[0]!.voices[0]!.events[0]!.id = 'second-rest'
  source.parts.push(second)
  vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/test/navigation.chromatics', fileName: 'navigation.chromatics', contents: encodeNativeProject(createNativeProject(source)) })
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { App } = await import('./App'); render(<App />)
  fireEvent.click(screen.getByRole('button', { name: '파일' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
  const preview = screen.getByTestId('notation-preview')
  const entries = preview.getAttribute('data-all-event-pitches')!.split(',').map(value => {
    const [partId, staffId, measureId, voiceId, eventId, pitch] = value.split(':')
    return { partId, staffId, measureId, voiceId, eventId, pitch }
  })
  let target: HTMLElement
  if (mode === 'tuplet') {
    const rest = entries.filter(e => e.pitch === 'rest').at(-1)!
    fireEvent.click(screen.getByRole('button', { name: `${rest.eventId} 선택` }))
    fireEvent.click(screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' }))
    fireEvent.click(screen.getByRole('button', { name: /셋잇단음표 적용 또는 입력 준비/ }))
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC' })
    target = screen.getByLabelText('악보 캔버스')
    expect(document.querySelector('.editor-status')).toHaveTextContent('셋잇단음표 1/3')
  } else {
    const entry = entries[0]!
    fireEvent.click(screen.getByRole('button', { name: `${entry.eventId} 선택` }))
    // The mocked renderer supplies the existing focus contract only.
    target = document.createElement('button'); target.className = 'notation-event is-selected'
    Object.assign(target.dataset, entry); target.tabIndex = 0; preview.append(target)
  }
  target.scrollIntoView = vi.fn()
  const staff = screen.getByRole('combobox', { name: '입력 보표' })
  const voice = within(screen.getByRole('group', { name: '입력 성부' })).getByRole('button', { name: '2성부' })
  return { target, staff, voice, preview, source: structuredClone(playbackMockState.lastScore!), before: preview.getAttribute('data-all-event-pitches') }
}
it.each([
  ['event', 'staff'], ['event', 'voice'], ['tuplet', 'staff'], ['tuplet', 'voice']
] as const)('returns from %s %s using the existing F6 action without a command', async (mode, kind) => {
  const data = await setup(mode), origin = data[kind]
  expect(origin).toBeEnabled()
  act(() => origin.focus()); fireEvent.keyDown(origin, { key: 'F6', code: 'F6' })
  expect(data.target).toHaveFocus()
  expect(data.preview).toHaveAttribute('data-all-event-pitches', data.before!)
  expect(playbackMockState.lastScore).toEqual(data.source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  if (mode === 'tuplet') expect(document.querySelector('.editor-status')).toHaveTextContent('셋잇단음표 1/3')
  expect(window.inC.project.save).not.toHaveBeenCalled()
  expect(playbackMockState.play).not.toHaveBeenCalled()
})
it.each(['staff', 'voice'] as const)('retains composition and modified-key ownership on %s', async kind => {
  const data = await setup(), origin = data[kind]
  act(() => origin.focus())
  for (const guard of [{ isComposing: true }, { keyCode: 229 }, { ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
    fireEvent.keyDown(origin, { key: 'F6', code: 'F6', ...guard }); expect(origin).toHaveFocus()
  }
  expect(data.target.scrollIntoView).not.toHaveBeenCalled()
  expect(playbackMockState.lastScore).toEqual(data.source)
})
it('keeps an open staff choice in its own keyboard context', async () => {
  const data = await setup(); act(() => data.staff.focus()); fireEvent.click(data.staff)
  expect(data.staff).toHaveAttribute('aria-expanded', 'true')
  fireEvent.keyDown(data.staff, { key: 'F6', code: 'F6' })
  expect(data.staff).toHaveFocus(); expect(data.staff).toHaveAttribute('aria-expanded', 'true')
  expect(data.target.scrollIntoView).not.toHaveBeenCalled()
  expect(playbackMockState.lastScore).toEqual(data.source)
})
