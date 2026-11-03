// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { TICKS_PER_QUARTER as T, createMeasure, createNote, createPart, createScore, createStaff, createTimePosition, createVoice } from '../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each(['slur', 'hairpin', 'octave'] as const)('studio.paste-span-preservation keeps Native valid for %s', async kind => {
  const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events:
    (['C', 'D', 'E', 'F'] as const).map((step, i) => createNote({ id: `n${i}`, position: createTimePosition(i * T), pitch: { step, octave: 4 } }))
  })] })] })] })] })
  if (kind === 'slur') score.slurs = [{ id: 'affected', startEventId: 'n2', endEventId: 'n3', engraving: { offsetY: 0, height: 4 } }, { id: 'neighbor', startEventId: 'n0', endEventId: 'n1', engraving: { offsetY: -2 } }]
  if (kind === 'hairpin') score.hairpins = [{ id: 'keep', startEventId: 'n2', endEventId: 'n3', type: 'crescendo', engraving: { offsetY: 0, height: 4 } }]
  if (kind === 'octave') score.octaveShifts = [{ id: 'keep', type: '8va', startEventId: 'n2', endEventId: 'n3' }]
  const project = createNativeProject(score)
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/paste-span.chromatics', fileName: 'paste-span.chromatics', contents: encodeNativeProject(project) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/paste-span-saved.chromatics', fileName: 'paste-span-saved.chromatics' })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' })); await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  fireEvent.click(screen.getByRole('button', { name: 'n0 선택' })); fireEvent.keyDown(window, { key: 'c', code: 'KeyC', ctrlKey: true })
  fireEvent.click(screen.getByRole('button', { name: 'n2 선택' })); fireEvent.keyDown(window, { key: 'v', code: 'KeyV', ctrlKey: true })
  if (kind === 'slur') {
    expect(playbackMockState.lastScore!.slurs).toEqual([score.slurs![1]])
    expect(playbackMockState.lastScore!.parts[0].staves[0].measures[0].voices[0].events[2]).toMatchObject({ pitch: { step: 'C', octave: 4 } })
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  } else {
    expect(playbackMockState.lastScore).toEqual(score)
    expect(document.querySelector('.studio-status__result')?.textContent).toMatch(kind === 'octave' ? /^옥타브 표시의 연결 위치/ : /^구간 기호의 연결 위치/)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  }
  expect(() => createNativeProject(playbackMockState.lastScore!)).not.toThrow()
  const completed = structuredClone(playbackMockState.lastScore!)
  openStudioWorkspace('파일'); await act(async () => fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' })))
  expect(window.inC.project.save).toHaveBeenCalledOnce()
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(completed)
  if (kind === 'slur') { fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(score) }
})
