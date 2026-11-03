// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { geometrySaveDraftFixture } from '../../testing/geometry-save-draft-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { chooseSpanReference, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
const guidance = 'Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'
it.each([
  { kind: 'auto-to-zero' as const, confirm: true }, { kind: 'auto-to-zero' as const, confirm: false },
  { kind: 'zero-to-auto' as const, confirm: true }, { kind: 'zero-to-auto' as const, confirm: false },
  { kind: 'same-zero' as const, confirm: false }
])('studio.collapsed-geometry-draft $kind confirm=$confirm reveals only a genuinely pending field before saving', async ({ kind, confirm }) => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const data = geometrySaveDraftFixture(kind), source = data.project
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/geometry.chromatics', fileName: 'geometry.chromatics', contents: encodeNativeProject(source) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/confirmed.chromatics', fileName: 'confirmed.chromatics' })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score))
  chooseSpanReference('hairpin:geometry-save-span'); const disclosure = screen.getByRole('button', { name: '배치 · 형상' }); fireEvent.click(disclosure)
  const input = screen.getByRole('spinbutton', { name: data.label }); input.focus(); fireEvent.compositionStart(input); fireEvent.change(input, { target: { value: data.draft } }); act(() => input.blur()); disclosure.focus(); fireEvent.click(disclosure)
  expect(disclosure).toHaveAttribute('aria-expanded', 'false'); expect(input).not.toBeVisible()
  if (data.blocked) {
    await act(async () => fireEvent.keyDown(disclosure, { key: 's', code: 'KeyS', ctrlKey: true }))
    expect(window.inC.project.save).not.toHaveBeenCalled(); expect(disclosure).toHaveFocus(); expect(disclosure).toHaveAttribute('aria-expanded', 'false')
  }
  fireEvent.compositionEnd(input)
  await act(async () => fireEvent.keyDown(disclosure, { key: 's', code: 'KeyS', metaKey: true }))
  if (data.blocked) {
    expect(window.inC.project.save).not.toHaveBeenCalled()
    await waitFor(() => expect(disclosure).toHaveAttribute('aria-expanded', 'true'))
    expect(input).toBeVisible(); await waitFor(() => expect(input).toHaveFocus()); expect(input).toHaveAccessibleDescription(guidance)
    fireEvent.keyDown(input, { key: confirm ? 'Enter' : 'Escape' }); fireEvent.blur(input); expect(window.inC.project.save).not.toHaveBeenCalled()
    await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
  } else expect(disclosure).toHaveAttribute('aria-expanded', 'false')
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const expected = structuredClone(source); expected.score.hairpins![0]!.engraving = confirm ? data.next : data.initial
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(expected)
  if (data.blocked && confirm) { fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source.score) }
})
