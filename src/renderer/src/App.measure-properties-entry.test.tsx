// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createNewScore } from './editor/new-score'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../../project/schema'
import { registerAppTestHooks, playbackMockState, openStudioWorkspace } from './App.test-harness'
import { serializeMidi } from './midi/serialize-midi'
registerAppTestHooks()
it('opens the chosen measure properties without a command and keeps the existing one-bar edit/undo contract', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = createNativeProject(createNewScore({ title: 'Measure properties QA', templateId: 'string-quartet', measureCount: 3, keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } }))
  const neighbor = source.score.parts[0].staves[0].measures[2].voices[0].events[0]
  source.score.parts[0].staves[0].measures[2].voices[0].events[0] = { id: neighbor.id, position: neighbor.position, duration: neighbor.duration, type: 'note', pitch: { step: 'C', octave: 4 } }
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/properties.chromatics', fileName: 'properties.chromatics', contents: encodeNativeProject(source) })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score))
  fireEvent.contextMenu(screen.getByRole('button', { name: '2마디 선택' }), { clientX: 200, clientY: 180 })
  fireEvent.click(within(screen.getByRole('menu', { name: '마디 작업' })).getByRole('menuitem', { name: '마디 속성…' }))
  expect(screen.queryByRole('menu', { name: '마디 작업' })).not.toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('combobox', { name: '조표' })).toHaveFocus())
  expect(playbackMockState.lastScore).toEqual(source.score)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-measure-id', source.score.parts[0].staves[0].measures[1].id)
  expect(screen.getByText(/박자표 적용:.*2마디.*선택 보표의 이 마디만/)).toBeVisible()
  const meter = screen.getByRole('combobox', { name: '박자표' }); fireEvent.click(meter); fireEvent.click(screen.getByRole('option', { name: '3/4' }))
  const changed = playbackMockState.lastScore!
  expect(changed.parts[0].staves[0].measures[1].timeSignature).toEqual({ beats: 3, beatType: 4 })
  expect(changed.parts[0].staves[0].measures[0]).toEqual(source.score.parts[0].staves[0].measures[0])
  expect(changed.parts[0].staves[0].measures[2]).toEqual(source.score.parts[0].staves[0].measures[2])
  expect(changed.parts.slice(1)).toEqual(source.score.parts.slice(1))
  expect(decodeNativeProject(encodeNativeProject({ ...source, score: changed })).score).toEqual(changed)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source.score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
  const directory = process.env.STUDIO_MEASURE_PROPERTIES_QA_DIR
  if (directory) {
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, 'source.chromatics'), encodeNativeProject(source))
    writeFileSync(join(directory, 'expected.chromatics'), encodeNativeProject({ ...source, score: changed }))
    writeFileSync(join(directory, 'source.mid'), serializeMidi(source.score))
    writeFileSync(join(directory, 'expected.mid'), serializeMidi(changed))
  }
})
