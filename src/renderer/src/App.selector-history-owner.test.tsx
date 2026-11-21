// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createRest, TICKS_PER_QUARTER } from '../../score-core'
import { createNativePartIdFixture } from '../../testing/native-part-id-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMusicXml } from '../../musicxml'
import { serializeMidi } from './midi/serialize-midi'
import { focusTestBody, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
const fields = ['현재 보표 음자리표', '현재 파트 이조', '조표', '박자표'] as const
async function setup(label: typeof fields[number]) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const score = createNativePartIdFixture(['owner-first', 'owner-second'])
  score.title = '선택기와 문서 실행 취소'
  score.parts.forEach((part, index) => {
    const voice = part.staves[0].measures[0].voices[0]
    voice.events[0].duration = { value: 'quarter', dots: 0 }
    voice.events.push(createRest({ id: 'owner-rest-' + index, duration: { value: 'half', dots: 1 }, position: { tick: TICKS_PER_QUARTER } }))
  })
  const project = createNativeProject(score)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'history-owner.chromatics', filePath: '/fixture/history-owner.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  const first = score.parts[0].staves[0].measures[0].voices[0].events[0].id
  const second = score.parts[1].staves[0].measures[0].voices[0].events[0].id
  fireEvent.click(screen.getByRole('button', { name: first + ' 선택' })); focusTestBody()
  fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
  const changed = structuredClone(playbackMockState.lastScore!)
  expect(changed).not.toEqual(score); expect(changed.parts[1]).toEqual(score.parts[1])
  fireEvent.click(screen.getByRole('button', { name: second + ' 선택' }))
  openStudioWorkspace('악보'); const combo = screen.getByRole('combobox', { name: label })
  act(() => combo.focus()); fireEvent.click(combo); fireEvent.keyDown(combo, { key: 'ArrowDown', code: 'ArrowDown' })
  expect(combo).toHaveAttribute('aria-expanded', 'true')
  expect(playbackMockState.lastScore).toEqual(changed)
  return { score, project, changed, first, second, combo }
}

async function writeFixture(label: typeof fields[number], scenario: 'commit' | 'cancel', project: ReturnType<typeof createNativeProject>, changed: typeof project.score, result: typeof project.score) {
  const dir = process.env.DDIRORI_SELECTOR_HISTORY_QA_DIR
  if (!dir) return
  const { mkdirSync, writeFileSync } = await import('node:fs'), { join } = await import('node:path')
  const kind = ['clef', 'transpose', 'key', 'time'][fields.indexOf(label)]
  const target = join(dir, kind + '-' + scenario); mkdirSync(target, { recursive: true })
  for (const [name, score] of [['source', project.score], ['changed', changed], ['result', result]] as const) {
    writeFileSync(join(target, name + '.chromatics'), encodeNativeProject({ ...project, score }), { flag: 'wx' })
  }
  writeFileSync(join(target, 'case.json'), JSON.stringify({ kind, scenario, label, first: project.score.parts[0].staves[0].measures[0].voices[0].events[0].id, second: project.score.parts[1].staves[0].measures[0].voices[0].events[0].id }), { flag: 'wx' })
}

it.each(fields)('keeps an open %s choice as the history-key owner before an explicit commit to the same target', async label => {
  const { project, changed, second, combo } = await setup(label)
  const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  const xml = serializeMusicXml(changed), midi = serializeMidi(changed)
  fireEvent.keyDown(combo, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(changed)
  expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(xml)
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(midi)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selected!)
  expect(combo).toHaveAttribute('aria-expanded', 'true')
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(combo, { key: 'Tab', code: 'Tab' })
  const edited = structuredClone(playbackMockState.lastScore!)
  expect(edited).not.toEqual(changed); expect(edited.parts[0]).toEqual(changed.parts[0]); expect(edited.parts[1]).not.toEqual(changed.parts[1])
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', second)
  expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
  fireEvent.keyDown(combo, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(changed)
  fireEvent.keyDown(screen.getByRole('combobox', { name: label }), { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(edited)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
  await writeFixture(label, 'commit', project, changed, edited)
})

it.each(fields)('cancels an open %s candidate before closed-control undo restores another target', async label => {
  const { score, project, changed, first, combo } = await setup(label)
  fireEvent.keyDown(combo, { key: 'Escape', code: 'Escape' })
  expect(combo).toHaveAttribute('aria-expanded', 'false'); expect(playbackMockState.lastScore).toEqual(changed)
  fireEvent.keyDown(combo, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(score)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', first)
  const current = screen.getByRole('combobox', { name: label })
  expect(current).toHaveAttribute('aria-expanded', 'false')
  fireEvent.keyDown(current, { key: 'Tab', code: 'Tab' })
  expect(playbackMockState.lastScore).toEqual(score); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(serializeMusicXml(score)); expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(score))
  fireEvent.keyDown(current, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(changed)
  await writeFixture(label, 'cancel', project, changed, score)
})
