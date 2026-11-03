// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { geometrySaveDraftFixture, geometrySaveDraftKinds } from '../../testing/geometry-save-draft-fixture'
import { tempoSaveDraftFixture, tempoSaveDraftKinds } from '../../testing/tempo-save-draft-fixture'
import { createPartSpanResetFixture } from '../../testing/part-span-reset-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { chooseSpanReference, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const guidance = 'Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'
const cases = [
  ...geometrySaveDraftKinds.map(kind => ({ family: 'geometry' as const, ...geometrySaveDraftFixture(kind) })),
  ...tempoSaveDraftKinds.map(kind => ({ family: 'tempo' as const, ...tempoSaveDraftFixture(kind) })),
  ...['change', 'invalid', 'empty', 'equal'].map(kind => {
    const project = createPartSpanResetFixture(), expected = structuredClone(project), value = project.partLayouts.find(p => p.partId === 'P2')!.layout.pageSetup!.pageMarginMm!
    if (kind === 'change') expected.partLayouts.find(p => p.partId === 'P2')!.layout.pageSetup!.pageMarginMm = 17
    return { family: 'page' as const, kind, project, expected, label: 'PDF 여백 mm', draft: kind === 'change' ? '17' : kind === 'invalid' ? '31' : kind === 'empty' ? '' : `${value}.0`, blocked: kind !== 'equal', confirm: kind === 'change', value }
  })
]
it.each(cases)('studio.numeric-document-guard $family $kind retains composition-blurred draft ownership and exact semantics', async data => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = structuredClone(data.project), expected = structuredClone('expected' in data ? data.expected : data.project)
  if (data.family === 'geometry') { if (data.next) expected.score.hairpins![0]!.engraving = data.next; else delete expected.score.hairpins![0]!.engraving }
  if (process.env.DDIRORI_NUMERIC_DRAFT_QA_DIR) {
    const { mkdirSync, writeFileSync } = await import('node:fs'), { join } = await import('node:path'), dir = join(process.env.DDIRORI_NUMERIC_DRAFT_QA_DIR, `${data.family}-${data.kind}`)
    mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(source)); writeFileSync(join(dir, 'expected.chromatics'), encodeNativeProject(expected)); writeFileSync(join(dir, 'expectations.json'), JSON.stringify({ family: data.family, kind: data.kind, label: data.label, draft: data.draft, confirm: data.confirm, blocked: data.blocked }, null, 2))
  }
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/numeric.chromatics', fileName: 'numeric.chromatics', contents: encodeNativeProject(source) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/confirmed.chromatics', fileName: 'confirmed.chromatics' })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score))
  if (data.family === 'geometry') { chooseSpanReference('hairpin:geometry-save-span'); fireEvent.click(screen.getByText('배치 · 형상')) }
  else openStudioWorkspace(data.family === 'tempo' ? '악보' : '내보내기')
  const input = screen.getByRole('spinbutton', { name: data.label }); input.focus(); fireEvent.compositionStart(input)
  // Ensure automatic/empty controls have a real edited draft before restoring
  // their semantically unchanged representation.
  if (data.kind === 'same-auto' || data.kind === 'empty-control') fireEvent.change(input, { target: { value: '2.25' } })
  fireEvent.change(input, { target: { value: data.draft } }); act(() => input.blur())
  const other = screen.getByRole('button', { name: '악보로 이동' }); other.focus()
  if (data.blocked) {
    await act(async () => fireEvent.keyDown(other, { key: 's', code: 'KeyS', ctrlKey: true }))
    expect(window.inC.project.save).not.toHaveBeenCalled(); expect(other).toHaveFocus(); expect(input).not.toHaveAccessibleDescription(expect.stringContaining(guidance))
  }
  fireEvent.compositionEnd(input)
  await act(async () => fireEvent.keyDown(other, { key: 's', code: 'KeyS', metaKey: true, shiftKey: true }))
  if (data.blocked) {
    expect(window.inC.project.save).not.toHaveBeenCalled(); expect(playbackMockState.lastScore).toEqual(source.score)
    await waitFor(() => expect(input).toHaveFocus()); expect(input).toHaveAccessibleDescription(expect.stringContaining(guidance)); expect(input).toHaveValue(data.draft === '' ? null : Number(data.draft))
    fireEvent.keyDown(input, { key: data.confirm ? 'Enter' : 'Escape' }); fireEvent.blur(input)
    expect(window.inC.project.save).not.toHaveBeenCalled()
    await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
  }
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(expected)
  if (data.blocked && data.confirm) {
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source.score)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' })); await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents)).toEqual(source)
  }
  expect(playbackMockState.play).not.toHaveBeenCalled(); expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
})
