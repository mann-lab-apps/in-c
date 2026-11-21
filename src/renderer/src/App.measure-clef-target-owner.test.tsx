// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNewScore } from './editor/new-score'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openNotationSettings, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const options = { title: 'Measure clef target owner', measureCount: 3, keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } }
  const score = createNewScore({ ...options, templateId: 'piano-grand-staff' })
  score.parts.push(createNewScore({ ...options, templateId: 'duet' }).parts[1])
  for (const part of score.parts) for (const staff of part.staves) for (const measure of staff.measures) measure.clef = { sign: 'G', line: 2 }
  const contents = encodeNativeProject(createNativeProject(score)), source = decodeNativeProject(contents).score
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/measure-clef-owner.chromatics', fileName: 'measure-clef-owner.chromatics', contents })
  const { App } = await import('./App'); const view = render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
  fireEvent.click(screen.getByRole('button', { name: '1마디 선택' })); openNotationSettings('clef')
  return { source, App, view }
}
const tools = () => screen.getByRole('region', { name: '마디 표기' })
const field = () => within(tools()).getByRole('combobox', { name: '선택 마디 음자리표' })
function pending() { const combo = field(); fireEvent.click(combo); fireEvent.keyDown(combo, { key: 'ArrowDown' }); expect(combo).toHaveAttribute('aria-expanded', 'true'); return combo }
function select(source: Awaited<ReturnType<typeof setup>>['source'], part: number, staff: number, measure: number) {
  fireEvent.click(screen.getByRole('button', { name: part === 0 && staff === 0 ? `${measure + 1}마디 선택` : `${source.parts[part].name} 보표 ${staff + 1} · ${measure + 1}마디 선택` }))
}
async function save(expected: Awaited<ReturnType<typeof setup>>['source']) {
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
}
it.each([{ part: 0, staff: 0 }, { part: 0, staff: 1 }, { part: 1, staff: 0 }])('discards pending measure-clef choice on part $part staff $staff measure two and keeps inspector entry actions', async ({ part, staff }) => {
  const { source } = await setup(), region = tools(), previous = pending(), textAction = within(region).getByRole('button', { name: '텍스트 표기 편집' }), dynamicAction = within(region).getByRole('button', { name: '셈여림 편집' })
  select(source, part, staff, 1)
  expect(field()).toHaveAttribute('aria-expanded', 'false'); expect(previous.isConnected).toBe(false)
  expect(tools()).toBe(region); expect(within(region).getByRole('button', { name: '텍스트 표기 편집' })).toBe(textAction); expect(within(region).getByRole('button', { name: '셈여림 편집' })).toBe(dynamicAction)
  fireEvent.keyDown(field(), { key: 'Tab' }); expect(playbackMockState.lastScore).toEqual(source)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-measure-id', source.parts[part].staves[staff].measures[1].id)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정'); await save(source)
})
it('retains a same-measure candidate across unrelated rerender, Escape and explicit single-measure edit with exact undo', async () => {
  const { source, App, view } = await setup(), previous = pending(), candidate = previous.getAttribute('aria-activedescendant')
  view.rerender(<App />); expect(field()).toBe(previous); expect(previous).toHaveAttribute('aria-expanded', 'true'); expect(previous).toHaveAttribute('aria-activedescendant', candidate!)
  fireEvent.keyDown(previous, { key: 'Escape' }); expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(pending(), { key: 'Tab' }); const expected = structuredClone(source); expected.parts[0].staves[0].measures[0].clef = { sign: 'F', line: 4 }
  expect(playbackMockState.lastScore).toEqual(expected); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(expected); await save(expected)
})
it('accepts a fresh clef candidate only on the new selected measure with exact neighbors and undo/redo', async () => {
  const { source } = await setup(); select(source, 1, 0, 1)
  fireEvent.keyDown(pending(), { key: 'Tab' }); const expected = structuredClone(source); expected.parts[1].staves[0].measures[1].clef = { sign: 'F', line: 4 }
  expect(playbackMockState.lastScore).toEqual(expected); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(expected); await save(expected)
})
