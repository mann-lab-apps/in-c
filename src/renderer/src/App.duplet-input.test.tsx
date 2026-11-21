// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../musicxml'
import { validateMeasureRhythm } from '../../score-core'
import { createNewScore } from './editor/new-score'
import { serializeMidi } from './midi/serialize-midi'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'

registerAppTestHooks()
beforeEach(() => { Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }) })
async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = createNativeProject(createNewScore({ title: 'Duplet', measureCount: 2,
    keySignature: { fifths: 0 }, timeSignature: { beats: 3, beatType: 8 } }))
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/duplet.chromatics', fileName: 'duplet.chromatics', contents: encodeNativeProject(source) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score))
  fireEvent.click(screen.getByRole('button', { name: `${source.score.parts[0].staves[0].measures[0].voices[0].events[0].id} 선택` }))
  return source
}
function start() {
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '2연음 입력(2:3)' }))
}
function key(key: string, ctrlKey = false, shiftKey = false) {
  const code = /^[a-z]$/i.test(key) ? 'Key' + key.toUpperCase() : /^\d$/.test(key) ? 'Digit' + key : key
  fireEvent.keyDown(window, { key, code, ctrlKey, shiftKey })
}

it.each(['d', 'r'])('commits two eighth-note slots including %s once with exact undo/native/XML/MIDI', async second => {
  const source = await setup(); start()
  expect(document.activeElement?.closest('.score-canvas')).not.toBeNull()
  expect(document.querySelector('.editor-status')).toHaveTextContent('2연음 0/2')
  key('c'); expect(playbackMockState.lastScore).toEqual(source.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('2연음 1/2')
  key(second)
  const changed = structuredClone(playbackMockState.lastScore!), bar = changed.parts[0].staves[0].measures[0], voice = bar.voices[0]
  expect(voice.tuplets?.[0]).toMatchObject({ actualNotes: 2, normalNotes: 3 })
  expect(voice.events).toHaveLength(2)
  expect(voice.events.map(e => e.position.tick)).toEqual([0, 10080])
  expect(voice.events.map(e => e.duration)).toEqual(Array(2).fill({ value: 'eighth', dots: 0, tuplet: { actualNotes: 2, normalNotes: 3 } }))
  expect(voice.events[1].type).toBe(second === 'r' ? 'rest' : 'note')
  expect(validateMeasureRhythm(bar).isExact).toBe(true)
  expect(changed.parts[0].staves[0].measures[1]).toEqual(source.score.parts[0].staves[0].measures[1])
  expect(decodeNativeProject(encodeNativeProject({ ...source, score: changed })).score).toEqual(changed)
  expect(serializeMidi(parseMusicXml(serializeMusicXml(changed)))).toEqual(serializeMidi(changed))
  key('Escape')
  const remove = screen.getByRole('button', { name: '2연음 해제, 단축키 ⌘/Ctrl+3' })
  expect(remove.querySelector('svg[data-music-glyph="tuplet2"]')).not.toBeNull()
  key('z', true); expect(playbackMockState.lastScore).toEqual(source.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('2연음 1/2')
  key('Escape'); key('z', true, true); expect(playbackMockState.lastScore).toEqual(changed)
  key('3', true); expect(playbackMockState.lastScore!.parts[0].staves[0].measures[0].voices[0].tuplets ?? []).toEqual([])
  key('z', true); expect(playbackMockState.lastScore).toEqual(changed)
})

it('keeps pending input local, blocks project save/nesting and retains Ctrl/Cmd+3 cancellation', async () => {
  const source = await setup(); start(); key('c'); key('s', true)
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('2연음 입력을 완료하거나 취소'))
  expect(window.inC.project.save).not.toHaveBeenCalled(); expect(playbackMockState.lastScore).toEqual(source.score)
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  expect(screen.getByRole('menuitem', { name: '2연음 입력(2:3)' })).toBeDisabled()
  expect(screen.getByRole('menuitem', { name: '다섯잇단음표 입력(5:4)' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '추가' })); key('3', true)
  expect(document.querySelector('.editor-status')).toHaveTextContent('2연음 입력을 취소했습니다.')
  expect(playbackMockState.lastScore).toEqual(source.score)
})

it.each(['pdf', 'midi'] as const)('retains the request-time pending label after cancellation during %s copy', async format => {
  const source = await setup(); start(); key('c')
  let finish!: (value: { filePath: string; fileName: string }) => void
  const callback = () => new Promise<{ filePath: string; fileName: string }>(resolve => { finish = resolve })
  if (format === 'pdf') vi.mocked(window.inC.pdf.save).mockImplementationOnce(callback)
  else vi.mocked(window.inC.midi.save).mockImplementationOnce(callback)
  openStudioWorkspace('내보내기')
  const button = screen.getByRole('button', { name: format === 'pdf' ? 'PDF 변환' : 'MIDI 내보내기' })
  await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button)
  await waitFor(() => expect(format === 'pdf' ? window.inC.pdf.save : window.inC.midi.save).toHaveBeenCalledOnce())
  key('Escape'); await act(async () => finish({ filePath: '/fixture/two.' + format, fileName: 'two.' + format }))
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('미완성 2연음 입력은 포함되지 않았습니다.'))
  expect(playbackMockState.lastScore).toEqual(source.score)
})

it('lists the real menu-only preset and retained voice keys in shortcut help', async () => {
  const source = await setup()
  fireEvent.click(screen.getByRole('button', { name: '도움말' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '단축키 도움말' }))
  const help = within(screen.getByRole('dialog', { name: '단축키 도움말' }))
  expect(help.getByText('2연음 입력(2:3)').closest('.studio-shortcut-row')).toHaveTextContent('전용 단축키 없음')
  expect(help.getByText('성부 직접 선택').closest('.studio-shortcut-row')).toHaveTextContent('⌘/Ctrl+Alt+1–4')
  expect(playbackMockState.lastScore).toEqual(source.score)
})
