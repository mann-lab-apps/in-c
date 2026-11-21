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
  const source = createNativeProject(createNewScore({ title: '7연음', templateId: 'duet', measureCount: 2,
    keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } }))
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/seven.chromatics', fileName: 'seven.chromatics', contents: encodeNativeProject(source) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score))
  fireEvent.click(screen.getByRole('button', { name: `${source.score.parts[0].staves[0].measures[0].voices[0].events[0].id} 선택` }))
  return source
}
function start() {
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '7연음 입력(7:4)' }))
}
function key(key: string, ctrlKey = false, shiftKey = false) {
  const code = /^[a-z]$/i.test(key) ? 'Key' + key.toUpperCase() : /^\d$/.test(key) ? 'Digit' + key : key
  fireEvent.keyDown(window, { key, code, ctrlKey, shiftKey })
}

it.each(['b', 'r'])('commits seven sixteenth slots including %s once and preserves neighbors, undo/native/XML/MIDI', async last => {
  const source = await setup(); start()
  expect(document.activeElement?.closest('.score-canvas')).not.toBeNull()
  expect(document.querySelector('.editor-status')).toHaveTextContent('7연음 0/7')
  for (const letter of ['c', 'd', 'e', 'f', 'g', 'a']) key(letter)
  expect(playbackMockState.lastScore).toEqual(source.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('7연음 6/7')
  key(last)
  const changed = structuredClone(playbackMockState.lastScore!), bar = changed.parts[0].staves[0].measures[0], voice = bar.voices[0]
  const members = voice.events.filter(e => e.duration.tuplet)
  expect(voice.tuplets?.[0]).toMatchObject({ actualNotes: 7, normalNotes: 4 })
  expect(members).toHaveLength(7)
  expect(members.map(e => e.position.tick)).toEqual([0, 1920, 3840, 5760, 7680, 9600, 11520])
  expect(members.map(e => e.duration)).toEqual(Array(7).fill({ value: '16th', dots: 0, tuplet: { actualNotes: 7, normalNotes: 4 } }))
  expect(members[6].type).toBe(last === 'r' ? 'rest' : 'note')
  expect(validateMeasureRhythm(bar).isExact).toBe(true)
  expect(changed.parts[0].staves[0].measures[1]).toEqual(source.score.parts[0].staves[0].measures[1])
  expect(changed.parts[1]).toEqual(source.score.parts[1])
  expect(decodeNativeProject(encodeNativeProject({ ...source, score: changed })).score).toEqual(changed)
  expect(serializeMidi(parseMusicXml(serializeMusicXml(changed)))).toEqual(serializeMidi(changed))
  key('Escape')
  expect(screen.getByRole('button', { name: '7연음 해제, 단축키 ⌘/Ctrl+3' }).querySelector('[data-music-glyph="tuplet7"]')).not.toBeNull()
  key('z', true); expect(playbackMockState.lastScore).toEqual(source.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('7연음 6/7')
  key('Escape'); key('z', true, true); expect(playbackMockState.lastScore).toEqual(changed)
  key('3', true)
  const removed = playbackMockState.lastScore!
  expect(removed.parts[0].staves[0].measures[0].voices[0].tuplets ?? []).toEqual([])
  expect(validateMeasureRhythm(removed.parts[0].staves[0].measures[0]).isExact).toBe(true)
  expect(() => createNativeProject(removed)).not.toThrow()
  key('z', true); expect(playbackMockState.lastScore).toEqual(changed)
})

it('blocks native save and nested presets, then cancels without a score command', async () => {
  const source = await setup(); start(); key('c'); key('s', true)
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('7연음 입력을 완료하거나 취소'))
  expect(window.inC.project.save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '추가' }))
  for (const name of ['2연음 입력(2:3)', '다섯잇단음표 입력(5:4)', '7연음 입력(7:4)']) expect(screen.getByRole('menuitem', { name })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '추가' })); key('3', true)
  expect(document.querySelector('.editor-status')).toHaveTextContent('7연음 입력을 취소했습니다.')
  expect(playbackMockState.lastScore).toEqual(source.score)
})

it.each(['pdf', 'midi'] as const)('preserves the request-time seven-input notice during late %s copy completion', async format => {
  const source = await setup(); start(); key('c')
  let finish!: (value: { filePath: string; fileName: string }) => void
  const callback = () => new Promise<{ filePath: string; fileName: string }>(resolve => { finish = resolve })
  if (format === 'pdf') vi.mocked(window.inC.pdf.save).mockImplementationOnce(callback)
  else vi.mocked(window.inC.midi.save).mockImplementationOnce(callback)
  openStudioWorkspace('내보내기'); const button = screen.getByRole('button', { name: format === 'pdf' ? 'PDF 변환' : 'MIDI 내보내기' })
  await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button)
  await waitFor(() => expect(format === 'pdf' ? window.inC.pdf.save : window.inC.midi.save).toHaveBeenCalledOnce())
  key('Escape'); await act(async () => finish({ filePath: '/fixture/seven.' + format, fileName: 'seven.' + format }))
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('미완성 7연음 입력은 포함되지 않았습니다.'))
  expect(playbackMockState.lastScore).toEqual(source.score)
})

it('documents the menu-only preset in the actual shortcut help', async () => {
  await setup(); fireEvent.click(screen.getByRole('button', { name: '도움말' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '단축키 도움말' }))
  const help = within(screen.getByRole('dialog', { name: '단축키 도움말' }))
  expect(help.getByText('7연음 입력(7:4)').closest('.studio-shortcut-row')).toHaveTextContent('전용 단축키 없음')
})
