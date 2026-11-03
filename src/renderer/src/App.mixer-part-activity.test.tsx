// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMeasure, createNote, createPart, createRest, createScore, createStaff, createTimePosition, createVoice, TICKS_PER_QUARTER as T } from '../../score-core'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { createPlaybackTimeline } from './playback/timeline'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it('shows each current sounding part and respects mute, solo, volume, rests and pause without editing the score', async () => {
  const part = (id: string, name: string) => createPart({ id, name, staves: [createStaff({ id: id + '-staff', measures: [createMeasure({ id: id + '-measure', voices: [createVoice({ events: [
    createNote({ id: id + '-note', position: createTimePosition(0), pitch: { step: 'C', octave: 4, alter: 0 }, duration: { value: 'half', dots: 0 } }),
    createRest({ id: id + '-rest', position: createTimePosition(2 * T), duration: { value: 'half', dots: 0 } })
  ] })] })] })] })
  const source = createScore({ parts: [part('upper', 'Upper'), part('lower', 'Lower')] })
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/test/mixer-activity.chromatics', fileName: 'mixer-activity.chromatics', contents: encodeNativeProject(createNativeProject(source)) })
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { App } = await import('./App'); const view = render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
  const setPlayback = (status: 'playing' | 'paused' | 'stopped', beat = .5) => act(() => {
    playbackMockState.value = { ...playbackMockState.value, status, positionBeat: beat, activeEvent: createPlaybackTimeline(source).events[0] }
    view.rerender(<App />)
  })
  setPlayback('playing'); openStudioWorkspace('재생')
  const mixer = within(screen.getByLabelText('파트 믹서'))
  const expectActivity = (upper: boolean, lower: boolean) => {
    expect(mixer.getByLabelText('Upper 재생 상태').textContent).toBe(upper ? '재생 중' : '대기')
    expect(mixer.getByLabelText('Lower 재생 상태').textContent).toBe(lower ? '재생 중' : '대기')
  }
  expectActivity(true, true)
  fireEvent.click(mixer.getByLabelText('Lower 음소거')); expectActivity(true, false)
  fireEvent.click(mixer.getByLabelText('Lower 음소거')); expectActivity(true, true)
  fireEvent.click(mixer.getByLabelText('Lower 솔로')); expectActivity(false, true)
  fireEvent.click(mixer.getByLabelText('Lower 솔로')); expectActivity(true, true)
  fireEvent.change(mixer.getByRole('slider', { name: /^Lower 볼륨/ }), { target: { value: '0' } }); expectActivity(true, false)
  fireEvent.change(mixer.getByRole('slider', { name: /^Lower 볼륨/ }), { target: { value: '100' } }); expectActivity(true, true)
  setPlayback('paused'); expectActivity(false, false)
  setPlayback('playing', 2.5); expectActivity(false, false)
  setPlayback('stopped'); expectActivity(false, false)
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(window.inC.project.save).not.toHaveBeenCalled()
})
