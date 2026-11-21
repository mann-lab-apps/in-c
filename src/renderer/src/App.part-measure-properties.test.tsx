// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createNewScore } from './editor/new-score'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { registerAppTestHooks, playbackMockState, openStudioWorkspace, chooseScoreView } from './App.test-harness'
registerAppTestHooks()

it.each(['meter', 'key'] as const)('keeps nonprimary part measure properties %s scope, preview, native and exact undo', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = createNativeProject(createNewScore({ title: 'Part measure properties QA', templateId: 'string-quartet', measureCount: 3, keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } }))
  const partIndex = source.score.parts.length - 1, targetPart = source.score.parts[partIndex]
  for (const index of [0, partIndex]) {
    const event = source.score.parts[index].staves[0].measures[2].voices[0].events[0]
    source.score.parts[index].staves[0].measures[2].voices[0].events[0] = { id: event.id, position: event.position, duration: event.duration, type: 'note', pitch: { step: index === 0 ? 'C' : 'G', octave: index === 0 ? 4 : 2 } }
  }
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/part-properties.chromatics', fileName: 'part-properties.chromatics', contents: encodeNativeProject(source) })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score))
  chooseScoreView('악보 보기', 'part'); chooseScoreView('파트보 선택', targetPart.id)
  expect(playbackMockState.lastPreviewScore!.parts.map(part => part.id)).toEqual([targetPart.id])
  const beforePreview = structuredClone(playbackMockState.lastPreviewScore)
  fireEvent.contextMenu(screen.getByRole('button', { name: '2마디 선택' }), { clientX: 220, clientY: 170 })
  fireEvent.click(within(screen.getByRole('menu', { name: '마디 작업' })).getByRole('menuitem', { name: '마디 속성…' }))
  await waitFor(() => expect(screen.getByRole('combobox', { name: '조표' })).toHaveFocus())
  expect(playbackMockState.lastScore).toEqual(source.score)
  expect(playbackMockState.lastPreviewScore).toEqual(beforePreview)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-measure-id', targetPart.staves[0].measures[1].id)
  expect(screen.getByText(new RegExp('박자표 적용:.*' + targetPart.name + '.*2마디.*선택 보표의 이 마디만'))).toBeVisible()
  const field = screen.getByRole('combobox', { name: kind === 'meter' ? '박자표' : '조표' })
  fireEvent.click(field)
  fireEvent.click(screen.getByRole('option', { name: kind === 'meter' ? '3/4' : '사장조 (♯ 1개)' }))
  const changed = playbackMockState.lastScore!
  expect(changed.parts.slice(0, partIndex)).toEqual(source.score.parts.slice(0, partIndex))
  const measures = changed.parts[partIndex].staves[0].measures
  expect(measures[0]).toEqual(targetPart.staves[0].measures[0])
  if (kind === 'meter') {
    expect(measures[1].timeSignature).toEqual({ beats: 3, beatType: 4 })
    expect(measures[2]).toEqual(targetPart.staves[0].measures[2])
  } else {
    expect(measures.slice(1).map(measure => measure.keySignature.fifths)).toEqual([1, 1])
    expect(measures[2].voices).toEqual(targetPart.staves[0].measures[2].voices)
  }
  expect(playbackMockState.lastPreviewScore!.parts).toEqual([changed.parts[partIndex]])
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source.score)
  expect(playbackMockState.lastPreviewScore).toEqual(beforePreview)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
  expect(saved.score).toEqual(changed); expect(saved.view).toEqual({ mode: 'part', partId: targetPart.id })
  const directory = process.env.STUDIO_PART_MEASURE_PROPERTIES_QA_DIR
  if (directory && kind === 'meter') {
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, 'source.chromatics'), encodeNativeProject(source))
    writeFileSync(join(directory, 'expected.chromatics'), encodeNativeProject(saved))
    writeFileSync(join(directory, 'expected.mid'), serializeMidi({ ...changed, parts: [changed.parts[partIndex]] }))
  }
})
