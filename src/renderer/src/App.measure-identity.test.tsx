// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createMeasureIdentityFixture } from '../../testing/measure-identity-fixture'
import { createPracticeLoopFixture } from '../../testing/practice-loop-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../musicxml'
import { expandScoreRepeatsForMusicXml } from '../../musicxml/expand-repeats'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
const cases = [
  { kind: 'alpha', labels: ['10','2a','30','40'] },
  { kind: 'zero', labels: ['0','1','2','3'] },
  { kind: 'duplicate', labels: ['1','1','3','4'] }
]
it.each([0,1].flatMap(partIndex => cases.flatMap(row => ['dialog','recent'].map(route => ({...row,partIndex,route})))) )('imports approved $kind ordinal identities through $route for part $partIndex and preserves history/native/export', async ({kind,labels,partIndex,route}) => {
  const { source, control } = createMeasureIdentityFixture(partIndex, labels, true), expected = parseMusicXml(control)
  const entry = { fileName: `identity-${partIndex}.musicxml`, filePath: `/fixture/identity-${partIndex}.musicxml`, openedAt: '2026-11-04T00:00:00Z' }
  window.history.replaceState({}, '', route === 'dialog' ? '/?fixture=release-test' : '/')
  if (route === 'recent') {
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValueOnce([entry])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValueOnce({ ...entry, contents: source })
  } else vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ ...entry, contents: source })
  const { App } = await import('./App'); render(<App />)
  if (route === 'dialog') {
    const old = createNativeProject(createPracticeLoopFixture())
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'old.chromatics', filePath: '/fixture/old.chromatics', contents: encodeNativeProject(old) })
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(playbackMockState.lastScore).toEqual(old.score))
    fireEvent.click(screen.getByRole('button', { name: old.score.parts[0].staves[0].measures[0].voices[0].events[0].id + ' 선택' }))
    fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
    expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  } else fireEvent.click(await screen.findByRole('button', { name: /identity-\d\.musicxml/ }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(expected))
  expect(document.querySelector('.studio-start')).not.toBeInTheDocument()
  const report = await screen.findByRole('region', { name: 'MusicXML 경고 상세' })
  expect(report).toHaveTextContent('이 파트의 순서 번호로 읽었습니다')
  const raw = within(report).getByText(/Source measure identifiers normalized/)
  expect(raw).not.toBeVisible()
  const normalizedRow = raw.closest('li')
  expect(normalizedRow).not.toBeNull()
  expect(within(report).getAllByText(/페달 기호는 화면·PDF에 표시되지 않습니다/)).toHaveLength(2)
  fireEvent.click(within(normalizedRow!).getByRole('button', { name: '기술 정보' }))
  expect(raw).toBeVisible()
  expect(raw).toHaveTextContent(JSON.stringify(labels[0])); expect(raw).toHaveTextContent('internalNumber')
  expect(window.inC.recentMusicXml.add).toHaveBeenCalledWith(expect.objectContaining({ filePath: entry.filePath }))
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  const first = expected.parts[partIndex].staves[0].measures[0].voices[0].events[0]
  fireEvent.click(screen.getByRole('button', { name: first.id + ' 선택' })); fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
  expect(playbackMockState.lastScore).not.toEqual(expected)
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(expected)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved = vi.mocked(window.inC.project.save).mock.calls[0][0]
  expect(saved).not.toHaveProperty('filePath'); expect(decodeNativeProject(saved.contents).score).toEqual(expected)
  openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
  await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce(), {
    onTimeout: error => new Error(error.message + '\nFILE STATUS: ' + document.querySelector('.studio-status')?.textContent + '\nDIAGNOSTIC: ' + document.querySelector('[aria-label="MusicXML 내보내기 기술 정보"]')?.textContent)
  })
  const xml = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents
  expect(xml).toBe(serializeMusicXml(expected)); expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(expected))
  fireEvent.click(screen.getByRole('button', { name: '반복 펼치기 MusicXML 내보내기' }))
  await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(2))
  const expanded = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[1][0].contents
  expect(expanded).toBe(serializeMusicXml(expandScoreRepeatsForMusicXml(expected)))
  expect(serializeMidi(parseMusicXml(expanded))).toEqual(serializeMidi(expected))
  const dir = process.env.STUDIO_MEASURE_IDENTITY_QA_DIR
  if (dir && route === 'dialog') {
    const folder = join(dir, `${kind}-${partIndex}`); mkdirSync(folder, { recursive: true })
    const files = { 'source.musicxml': source, 'control.musicxml': control, 'expected.chromatics': encodeNativeProject(createNativeProject(expected)), 'expected.mid': Buffer.from(serializeMidi(expected)), 'expected.structured.musicxml': xml, 'expected.expanded.musicxml': expanded, 'meta.json': JSON.stringify({ kind, partIndex, labels, targetEventId: first.id, unaffectedNumbers: [10,20,30,40] }, null, 2) }
    for (const [name, contents] of Object.entries(files)) writeFileSync(join(folder,name), contents, { flag: 'wx' })
  }
})
