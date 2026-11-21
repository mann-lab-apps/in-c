// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { createDuration, createNote, createTimePosition } from '../../score-core'
import { createNewScore, keySignaturePresets } from './editor/new-score'
import { serializeMidi } from './midi/serialize-midi'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
const presetLabel = keySignaturePresets.find(preset => preset.id === 'e-major')!.label
function transfer() {
  const values: Record<string, string> = {}
  return { effectAllowed: 'none', dropEffect: 'none', get types() { return Object.keys(values) },
    setData: vi.fn((type: string, value: string) => { values[type] = value }), getData: (type: string) => values[type] ?? '' }
}
async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const score = createNewScore({ title: '조표 끌기 검증', templateId: 'duet', measureCount: 3,
    keySignature: { fifths: 0, mode: 'major' }, timeSignature: { beats: 4, beatType: 4 } })
  for (const part of score.parts) for (const staff of part.staves) for (const measure of staff.measures) {
    measure.voices[0].events = [createNote({ id: measure.voices[0].events[0].id, position: createTimePosition(0),
      duration: createDuration('whole'), pitch: { step: 'C', octave: 4 } })]
  }
  const project = decodeNativeProject(encodeNativeProject(createNativeProject(score)))
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/key-drag.chromatics', fileName: 'key-drag.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />)
  fireEvent.click(screen.getByRole('button', { name: '파일' })); fireEvent.click(screen.getByRole('menuitem', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  const original = project.score.parts[0].staves[0].measures[0]
  fireEvent.click(screen.getByRole('button', { name: `${original.voices[0].events[0].id} 선택` }))
  fireEvent.click(screen.getByRole('button', { name: '음자리표·조표·박자표' }))
  const tile = screen.getByRole('button', { name: `${presetLabel} · 선택 보표의 이 마디부터 적용` })
  const measure = project.score.parts[1].staves[0].measures[1], event = measure.voices[0].events[0]
  // Projected SVG endpoint for App delegation; production uses actual native drag.
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  node.classList.add('notation-event'); node.dataset.eventId = event.id; node.dataset.measureId = measure.id
  node.getBoundingClientRect = () => ({ x: 100, y: 200, left: 100, top: 200, right: 120, bottom: 220, width: 20, height: 20, toJSON() {} })
  screen.getByTestId('notation-preview').append(node)
  return { project, tile, node, event, original, measure }
}
it('uses the dropped staff/bar instead of the old selection, preserves sounding pitch and makes one undo', async () => {
  const { project, tile, node, event, original, measure } = await setup(), data = transfer()
  expect(tile).toHaveAttribute('draggable', 'true')
  fireEvent.dragStart(tile, { dataTransfer: data }); fireEvent.dragOver(node, { dataTransfer: data })
  expect(data.setData).toHaveBeenCalledOnce(); expect(playbackMockState.lastScore).toEqual(project.score)
  expect(document.querySelector('.studio-palette-drop-highlight')).toBeInTheDocument()
  expect(screen.getByLabelText('조표 끌기 안내')).toHaveTextContent('2마디부터 이후 마디')
  fireEvent.drop(node, { dataTransfer: data })
  const expected = structuredClone(project.score)
  for (const bar of expected.parts[1].staves[0].measures.slice(1)) {
    bar.keySignature = { fifths: 4, mode: 'major' }
    const note = bar.voices[0].events[0]; if (note.type === 'note') note.pitch.alter = 0
  }
  const changed = structuredClone(playbackMockState.lastScore!)
  expect(changed).toEqual(expected); expect(serializeMidi(changed)).toEqual(serializeMidi(project.score))
  expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument()
  expect(decodeNativeProject(encodeNativeProject({ ...project, score: changed })).score).toEqual(changed)
  const again = transfer(); fireEvent.dragStart(tile, { dataTransfer: again }); fireEvent.drop(node, { dataTransfer: again })
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(project.score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
  const dir = process.env.STUDIO_KEY_DRAG_QA_DIR
  if (dir) {
    mkdirSync(dir, { recursive: true })
    for (const [name, value] of [['source', project], ['expected', { ...project, score: changed }]] as const)
      writeFileSync(join(dir, `${name}.chromatics`), encodeNativeProject(value), { flag: 'wx' })
    writeFileSync(join(dir, 'case.json'), JSON.stringify({ label: presetLabel, firstEventId: original.voices[0].events[0].id, targetEventId: event.id, targetMeasureId: measure.id, source: 'source.chromatics', expected: 'expected.chromatics' }, null, 2), { flag: 'wx' })
  }
})
it.each(['dragend', 'blur'] as const)('cancels a key hover on %s without changing the score', async phase => {
  const { project, tile, node } = await setup(), data = transfer()
  expect(tile).toHaveAttribute('draggable', 'true'); fireEvent.dragStart(tile, { dataTransfer: data }); fireEvent.dragOver(node, { dataTransfer: data })
  expect(document.querySelector('.studio-palette-drop-highlight')).toBeInTheDocument()
  if (phase === 'dragend') fireEvent.dragEnd(tile); else fireEvent.blur(window)
  expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument()
  fireEvent.drop(node, { dataTransfer: data }); expect(playbackMockState.lastScore).toEqual(project.score)
})
it('rejects external or forged payloads and yields the source tooltip to the canvas', async () => {
  const { project, tile, node } = await setup(), data = transfer()
  data.setData('text/plain', 'e-major'); fireEvent.drop(node, { dataTransfer: data }); expect(playbackMockState.lastScore).toEqual(project.score)
  act(() => tile.focus()); fireEvent.mouseEnter(tile.closest('.dd-tooltip-wrap')!)
  expect(screen.getByRole('tooltip')).toHaveTextContent(presetLabel)
  fireEvent.dragStart(tile, { dataTransfer: data }); expect(screen.getByLabelText('악보 캔버스')).toHaveFocus()
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  const type = data.types.find(type => type !== 'text/plain')!; data.setData(type, 'forged')
  fireEvent.drop(node, { dataTransfer: data }); expect(playbackMockState.lastScore).toEqual(project.score)
})
it('disables native drag while actual note input is active', async () => {
  const { tile, project, node } = await setup()
  fireEvent.keyDown(window, { key: 'n', code: 'KeyN' })
  expect(tile).toHaveAttribute('draggable', 'false')
  const data = transfer(); fireEvent.dragStart(tile, { dataTransfer: data }); fireEvent.drop(node, { dataTransfer: data })
  expect(data.setData).not.toHaveBeenCalled(); expect(playbackMockState.lastScore).toEqual(project.score)
})
it('invalidates the key payload when another document replaces the source', async () => {
  const { tile, node } = await setup(), data = transfer()
  fireEvent.dragStart(tile, { dataTransfer: data }); fireEvent.dragOver(node, { dataTransfer: data })
  expect(document.querySelector('.studio-palette-drop-highlight')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '파일' })); fireEvent.click(screen.getByRole('menuitem', { name: '새 악보 만들기' }))
  expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument()
  fireEvent.submit(screen.getByRole('form', { name: '새 악보 만들기' }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '새 악보 만들기' })).not.toBeInTheDocument())
  const next = structuredClone(playbackMockState.lastScore!)
  fireEvent.drop(node, { dataTransfer: data }); expect(playbackMockState.lastScore).toEqual(next)
})
