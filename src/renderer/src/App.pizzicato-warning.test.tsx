// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createPizzicatoFixture } from '../../testing/pizzicato-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

// Resolve the current public surface after workspace/document remounts; never cache old fields.
const hvFileTools = () => within(screen.getByRole('region', { name: '파일 및 선택 도구' }))
registerAppTestHooks()
it.each(['note-secondary', 'direction-pair', 'measure-no'] as const)('explains the source scope and value of %s without editing music', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { xml, plain, expected } = createPizzicatoFixture(kind), score = parseMusicXml(plain)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/pizzicato.musicxml', fileName: 'pizzicato.musicxml', contents: xml })
  const { App } = await import('./App');render(<App />)
  openStudioWorkspace('파일');fireEvent.click(hvFileTools().getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  for (const item of expected) {
    const scope = item.scope === 'note' ? '이 음표' : '이후 음표', action = item.value === 'yes' ? '피치카토' : item.scope === 'note' ? '피치카토 해제' : '아르코'
    expect(report.getByText(new RegExp(`${item.partNumber}번째 파트 · 7마디 · ${scope}의 ${action} 지정은 보존하지 못했습니다`))).toBeVisible()
    const row = report.getAllByRole('listitem').find(n => n.textContent?.includes(item.path))!
    expect(within(row).getByText(item.path)).not.toBeVisible()
    const button = within(row).getByRole('button', { name: '기술 정보' });fireEvent.click(button)
    expect(within(row).getByText(item.path)).toBeVisible()
    expect(within(row).getByText(new RegExp(`Unrepresented ${item.scope} pizzicato="${item.value}"`))).toBeVisible()
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });fireEvent.keyDown(button, { key: ' ', code: 'Space' })
  }
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/Unrepresented|part\[/)
  expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(score)
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(score))
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' }));fireEvent.change(screen.getByRole('textbox', { name: '악보 제목' }), { target: { value: '지정 확인 후 편집' } });fireEvent.keyDown(screen.getByRole('textbox', { name: '악보 제목' }), { key: 'Enter' })
  const changed = { ...score, title: '지정 확인 후 편집' };expect(playbackMockState.lastScore).toEqual(changed)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true });expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true });expect(playbackMockState.lastScore).toEqual(changed)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!)
  openStudioWorkspace('파일');fireEvent.click(hvFileTools().getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(changed)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
})
it('keeps an ordinary score free of a plucking notice', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { xml } = createPizzicatoFixture('control')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/control.musicxml', fileName: 'control.musicxml', contents: xml })
  const { App } = await import('./App');render(<App />)
  openStudioWorkspace('파일');fireEvent.click(hvFileTools().getByRole('button', { name: 'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml)))
  expect(screen.queryByRole('region', { name: 'MusicXML 경고 상세' })).not.toBeInTheDocument()
})
