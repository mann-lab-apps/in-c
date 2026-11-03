// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { TICKS_PER_QUARTER as T, createMeasure, createNote, createPart, createScore, createStaff, createTimePosition, createVoice } from '../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each(['delete-slur', 'delete-octave', 'convert-octave'])('studio.note-span-removal preserves Native validity for %s', async kind => {
  const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events:
    (['C', 'D', 'E', 'F'] as const).map((step, i) => createNote({ id: `n${i}`, position: createTimePosition(i * T), pitch: { step, octave: 4 } }))
  })] })] })] })] })
  if (kind === 'delete-slur') {
    score.slurs = [{ id: 'affected', startEventId: 'n0', endEventId: 'n2', engraving: { offsetY: 0, height: 4 } }, { id: 'neighbor', startEventId: 'n1', endEventId: 'n3', engraving: { offsetY: -2 } }]
    score.hairpins = [{ id: 'keep', type: 'crescendo', startEventId: 'n0', endEventId: 'n3', engraving: { offsetY: 0, height: 4 } }]
  } else score.octaveShifts = [{ id: 'octave', type: '8va', startEventId: 'n0', endEventId: 'n2' }]
  const project = createNativeProject(score)
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/note-span.chromatics', fileName: 'note-span.chromatics', contents: encodeNativeProject(project) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/note-span-saved.chromatics', fileName: 'note-span-saved.chromatics' })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' })); await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  fireEvent.click(screen.getByRole('button', { name: 'n0 선택' }))
  if (kind === 'convert-octave') fireEvent.click(screen.getByRole('button', { name: '쉼표로 변환' }))
  else fireEvent.keyDown(window, { key: 'Delete', code: 'Delete' })
  if (kind === 'delete-slur') {
    expect(playbackMockState.lastScore!.slurs).toEqual([score.slurs![1]])
    expect(playbackMockState.lastScore!.hairpins).toEqual(score.hairpins)
    expect(playbackMockState.lastScore!.parts[0].staves[0].measures[0].voices[0].events[0].type).toBe('rest')
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(() => createNativeProject(playbackMockState.lastScore!)).not.toThrow()
  } else {
    expect(playbackMockState.lastScore).toEqual(score)
    expect(document.querySelector('.studio-status__result')?.textContent).toMatch(/^옥타브 표시의 연결 음표/)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  }
  const completed = structuredClone(playbackMockState.lastScore!)
  openStudioWorkspace('파일'); await act(async () => fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' })))
  expect(window.inC.project.save).toHaveBeenCalledOnce()
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(completed)
  if (kind === 'delete-slur') {
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(completed)
  }
})
