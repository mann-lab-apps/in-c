// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createPartSpanResetFixture } from '../../testing/part-span-reset-fixture'
import { encodeNativeProject, decodeNativeProject } from '../../project/schema'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace, openSpanFinder, chooseSpanReference } from './App.test-harness'

registerAppTestHooks()
it('studio.part-span-reset preserves shared geometry and neighboring layout across two independent undo commands', async () => {
  window.history.replaceState({}, '', '/?fixture=demo')
  const original = createPartSpanResetFixture(), before = structuredClone(original)
  vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/fixture/part-span.chromatics', fileName: 'part-span.chromatics', contents: encodeNativeProject(original) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/current.chromatics', fileName: 'current.chromatics' })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(original.score))
  openSpanFinder(); chooseSpanReference('slur:shared-reset-slur')
  fireEvent.click(screen.getByRole('button', { name: '배치 · 형상' }))
  const height = screen.getByRole('spinbutton', { name: '표기 높이' })
  height.focus(); fireEvent.change(height, { target: { value: '4' } }); fireEvent.keyDown(height, { key: 'Enter' }); fireEvent.blur(height)
  const edited = structuredClone(original); edited.score.slurs!.find(s => s.id === 'shared-reset-slur')!.engraving!.height = 4
  expect(playbackMockState.lastScore).toEqual(edited.score)
  let savedCalls = 0
  const save = async () => { openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' })); savedCalls++; await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(savedCalls)); const calls = vi.mocked(window.inC.project.save).mock.calls; return decodeNativeProject(calls[calls.length - 1][0].contents) }
  const assertProject = (actual: ReturnType<typeof decodeNativeProject>, expected: typeof original) => { expect(actual.score).toEqual(expected.score); expect(actual.partLayouts).toEqual(expected.partLayouts); expect(actual.view).toEqual(expected.view) }
  assertProject(await save(), edited)
  openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: '파트보 조판 초기화' }))
  const reset = structuredClone(edited); reset.partLayouts = reset.partLayouts.filter(p => p.partId !== 'P2')
  assertProject(await save(), reset)
  for (const expected of [edited, original]) { fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); assertProject(await save(), expected) }
  for (const expected of [edited, reset]) { fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); assertProject(await save(), expected) }
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/reset.chromatics', fileName: 'reset.chromatics', contents: encodeNativeProject(reset) })
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(document.querySelector('.editor-status')).toHaveTextContent('reset.chromatics을 열었습니다.'))
  assertProject(await save(), reset); expect(original).toEqual(before)
  const out = process.env.DDIRORI_PART_SPAN_RESET_QA_DIR
  if (out) { mkdirSync(out, { recursive: true }); for (const [name, value] of Object.entries({ source: original, edited, reset })) writeFileSync(join(out, name + '.chromatics'), encodeNativeProject(value)) }
}, 15_000)
