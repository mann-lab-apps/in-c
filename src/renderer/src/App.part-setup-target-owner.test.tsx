// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNewScore } from './editor/new-score'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
const fields = ['현재 보표 음자리표', '현재 파트 이조'] as const
async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const options = { title: 'Part setup target owner', measureCount: 3, keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } }
  const score = createNewScore({ ...options, templateId: 'piano-grand-staff' })
  score.parts.push(createNewScore({ ...options, templateId: 'duet' }).parts[1])
  for (const part of score.parts) for (const staff of part.staves) for (const measure of staff.measures) measure.clef = { sign: 'G', line: 2 }
  const contents = encodeNativeProject(createNativeProject(score)), source = decodeNativeProject(contents).score
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/part-setup-owner.chromatics', fileName: 'part-setup-owner.chromatics', contents })
  const { App } = await import('./App'); const view = render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
  fireEvent.click(screen.getByRole('button', { name: '1마디 선택' })); openStudioWorkspace('악보')
  return { source, App, view }
}
function field(label: string) { return within(screen.getByRole('region', { name: '보표와 악기 설정' })).getByRole('combobox', { name: label }) }
function pending(label: string) { const combo = field(label); fireEvent.click(combo); fireEvent.keyDown(combo, { key: 'ArrowDown' }); expect(combo).toHaveAttribute('aria-expanded', 'true'); return combo }
function select(source: Awaited<ReturnType<typeof setup>>['source'], part: number, staff: number, measure: number) {
  fireEvent.click(screen.getByRole('button', { name: part === 0 && staff === 0 ? `${measure + 1}마디 선택` : `${source.parts[part].name} 보표 ${staff + 1} · ${measure + 1}마디 선택` }))
}
async function save(expected: Awaited<ReturnType<typeof setup>>['source']) {
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
}
it.each([
  { label: fields[0], part: 0, staff: 1 },
  { label: fields[0], part: 1, staff: 0 },
  { label: fields[1], part: 1, staff: 0 }
])('discards the pending $label candidate when selecting part $part staff $staff with the same current value', async ({ label, part, staff }) => {
  const { source } = await setup(); const previous = pending(label), tools = screen.getByRole('region', { name: '보표와 악기 설정' })
  select(source, part, staff, 1)
  const current = field(label); expect(current).toHaveAttribute('aria-expanded', 'false'); expect(previous.isConnected).toBe(false)
  expect(screen.getByRole('region', { name: '보표와 악기 설정' })).toBe(tools)
  fireEvent.keyDown(current, { key: 'Tab' })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-measure-id', source.parts[part].staves[staff].measures[1].id)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정'); await save(source)
})
it.each(fields)('retains pending %s within its actual owner and supports exact commit/undo/redo', async label => {
  const { source, App, view } = await setup(), previous = pending(label), candidate = previous.getAttribute('aria-activedescendant')
  select(source, 0, label === fields[0] ? 0 : 1, 1); view.rerender(<App />)
  expect(field(label)).toBe(previous); expect(previous).toHaveAttribute('aria-expanded', 'true'); expect(previous).toHaveAttribute('aria-activedescendant', candidate!)
  fireEvent.keyDown(previous, { key: 'Tab' }); const expected = structuredClone(source)
  if (label === fields[0]) for (const measure of expected.parts[0].staves[0].measures) measure.clef = { sign: 'F', line: 4 }
  else for (const staff of expected.parts[0].staves) for (const measure of staff.measures) measure.transposition = { diatonic: -1, chromatic: -2 }
  expect(playbackMockState.lastScore).toEqual(expected); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(expected); await save(expected)
})
it.each(fields)('accepts a fresh explicit %s candidate on the new target with its original scope', async label => {
  const { source } = await setup(), part = label === fields[0] ? 0 : 1, staff = label === fields[0] ? 1 : 0
  select(source, part, staff, 1); fireEvent.keyDown(pending(label), { key: 'Tab' }); const expected = structuredClone(source)
  if (label === fields[0]) for (const measure of expected.parts[0].staves[1].measures) measure.clef = { sign: 'F', line: 4 }
  else for (const s of expected.parts[1].staves) for (const measure of s.measures) measure.transposition = { diatonic: -1, chromatic: -2 }
  expect(playbackMockState.lastScore).toEqual(expected); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(expected); await save(expected)
})
it('keeps the next added instrument candidate independent from the selected part and staff', async () => {
  const { source } = await setup(), preset = pending('추가할 악기'), candidate = document.getElementById(preset.getAttribute('aria-activedescendant')!)!.textContent!
  select(source, 1, 0, 1); expect(field('추가할 악기')).toBe(preset); expect(preset).toHaveAttribute('aria-expanded', 'true')
  fireEvent.keyDown(preset, { key: 'Tab' }); expect(preset).toHaveTextContent(candidate)
  expect(playbackMockState.lastScore).toEqual(source); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정'); await save(source)
})
