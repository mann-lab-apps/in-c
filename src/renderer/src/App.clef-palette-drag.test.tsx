// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject, type NativeProject } from '../../project/schema'
import { createNewScore } from './editor/new-score'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
function transfer() {
  const values: Record<string, string> = {}
  return { values, effectAllowed: 'none', dropEffect: 'none', get types() { return Object.keys(values) },
    setData: vi.fn((type: string, value: string) => { values[type] = value }), getData: (type: string) => values[type] ?? '' }
}
function target(measureId: string, eventId: string) {
  // Explicit projected-SVG fixture for App delegation. Actual SVG/HTML drag is
  // covered separately in production; this is not a hidden product control.
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  node.classList.add('notation-event'); node.dataset.measureId = measureId; node.dataset.eventId = eventId
  node.getBoundingClientRect = () => ({ x: 100, y: 200, left: 100, top: 200, right: 120, bottom: 220, width: 20, height: 20, toJSON() {} })
  screen.getByTestId('notation-preview').append(node)
  return node
}
async function setup(selected = true, provided?: NativeProject) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  if (provided) vi.mocked(window.inC.project.open).mockResolvedValueOnce({
    filePath: '/fixture/clef-octave.chromatics', fileName: 'clef-octave.chromatics', contents: encodeNativeProject(provided)
  })
  const { App } = await import('./App'); render(<App />)
  if (provided) {
    fireEvent.click(screen.getByRole('button', { name: '파일' })); fireEvent.click(screen.getByRole('menuitem', { name: '프로젝트 열기' }))
    await waitFor(() => expect(playbackMockState.lastScore).toEqual(provided.score))
  }
  const before = structuredClone(playbackMockState.lastScore!)
  if (selected) fireEvent.click(screen.getByRole('button', { name: '1마디 선택' }))
  fireEvent.click(screen.getByRole('button', { name: '음자리표·조표·박자표' }))
  const tile = screen.getByRole('button', { name: '낮은음자리표 · 선택 마디에 적용' })
  const bar = before.parts[0].staves[0].measures[1]
  return { before, tile, bar, node: target(bar.id, bar.voices[0].events[0].id) }
}

