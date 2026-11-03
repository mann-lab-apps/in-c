// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createFullMeasureRest, createMeasure, createPart, createScore, createStaff, createVoice } from '../../score-core'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const notice = '미완성 셋잇단음표 입력은 포함되지 않았습니다.'
const status = () => document.querySelector('.studio-status__result')!
const key = (key: string, code?: string, ctrlKey = false) => fireEvent.keyDown(window, { key, code, ctrlKey })
function start(members: number) {
  fireEvent.click(within(document.querySelector('.score-canvas')!).getByRole('button', { name: 'target 선택' }))
  key('n', 'KeyN'); key('3', 'Digit3', true)
  for (const [i, letter] of ['c', 'd'].slice(0, members).entries()) key(letter, i === 0 ? 'KeyC' : 'KeyD')
  expect(document.querySelector('.editor-status')).toHaveTextContent(`셋잇단음표 ${members}/3`)
}
async function setup() {
  const project = createNativeProject(createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events: [createFullMeasureRest({ id: 'target' })] })] })] })] })] }))
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/pending-copy.chromatics', fileName: 'pending-copy.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score)); return project
}
const button = (format: 'pdf' | 'midi') => screen.getByRole('button', { name: format === 'pdf' ? 'PDF 변환' : 'MIDI 내보내기' })
async function begin(format: 'pdf' | 'midi') {
  openStudioWorkspace('내보내기'); const b = button(format); await waitFor(() => expect(b).toBeEnabled()); fireEvent.click(b)
  await waitFor(() => expect(format === 'pdf' ? window.inC.pdf.save : window.inC.midi.save).toHaveBeenCalledOnce())
}
function keep(project: Awaited<ReturnType<typeof setup>>, members?: number) {
  expect(playbackMockState.lastScore).toEqual(project.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  if (members !== undefined) expect(document.querySelector('.editor-status')).toHaveTextContent(`셋잇단음표 ${members}/3`)
  expect(window.inC.project.save).not.toHaveBeenCalled()
}
type CopyResult = Awaited<ReturnType<typeof window.inC.pdf.save>>
const defer = (format: 'pdf' | 'midi') => {
  let finish!: (result: CopyResult) => void, fail!: (error: Error) => void
  const callback = () => new Promise<CopyResult>((resolve, reject) => { finish = resolve; fail = reject })
  if (format === 'pdf') vi.mocked(window.inC.pdf.save).mockImplementationOnce(callback)
  else vi.mocked(window.inC.midi.save).mockImplementationOnce(callback)
  return { finish: () => finish({ fileName: `pending.${format === 'pdf' ? 'pdf' : 'mid'}`, filePath: `/tmp/pending.${format === 'pdf' ? 'pdf' : 'mid'}` }), cancel: () => finish(null), fail: () => fail(new Error('Expected copy failure')) }
}

it.each((['pdf', 'midi'] as const).flatMap(format => ([0, 1, 2] as const).map(members => [format, members] as const)))('studio.pending-tuplet-copy %s reports initially unfinished input for %i members', async (format, members) => {
  const project = await setup(); start(members)
  if (format === 'pdf') vi.mocked(window.inC.pdf.save).mockResolvedValue({ fileName: 'pending.pdf', filePath: '/tmp/pending.pdf' })
  else vi.mocked(window.inC.midi.save).mockResolvedValue({ fileName: 'pending.mid' })
  const preview = structuredClone(playbackMockState.lastPreviewScore)
  await begin(format); await waitFor(() => expect(status()).toHaveTextContent(notice))
  expect(status()).not.toHaveTextContent('시작 이후의 미완성')
  keep(project, members); expect(playbackMockState.lastPreviewScore).toEqual(preview)
  expect(button(format)).toHaveAttribute('title', expect.stringContaining('확정된 악보'))
  if (format === 'midi') expect(vi.mocked(window.inC.midi.save).mock.calls[0]![0].contents).toEqual(Array.from(serializeMidi(project.score)))
})
it.each(['pdf', 'midi'] as const)('studio.pending-tuplet-copy %s retains its initial source notice after Escape during disk save', async format => {
  const project = await setup(); start(1); const pending = defer(format); await begin(format); key('Escape', 'Escape')
  await act(async () => pending.finish()); await waitFor(() => expect(status()).toHaveTextContent(notice))
  expect(status()).not.toHaveTextContent('시작 이후의 미완성'); keep(project)
})
it.each(['pdf', 'midi'] as const)('studio.pending-tuplet-copy %s explains a later unfinished input without including it', async format => {
  const project = await setup(), pending = defer(format); await begin(format); start(1)
  await act(async () => pending.finish()); await waitFor(() => expect(status()).toHaveTextContent('시작 이후의 미완성 셋잇단음표 입력은 포함되지 않았습니다.'))
  keep(project, 1)
})
it.each(['pdf', 'midi'] as const)('studio.pending-tuplet-copy %s keeps cancellation and failure separate from success', async format => {
  const project = await setup(); start(1)
  for (const outcome of ['cancel', 'fail'] as const) {
    const previous = status().textContent, pending = defer(format)
    if (format === 'pdf') vi.mocked(window.inC.pdf.save).mockClear(); else vi.mocked(window.inC.midi.save).mockClear()
    await begin(format); await act(async () => pending[outcome]())
    if (outcome === 'cancel') expect(status().textContent).toBe(previous)
    else await waitFor(() => expect(status()).toHaveTextContent(format === 'pdf' ? 'PDF 출력을 완료하지 못했습니다.' : 'MIDI 내보내기를 완료하지 못했습니다.'))
    expect(status()).not.toHaveTextContent(notice); keep(project, 1)
  }
})
it.each(['pdf', 'midi'] as const)('studio.pending-tuplet-copy %s does not add unfinished-input notices for ordinary selection or note entry', async format => {
  const project = await setup()
  for (const input of [false, true]) {
    if (input) { fireEvent.click(within(document.querySelector('.score-canvas')!).getByRole('button', { name: 'target 선택' })); key('n', 'KeyN') }
    if (format === 'pdf') vi.mocked(window.inC.pdf.save).mockReset().mockResolvedValue({ fileName: 'plain.pdf', filePath: '/tmp/plain.pdf' })
    else vi.mocked(window.inC.midi.save).mockReset().mockResolvedValue({ fileName: 'plain.mid' })
    await begin(format); await waitFor(() => expect(status()).toHaveTextContent(`plain.${format === 'pdf' ? 'pdf' : 'mid'}`))
    expect(status()).not.toHaveTextContent('미완성 셋잇단음표'); keep(project)
  }
})
