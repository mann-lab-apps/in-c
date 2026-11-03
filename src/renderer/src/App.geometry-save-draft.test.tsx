// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { geometrySaveDraftFixture, geometrySaveDraftKinds } from '../../testing/geometry-save-draft-fixture'
import { encodeNativeProject, decodeNativeProject } from '../../project/schema'
import { serializeMusicXmlWithReport } from '../../musicxml'
import { serializeMidi } from './midi/serialize-midi'
import { chooseSpanReference, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const guidance = 'Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'
it.each(geometrySaveDraftKinds.flatMap(kind => [{ ctrlKey: true }, { metaKey: true, shiftKey: true }].map(modifier => ({ kind, modifier }))))('studio.geometry-save-native $kind with $modifier preserves geometry/history and musical exchange', async ({ kind, modifier }) => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const data = geometrySaveDraftFixture(kind), initial = structuredClone(data.project), originalMidi = serializeMidi(initial.score), originalXml = serializeMusicXmlWithReport(initial.score).contents
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/geometry.chromatics', fileName: 'geometry.chromatics', contents: encodeNativeProject(initial) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/confirmed.chromatics', fileName: 'confirmed.chromatics' })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(initial.score))
  chooseSpanReference('hairpin:geometry-save-span'); fireEvent.click(screen.getByText('배치 · 형상'))
  const field = screen.getByRole('spinbutton', { name: data.label }); field.focus()
  if (kind === 'same-auto') fireEvent.change(field, { target: { value: '2.25' } })
  fireEvent.change(field, { target: { value: data.draft } }); await act(async () => fireEvent.keyDown(field, { key: 's', code: 'KeyS', ...modifier }))
  if (data.blocked) {
    expect(window.inC.project.save).not.toHaveBeenCalled(); expect(field).toHaveFocus(); expect(field).toHaveAccessibleDescription(guidance)
    expect(playbackMockState.lastScore).toEqual(initial.score); expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
    fireEvent.keyDown(field, { key: data.confirm ? 'Enter' : 'Escape', code: data.confirm ? 'Enter' : 'Escape' }); fireEvent.blur(field)
    expect(screen.queryByText(guidance)).not.toBeInTheDocument()
    field.focus(); await act(async () => fireEvent.keyDown(field, { key: 's', code: 'KeyS', ctrlKey: true }))
  }
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents), expected = structuredClone(initial)
  if (data.next) expected.score.hairpins![0].engraving = data.next
  else delete expected.score.hairpins![0].engraving
  expect(saved).toEqual(expected); expect(serializeMidi(saved.score)).toEqual(originalMidi); expect(serializeMusicXmlWithReport(saved.score).contents).toBe(originalXml)
  fireEvent.blur(field)
  if (data.blocked && data.confirm) {
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2)); expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents)).toEqual(initial)
  }
  if (process.env.DDIRORI_GEOMETRY_SAVE_QA_DIR && 'ctrlKey' in modifier) {
    const { mkdirSync, writeFileSync } = await import('node:fs'), { join } = await import('node:path'), dir = join(process.env.DDIRORI_GEOMETRY_SAVE_QA_DIR, kind); mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(initial)); writeFileSync(join(dir, 'expected.chromatics'), encodeNativeProject(expected)); writeFileSync(join(dir, 'expected.mid'), originalMidi); writeFileSync(join(dir, 'expected.musicxml'), originalXml)
    writeFileSync(join(dir, 'expectations.json'), JSON.stringify({ kind, field: data.field, label: data.label, draft: data.draft, blocked: data.blocked, confirm: data.confirm, initial: data.initial, next: data.next }, null, 2))
  }
  expect(playbackMockState.play).not.toHaveBeenCalled(); expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
}, 15_000)
