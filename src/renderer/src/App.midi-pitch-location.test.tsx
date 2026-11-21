// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNativePartIdFixture } from '../../testing/native-part-id-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { focusTestBody, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['full', 'part'] as const)('shows the original %s source part/staff/measure in the default MIDI pitch error without moving selection', async mode => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const score = createNativePartIdFixture(['location-safe', 'location-bad'])
  if (mode === 'part') score.parts.forEach(part => { part.name = 'Piano' })
  const bad = score.parts[1]
  const staff = JSON.parse(JSON.stringify(bad.staves[0], (key, value) => key === 'id' ? 'extra-' + value : value)) as typeof bad.staves[number]
  staff.measures[0].number = 7
  const note = staff.measures[0].voices[0].events[0]
  if (note.type !== 'note') throw new Error('Expected source note')
  note.pitch = { step: 'B', octave: 9, alter: 0 }; bad.staves.push(staff)
  const project = createNativeProject(score); if (mode === 'part') project.view = { mode: 'part', partId: bad.id }
  const source = encodeNativeProject(project); expect(decodeNativeProject(source).score).toEqual(score)
  const expectedLabel = mode === 'part' ? '2 · Piano · 보표 2 · 7마디' : 'Piano 2 · 보표 2 · 7마디'
  if (process.env.DDIRORI_MIDI_PITCH_LOCATION_QA_DIR) {
    const { mkdirSync, writeFileSync } = await import('node:fs'), { join } = await import('node:path'), dir = join(process.env.DDIRORI_MIDI_PITCH_LOCATION_QA_DIR, mode)
    mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'source.chromatics'), source, { flag: 'wx' }); writeFileSync(join(dir, 'case.json'), JSON.stringify({ mode, project, expectedLabel }), { flag: 'wx' })
  }
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'location.chromatics', filePath: '/fixture/location.chromatics', contents: source })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address'), dirty = document.querySelector('.studio-document__state')!.textContent
  const save = () => { openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' })) }
  save(); const region = await screen.findByRole('region', { name: 'MIDI 오류 상세' }), summary = region.querySelector('.dd-banner .dd-text')!
  expect(summary).toHaveTextContent(expectedLabel); expect(summary).toBeVisible()
  expect(summary).not.toHaveTextContent('location-bad'); expect(window.inC.midi.save).not.toHaveBeenCalled()
  const raw = within(region).getByText(/Invalid MIDI pitch/); expect(raw).not.toBeVisible(); fireEvent.click(within(region).getByRole('button', { name: '기술 정보' })); expect(raw).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(score); expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!); expect(document.querySelector('.studio-document__state')!.textContent).toBe(dirty)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  if (mode === 'part') {
    const originalSummary = summary.textContent
    openStudioWorkspace('악보'); const input = screen.getByLabelText('현재 파트 이름')
    fireEvent.focus(input); fireEvent.change(input, { target: { value: '첼로' } }); fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }); fireEvent.blur(input)
    const renamed = structuredClone(playbackMockState.lastScore!); expect(renamed.parts[1].name).toBe('첼로'); expect(renamed.parts[0]).toEqual(score.parts[0])
    expect(summary.textContent).toBe(originalSummary)
    save(); await waitFor(() => expect(region.querySelector('.dd-banner .dd-text')).toHaveTextContent('첼로 · 보표 2 · 7마디'))
    expect(window.inC.midi.save).not.toHaveBeenCalled(); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    focusTestBody(); fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(renamed)
  }
  const current = structuredClone(playbackMockState.lastScore!)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' })); await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(current)
})
