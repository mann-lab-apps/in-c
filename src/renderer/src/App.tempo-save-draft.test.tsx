// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { tempoSaveDraftFixture, tempoSaveDraftKinds } from '../../testing/tempo-save-draft-fixture'
import { encodeNativeProject, decodeNativeProject } from '../../project/schema'
import { serializeMusicXmlWithReport } from '../../musicxml'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each(tempoSaveDraftKinds.flatMap(kind => [{ ctrlKey: true }, { metaKey: true, shiftKey: true }].map(modifier => ({ kind, modifier }))))('studio.tempo-save-native $kind with $modifier preserves target identity, neighbor, history and save timing', async ({ kind, modifier }) => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const data = tempoSaveDraftFixture(kind)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/tempo.chromatics', fileName: 'tempo.chromatics', contents: encodeNativeProject(data.project) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/confirmed.chromatics', fileName: 'confirmed.chromatics' })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(data.project.score))
  openStudioWorkspace('악보'); const field = screen.getByRole('spinbutton', { name: data.label }); expect(field).toHaveValue(data.value ?? null); field.focus()
  if (kind === 'empty-control') fireEvent.change(field, { target: { value: '90' } })
  fireEvent.change(field, { target: { value: data.draft } }); await act(async () => fireEvent.keyDown(field, { key: 's', code: 'KeyS', ...modifier }))
  if (data.blocked) {
    expect(window.inC.project.save).not.toHaveBeenCalled(); expect(playbackMockState.lastScore).toEqual(data.project.score)
    expect(field).toHaveFocus(); expect(field).toHaveAccessibleDescription(expect.stringContaining('Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'))
    fireEvent.keyDown(field, { key: data.confirm ? 'Enter' : 'Escape' }); fireEvent.blur(field)
    expect(window.inC.project.save).not.toHaveBeenCalled()
    const confirmed = screen.getByRole('spinbutton', { name: data.label })
    confirmed.focus(); await act(async () => fireEvent.keyDown(confirmed, { key: 's', code: 'KeyS', ctrlKey: true }))
  }
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
  expect(saved).toEqual(data.expected)
  expect(serializeMidi(saved.score)).toEqual(serializeMidi(data.expected.score))
  expect(serializeMusicXmlWithReport(saved.score).contents).toBe(serializeMusicXmlWithReport(data.expected.score).contents)
  if (data.changed) {
    fireEvent.blur(field); fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(data.project.score)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(data.expected.score)
  }
  if (process.env.DDIRORI_TEMPO_SAVE_QA_DIR && 'ctrlKey' in modifier) {
    const { mkdirSync, writeFileSync } = await import('node:fs'), { join } = await import('node:path'), dir = join(process.env.DDIRORI_TEMPO_SAVE_QA_DIR, kind); mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(data.project)); writeFileSync(join(dir, 'expected.chromatics'), encodeNativeProject(data.expected))
    writeFileSync(join(dir, 'expected.mid'), serializeMidi(data.expected.score)); writeFileSync(join(dir, 'expected.musicxml'), serializeMusicXmlWithReport(data.expected.score).contents)
    writeFileSync(join(dir, 'expectations.json'), JSON.stringify({ kind, label: data.label, draft: data.draft, blocked: data.blocked, confirm: data.confirm, changed: data.changed, value: data.value }, null, 2))
  }
  expect(playbackMockState.play).not.toHaveBeenCalled(); expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
}, 15_000)
