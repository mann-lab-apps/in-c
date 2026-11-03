// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { TICKS_PER_QUARTER as T, createMeasure, createNote, createPart, createRest, createScore, createStaff, createTimePosition, createVoice } from '../../score-core'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each(['notes', 'marked-rest', 'slur-hairpin', 'octave', 'tie', 'rests', 'cross-measure'] as const)('studio.range-rest-entry uses the existing supported contract for %s', async kind => {
  const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events:
    (['C', 'D', 'E', 'F'] as const).map((step, i) => createNote({ id: `n${i}`, position: createTimePosition(i * T), pitch: { step, octave: 4 } }))
  })] })] })] })] })
  const events = score.parts[0].staves[0].measures[0].voices[0].events
  if (kind === 'marked-rest' || kind === 'rests') events[1] = createRest({ id: 'n1', position: createTimePosition(T), fermata: true })
  if (kind === 'rests') events[0] = createRest({ id: 'n0', position: createTimePosition(0) })
  if (kind === 'octave') score.octaveShifts = [{ id: 'keep', type: '8va', startEventId: 'n0', endEventId: 'n2' }]
  if (kind === 'tie') {
    events[0] = { ...createNote({ id: 'n0', pitch: { step: 'C', octave: 4 } }), ties: { start: true } }
    events[1] = { ...createNote({ id: 'n1', position: createTimePosition(T), pitch: { step: 'C', octave: 4 } }), ties: { stop: true } }
  }
  if (kind === 'slur-hairpin') {
    score.slurs = [{ id: 'affected', startEventId: 'n0', endEventId: 'n2', engraving: { offsetY: 0, height: 4 } }]
    score.hairpins = [{ id: 'keep', type: 'crescendo', startEventId: 'n1', endEventId: 'n3', engraving: { offsetY: 0, height: 4 } }]
  }
  if (kind === 'cross-measure') score.parts[0].staves[0].measures.push(createMeasure({ id: 'm2', number: 2, voices: [createVoice({ id: score.parts[0].staves[0].measures[0].voices[0].id, events: events.map((e, i) => ({ ...e, id: `m2-n${i}` })) })] }))
  const project = createNativeProject(score)
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/range-rest.chromatics', fileName: 'range-rest.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' })); await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  fireEvent.click(screen.getByRole('button', { name: 'n0 선택' })); fireEvent.click(screen.getByRole('button', { name: `${kind === 'cross-measure' ? 'm2-n0' : 'n1'} 선택` }), { shiftKey: true })
  const button = screen.getByRole('button', { name: '쉼표로 변환' }), allowed = ['notes', 'marked-rest', 'slur-hairpin'].includes(kind)
  if (!allowed) { expect(button).toBeDisabled(); expect(playbackMockState.lastScore).toEqual(score); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정'); return }
  expect(button).toBeEnabled(); expect(screen.getByLabelText('도구 적용 대상')).toHaveTextContent('선택한 범위'); fireEvent.click(button)
  const result = playbackMockState.lastScore!, after = result.parts[0].staves[0].measures[0].voices[0].events
  expect(after.slice(0, 2).map(e => e.type)).toEqual(['rest', 'rest']); expect(after.map(e => e.id)).toEqual(events.map(e => e.id)); expect(after.slice(2)).toEqual(events.slice(2))
  if (kind === 'marked-rest') expect(after[1]).toEqual(events[1])
  if (kind === 'slur-hairpin') { expect(result.slurs).toEqual([]); expect(result.hairpins).toEqual(score.hairpins) }
  expect(() => createNativeProject(result)).not.toThrow(); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(score)
})
