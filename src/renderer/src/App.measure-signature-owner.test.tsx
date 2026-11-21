// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNewScore } from './editor/new-score'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const contents = encodeNativeProject(createNativeProject(createNewScore({
    title: 'Measure signature owner', templateId: 'duet', measureCount: 3,
    keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 }
  })))
  const source = decodeNativeProject(contents).score
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({
    filePath: '/fixture/measure-owner.chromatics', fileName: 'measure-owner.chromatics', contents
  })
  const { App } = await import('./App')
  const view = render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
  fireEvent.click(screen.getByRole('button', { name: '1마디 선택' }))
  openStudioWorkspace('악보')
  return { source, App, view }
}
function field(label: string) {
  return within(screen.getByRole('region', { name: '마디 구조와 조표·박자표' }))
    .getByRole('combobox', { name: label })
}
function pending(label: string) {
  const select = field(label)
  fireEvent.click(select)
  fireEvent.keyDown(select, { key: label === '조표' ? 'ArrowDown' : 'ArrowUp' })
  expect(select).toHaveAttribute('aria-expanded', 'true')
  return select
}

it.each(['조표', '박자표'])('discards the previous measure pending %s choice when the new measure has the same value', async label => {
  const { source } = await setup()
  pending(label)
  expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))
  const current = field(label)
  expect(current).toHaveAttribute('aria-expanded', 'false')
  fireEvent.keyDown(current, { key: 'Tab' })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-measure-id', source.parts[0].staves[0].measures[1].id)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(source)
})

it.each(['조표', '박자표'])('retains the same measure pending %s choice and explicit commit/cancel with exact undo', async label => {
  const { source, App, view } = await setup()
  const original = pending(label), candidate = original.getAttribute('aria-activedescendant')
  view.rerender(<App />)
  expect(field(label)).toBe(original)
  expect(original).toHaveAttribute('aria-expanded', 'true')
  expect(original).toHaveAttribute('aria-activedescendant', candidate!)
  fireEvent.keyDown(original, { key: 'Escape' })
  expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(pending(label), { key: 'Tab' })
  const edited = structuredClone(playbackMockState.lastScore!)
  expect(edited.parts.slice(1)).toEqual(source.parts.slice(1))
  if (label === '조표') expect(edited.parts[0].staves[0].measures[0].keySignature).toEqual({ fifths: 0, mode: 'major' })
  else expect(edited.parts[0].staves[0].measures[0].timeSignature).toEqual({ beats: 3, beatType: 4 })
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(edited)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
})

it('keeps the measure action surface and focused add button while the target changes', async () => {
  const { source } = await setup()
  const tools = screen.getByRole('region', { name: '마디 구조와 조표·박자표' })
  const add = within(tools).getByRole('button', { name: '마디 추가' })
  add.focus()
  for (let index = 0; index < 3; index += 1) {
    fireEvent.click(add)
    expect(screen.getByRole('region', { name: '마디 구조와 조표·박자표' })).toBe(tools)
    expect(within(tools).getByRole('button', { name: '마디 추가' })).toBe(add)
    expect(add).toHaveFocus()
    expect(playbackMockState.lastScore!.parts[0].staves[0].measures).toHaveLength(4 + index)
  }
  const edited = structuredClone(playbackMockState.lastScore!)
  for (let index = 0; index < 3; index += 1) fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(source)
  for (let index = 0; index < 3; index += 1) fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(edited)
})
