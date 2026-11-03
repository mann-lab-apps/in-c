// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { TICKS_PER_QUARTER as T, createDuration, createMeasure, createNote, createPart,
  createRest, createScore, createStaff, createTimePosition, createVoice } from '../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each(['delete-fermata', 'delete-span', 'grow-fermata', 'grow-breath', 'grow-caesura', 'grow-span'])('studio.rhythm-rest-preservation keeps the unselected neighbour in %s', async kind => {
  const isGrow = kind.startsWith('grow'), isSpan = kind.endsWith('span'), wholeRestConsumed = isGrow && isSpan,
    selected = createNote({ id: 'selected', pitch: { step: 'C', octave: 4 } }),
    protectedRest = createRest({ id: 'protected', position: createTimePosition(T), duration: createDuration(wholeRestConsumed ? 'quarter' : 'half'), ...(isSpan ? {} : kind.endsWith('breath') ? { breathMark: 'breath' as const } : kind.endsWith('caesura') ? { breathMark: 'caesura' as const } : { fermata: true }) }),
    other = createNote({ id: 'other', position: createTimePosition(wholeRestConsumed ? 2 * T : 3 * T), duration: createDuration(wholeRestConsumed ? 'half' : 'quarter'), pitch: { step: 'D', octave: 4 } }),
    score = createScore({ ...(isSpan ? { hairpins: [{ id: 'span', type: 'crescendo' as const, startEventId: 'protected', endEventId: 'other', engraving: { offsetY: 0, height: 4 } }] } : {}),
      parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events: [selected, protectedRest, other] })] })] })] })] }), project = createNativeProject(score)
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/rest-neighbour.chromatics', fileName: 'rest-neighbour.chromatics', contents: encodeNativeProject(project) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/rest-neighbour-saved.chromatics', fileName: 'rest-neighbour-saved.chromatics' })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' })); await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  fireEvent.click(screen.getByRole('button', { name: 'selected 선택' }))
  if (isGrow) fireEvent.click(screen.getByRole('button', { name: '2분음표, 단축키 6' }))
  else fireEvent.keyDown(window, { key: 'Delete', code: 'Delete' })
  if (isGrow) {
    expect(playbackMockState.lastScore).toEqual(score)
    const reason = isSpan ? '구간 기호가 연결된 쉼표' : kind.endsWith('breath') ? '숨표가 붙은 쉼표' : kind.endsWith('caesura') ? '중지표가 붙은 쉼표' : '페르마타가 붙은 쉼표'
    expect(document.querySelector('.studio-status__result')?.textContent).toMatch(new RegExp(`^${reason}`))
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  } else {
    const result = playbackMockState.lastScore!
    expect(result.parts[0].staves[0].measures[0].voices[0].events.find(e => e.id === 'protected')).toEqual(protectedRest)
    expect(result.hairpins).toEqual(score.hairpins); expect(() => createNativeProject(result)).not.toThrow()
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  }
  const expected = structuredClone(playbackMockState.lastScore!)
  openStudioWorkspace('파일'); await act(async () => fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' })))
  expect(window.inC.project.save).toHaveBeenCalledOnce()
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(expected)
  if (!isGrow) { fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(score) }
})
