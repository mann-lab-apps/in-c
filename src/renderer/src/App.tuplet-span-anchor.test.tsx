// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import {
  TICKS_PER_QUARTER as T, createDuration, createMeasure, createNote, createPart,
  createRest, createScore, createStaff, createTimePosition, createVoice, type VoiceEvent
} from '../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each(['create', 'compact-rest'] as const)('studio.tuplet-span-anchor keeps marked rests and rejects %s without starting a draft', async mode => {
  const rest = (id: string, tick: number, half = false) => createRest({ id, position: createTimePosition(tick), duration: createDuration(half ? 'half' : 'quarter') }),
    note = (tick: number) => createNote({ id: 'member', position: createTimePosition(tick), pitch: { step: 'C', octave: 4 } })
  let events: VoiceEvent[]
  if (mode === 'create') events = [note(0), rest('protected', T), rest('tail', 2 * T, true)]
  else {
    events = [rest('before', 0, true), note(2 * T), rest('kept-rest', 2 * T + 2 * T / 3), rest('protected', 2 * T + 4 * T / 3)]
    for (const e of events.slice(1)) e.duration = { ...e.duration, tuplet: { actualNotes: 3, normalNotes: 2 } }
  }
  const score = createScore({ hairpins: [{ id: 'span', startEventId: 'member', endEventId: 'protected', type: 'crescendo', engraving: { offsetY: 0, height: 4 } }], parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events,
    ...(mode !== 'create' ? { tuplets: [{ id: 'group', eventIds: ['member', 'kept-rest', 'protected'], actualNotes: 3, normalNotes: 2 }] } : {})
  })] })] })] })] }), project = createNativeProject(score)
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/span-anchor.chromatics', fileName: 'span-anchor.chromatics', contents: encodeNativeProject(project) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/span-anchor-saved.chromatics', fileName: 'span-anchor-saved.chromatics' })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' })); await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  const selected = mode === 'create' ? 'member' : 'kept-rest'
  fireEvent.click(screen.getByRole('button', { name: `${selected} 선택` }))
  fireEvent.click(screen.getByRole('button', { name: /셋잇단음표 적용 또는 입력 준비/ }))
  expect(document.querySelector('.editor-status')).toHaveTextContent('구간 기호의 연결 위치를 보존할 수 없어')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(document.querySelector('.editor-status')).not.toHaveTextContent('셋잇단음표 0/3')
  expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.click(screen.getByRole('button', { name: '편집' })); expect(screen.getByRole('menuitem', { name: '실행 취소' })).toBeDisabled()
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
  openStudioWorkspace('파일'); await act(async () => fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' })))
  expect(window.inC.project.save).toHaveBeenCalledOnce()
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(project)
})
