// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chordNeighborCases, chordNeighborFixture } from '../../testing/chord-neighbor-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../musicxml'
import { type Note } from '../../score-core'
import { serializeMidi } from './midi/serialize-midi'
import { expandNoteDetails, focusTestBody, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each(chordNeighborCases)('preserves unselected sounding pitches through App chord editing: $kind', async ({ operation, style, kind }) => {
  const data = chordNeighborFixture(operation, style), before = structuredClone(data.project.score)
  window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
  vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/fixture/chord-neighbor.chromatics', fileName: 'chord-neighbor.chromatics', contents: encodeNativeProject(data.project) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(before))
  fireEvent.click(screen.getByRole('button', { name: 'qa-leading 선택' })); expandNoteDetails()
  const action = () => {
    if (operation === 'shift-E') { focusTestBody(); fireEvent.keyDown(window, { key: 'E', code: 'KeyE', shiftKey: true }); return }
    const region = screen.getByRole('region', { name: '선택 음표의 화음' })
    fireEvent.click(within(region).getByRole('button', { name: operation === 'add-third' ? '3도 추가' : operation === 'add-fifth' ? '5도 추가' : 'E#4 구성음 제거' }))
  }
  action()
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  const after = structuredClone(playbackMockState.lastScore!)
  const note = after.parts[0].staves[0].measures[0].voices[0].events[0] as Note
  expect(note).toEqual(data.expectedNote)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', 'qa-leading')
  const output = process.env.DDIRORI_CHORD_NEIGHBOR_QA_DIR
  if (output) {
    const dir = join(output, kind); mkdirSync(dir, { recursive: true })
    for (const [name, contents] of Object.entries({
      'source.chromatics': encodeNativeProject(data.project),
      'reference-explicit.chromatics': encodeNativeProject(createNativeProject(data.reference)),
      'expected.mid': serializeMidi(data.reference),
      'current-command.chromatics': encodeNativeProject(createNativeProject(after)),
      'oracle.json': JSON.stringify({ operation, style, kind, expectedNote: data.expectedNote }, null, 2)
    })) writeFileSync(join(dir, name), contents, { flag: 'wx' })
  }
  expect(serializeMidi(after)).toEqual(serializeMidi(data.reference))
  expect(serializeMidi(parseMusicXml(serializeMusicXml(after)))).toEqual(serializeMidi(data.reference))
  expect(after.parts[0].staves[0].measures[0].voices[1]).toEqual(before.parts[0].staves[0].measures[0].voices[1])
  expect(after.parts[0].staves[0].measures[1]).toEqual(before.parts[0].staves[0].measures[1])
  expect(after.slurs).toEqual(before.slurs)
  if (style === 'explicit' || operation === 'shift-E') expect(after.parts[0].staves[0].measures[0].voices[0].events.slice(1)).toEqual(before.parts[0].staves[0].measures[0].voices[0].events.slice(1))
  if (operation !== 'remove-upper') { action(); expect(playbackMockState.lastScore).toEqual(after); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정') }
  focusTestBody(); await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(after)
  focusTestBody(); fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(before)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(after)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  expect(data.project.score).toEqual(before)
}, 15_000)