it('drags a clef to the actual target bar with no hover mutation and one exact undo/redo', async () => {
  const { before, tile, node, bar } = await setup(), data = transfer()
  expect(tile).toHaveAttribute('draggable', 'true')
  fireEvent.dragStart(tile, { dataTransfer: data }); expect(data.setData).toHaveBeenCalledOnce()
  fireEvent.dragOver(node, { dataTransfer: data })
  expect(playbackMockState.lastScore).toEqual(before)
  expect(screen.getByLabelText('음자리표 끌기 안내')).toHaveTextContent(`${bar.number}마디`)
  expect(document.querySelector('.studio-palette-drop-highlight')).toBeInTheDocument()
  fireEvent.drop(node, { dataTransfer: data })
  const changed = structuredClone(playbackMockState.lastScore!), expected = structuredClone(before)
  expected.parts[0].staves[0].measures[1].clef = { sign: 'F', line: 4 }
  expect(changed).toEqual(expected)
  expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument()
  // Dropping the same value again is a view action, not another command.
  const again = transfer(); fireEvent.dragStart(tile, { dataTransfer: again }); fireEvent.drop(node, { dataTransfer: again })
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(changed))).score).toEqual(changed)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(before)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
})
it('clears hover on drag cancellation without applying to the old selection', async () => {
  const { before, tile, node } = await setup(), data = transfer()
  expect(tile).toHaveAttribute('draggable', 'true')
  fireEvent.dragStart(tile, { dataTransfer: data }); fireEvent.dragOver(node, { dataTransfer: data }); fireEvent.dragEnd(tile)
  expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument()
  fireEvent.drop(node, { dataTransfer: data }); expect(playbackMockState.lastScore).toEqual(before)
})
it('rejects external payloads and unsupported destinations', async () => {
  const { before, tile, node } = await setup(), data = transfer()
  expect(tile).toHaveAttribute('draggable', 'true')
  data.setData('text/plain', 'bass'); fireEvent.drop(node, { dataTransfer: data })
  expect(playbackMockState.lastScore).toEqual(before)
  fireEvent.dragStart(tile, { dataTransfer: data })
  const privateType = data.types.find(type => type !== 'text/plain')!
  data.values[privateType] = 'not-the-source-token'
  fireEvent.drop(node, { dataTransfer: data }); expect(playbackMockState.lastScore).toEqual(before)
  fireEvent.dragStart(tile, { dataTransfer: data }); fireEvent.drop(screen.getByLabelText('악보 캔버스'), { dataTransfer: data })
  expect(playbackMockState.lastScore).toEqual(before)
  fireEvent.drop(node, { dataTransfer: data }); expect(playbackMockState.lastScore).toEqual(before)
})
it('does not start a drag while note entry owns the input draft', async () => {
  const { before, tile, node } = await setup()
  fireEvent.keyDown(window, { key: 'n', code: 'KeyN' })
  expect(screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' })).toHaveAttribute('aria-pressed', 'true')
  expect(tile).toHaveAttribute('draggable', 'false')
  const data = transfer(); fireEvent.dragStart(tile, { dataTransfer: data }); fireEvent.drop(node, { dataTransfer: data })
  expect(data.setData).not.toHaveBeenCalled(); expect(playbackMockState.lastScore).toEqual(before)
})
it('retains the existing disabled policy when no measure has been selected', async () => {
  const { before, tile } = await setup(false)
  expect(tile).toBeDisabled(); expect(tile).toHaveAttribute('draggable', 'false')
  expect(playbackMockState.lastScore).toEqual(before)
})
it('clears a registered drag and its UI highlight on window blur', async () => {
  const { before, tile, node } = await setup(), data = transfer()
  fireEvent.dragStart(tile, { dataTransfer: data }); fireEvent.dragOver(node, { dataTransfer: data })
  expect(document.querySelector('.studio-palette-drop-highlight')).toBeInTheDocument()
  fireEvent.blur(window); expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument()
  fireEvent.drop(node, { dataTransfer: data }); expect(playbackMockState.lastScore).toEqual(before)
})
it('dismisses source tooltip and gives keyboard ownership to the canvas at dragstart', async () => {
  const { before, tile } = await setup()
  act(() => tile.focus())
  fireEvent.mouseEnter(tile.closest('.dd-tooltip-wrap')!)
  expect(screen.getByRole('tooltip')).toHaveTextContent('낮은음자리표')
  fireEvent.dragStart(tile, { dataTransfer: transfer() })
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  expect(screen.getByLabelText('악보 캔버스')).toHaveFocus()
  expect(playbackMockState.lastScore).toEqual(before)
})
it('invalidates an old drag when a different document is created', async () => {
  const { tile, node } = await setup(), data = transfer()
  expect(tile).toHaveAttribute('draggable', 'true'); fireEvent.dragStart(tile, { dataTransfer: data })
  fireEvent.dragOver(node, { dataTransfer: data })
  fireEvent.click(screen.getByRole('button', { name: '파일' })); fireEvent.click(screen.getByRole('menuitem', { name: '새 악보 만들기' }))
  const d = within(screen.getByRole('dialog', { name: '새 악보 만들기' }))
  expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument()
  fireEvent.submit(d.getByRole('form', { name: '새 악보 만들기' }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '새 악보 만들기' })).not.toBeInTheDocument())
  const next = structuredClone(playbackMockState.lastScore!), bar = next.parts[0].staves[0].measures[0]
  fireEvent.drop(target(bar.id, bar.voices[0].events[0].id), { dataTransfer: data })
  expect(playbackMockState.lastScore).toEqual(next)
})

it.each([-1, 1].flatMap(octave => ['click', 'drag'].map(method => ({ octave, method }))))(
  'preserves no-edit imported clef $octave but explicitly resets it through $method', async ({ octave, method }) => {
    const score = createNewScore({ title: 'Clef octave reset', templateId: 'duet', measureCount: 2,
      keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
    score.parts[0].staves[0].measures[1].clef = { sign: 'G', line: 2, octaveChange: octave }
    const { before, node } = await setup(true, createNativeProject(score))
    expect(before).toEqual(score)
    const tile = screen.getByRole('button', { name: '높은음자리표 · 선택 마디에 적용' })
    if (method === 'click') {
      fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))
      expect(screen.getByLabelText('음자리표 끌기 안내')).toHaveTextContent('옥타브')
      fireEvent.click(tile)
    } else {
      const data = transfer(); fireEvent.dragStart(tile, { dataTransfer: data }); fireEvent.drop(node, { dataTransfer: data })
    }
    const expected = structuredClone(before); expected.parts[0].staves[0].measures[1].clef = { sign: 'G', line: 2 }
    expect(playbackMockState.lastScore).toEqual(expected)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(playbackMockState.lastScore!))).score).toEqual(expected)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(before)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(expected)
  }
)
