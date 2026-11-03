// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { TICKS_PER_QUARTER as T, createMeasure, createNote, createPart, createScore, createStaff, createTimePosition, createVoice } from '../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each(['delete-slur', 'rest-slur', 'delete-hairpin', 'rest-octave'])('studio.range-span-preservation keeps the supported contract for %s', async kind => {
  const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events:
    (['C', 'D', 'E', 'F'] as const).map((step, i) => createNote({ id: `n${i}`, position: createTimePosition(i * T), pitch: { step, octave: 4 } }))
  })] })] })] })] })
  if (kind === 'rest-octave') score.octaveShifts = [{ id: 'octave', type: '8va', startEventId: 'n0', endEventId: 'n2' }]
  else {
    score.slurs = [{ id: 'affected', startEventId: 'n0', endEventId: 'n2', engraving: { offsetY: 0, height: 4 } }, { id: 'neighbor', startEventId: 'n2', endEventId: 'n3', engraving: { offsetY: -2 } }]
    score.hairpins = [{ id: 'keep', startEventId: kind === 'delete-slur' ? 'n0' : 'n1', endEventId: 'n3', type: 'crescendo', engraving: { offsetY: 0, height: 4 } }]
  }
  const project = createNativeProject(score)
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/range-span.chromatics', fileName: 'range-span.chromatics', contents: encodeNativeProject(project) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/range-span-saved.chromatics', fileName: 'range-span-saved.chromatics' })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' })); await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  fireEvent.click(screen.getByRole('button', { name: 'n0 선택' })); fireEvent.click(screen.getByRole('button', { name: 'n1 선택' }), { shiftKey: true })
  const rest = () => fireEvent.keyDown(window, { key: '0', code: 'Digit0' })
  if (kind.startsWith('delete')) fireEvent.keyDown(window, { key: 'Delete', code: 'Delete' }); else rest()
  if (kind === 'delete-hairpin') {
    expect(playbackMockState.lastScore).toEqual(score)
    expect(document.querySelector('.studio-status__result')?.textContent).toMatch(/^연결된 기호의 위치/)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    rest()
  }
  if (kind === 'rest-octave') {
    expect(playbackMockState.lastScore).toEqual(score)
    expect(document.querySelector('.studio-status__result')?.textContent).toMatch(/^옥타브 표시의 연결 음표/)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  } else {
    expect(playbackMockState.lastScore!.slurs).toEqual([score.slurs![1]])
    expect(playbackMockState.lastScore!.hairpins).toEqual(score.hairpins)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(() => createNativeProject(playbackMockState.lastScore!)).not.toThrow()
  }
  const completed = structuredClone(playbackMockState.lastScore!)
  openStudioWorkspace('파일'); await act(async () => fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' })))
  expect(window.inC.project.save).toHaveBeenCalledOnce()
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(completed)
  if (kind !== 'rest-octave') { fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(score) }
})
