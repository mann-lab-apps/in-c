// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNote } from '../../score-core'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../../project/schema'
import { createNewScore } from './editor/new-score'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()

it.each(['편집', '우클릭', 'Delete', 'Backspace'])('clears one staff without removing the bar via %s', async entry => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = createNativeProject(createNewScore({ title: '마디 내용 검증', templateId: 'duet',
    measureCount: 3, keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } }))
  const bar = source.score.parts[0].staves[0].measures[1]
  const rest = bar.voices[0].events[0]
  bar.voices[0].events[0] = createNote({ id: rest.id, duration: rest.duration, pitch: { step: 'C', octave: 4 } })
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({
    filePath: '/fixture/clear-bar.chromatics', fileName: 'clear-bar.chromatics', contents: encodeNativeProject(source)
  })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score))
  const target = screen.getByRole('button', { name: '2마디 선택' })
  if (entry === '우클릭') {
    fireEvent.contextMenu(target, { clientX: 220, clientY: 160 })
    fireEvent.click(within(screen.getByRole('menu', { name: '마디 작업' }))
      .getByRole('menuitem', { name: '이 보표의 마디 내용 지우기' }))
  } else if (entry === '편집') {
    fireEvent.click(target)
    fireEvent.click(screen.getByRole('button', { name: '편집' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '이 보표의 마디 내용 지우기' }))
  } else {
    fireEvent.click(target)
    fireEvent.keyDown(window, { key: entry, code: entry })
  }
  const changed = playbackMockState.lastScore!
  expect(changed.parts[0].staves[0].measures.map(measure => measure.id)).toEqual(
    source.score.parts[0].staves[0].measures.map(measure => measure.id))
  expect(changed.parts[0].staves[0].measures[1].voices[0].events).toMatchObject([{ type: 'rest', fullMeasure: true }])
  expect(changed.parts[1]).toEqual(source.score.parts[1])
  expect(decodeNativeProject(encodeNativeProject({ ...source, score: changed })).score).toEqual(changed)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(source.score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(changed)
  const removeKey = entry === 'Delete'
    ? { key: 'Delete', code: 'Delete', ctrlKey: true }
    : { key: 'Backspace', code: 'Backspace', metaKey: true }
  const text = document.createElement('input')
  document.body.append(text)
  try {
    text.focus()
    fireEvent.keyDown(text, removeKey)
    expect(playbackMockState.lastScore).toEqual(changed)
  } finally {
    text.remove()
  }
  fireEvent.keyDown(window, { ...removeKey, isComposing: true })
  expect(playbackMockState.lastScore).toEqual(changed)
  fireEvent.keyDown(window, removeKey)
  expect(playbackMockState.lastScore!.parts.map(part => part.staves[0].measures.length)).toEqual([2, 2])
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(changed)
})
