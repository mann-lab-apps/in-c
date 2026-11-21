// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createPartSwingExportFixture } from '../../testing/part-swing-export-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { parseMusicXml } from '../../musicxml'
import { serializeMidi } from './midi/serialize-midi'
import { createPlaybackTimeline } from './playback/timeline'
import { chooseScoreView, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

type Mode = 'midi' | 'structure' | 'expanded'
const modes: Mode[] = ['midi', 'structure', 'expanded']
const label = (mode: Mode) => mode === 'midi' ? 'MIDI 내보내기' : mode === 'structure' ? 'MusicXML 내보내기' : '반복 펼치기 MusicXML 내보내기'
const region = (mode: Mode) => mode === 'midi' ? 'MIDI 경고 상세' : 'MusicXML 경고 상세'
const summary = '총보에서 적용되지 않는 스윙은 파트 사본에도 적용하지 않았습니다. 총보와 같은 직선 리듬으로 출력했습니다. 원본 프로젝트의 설정은 유지됩니다.'
async function load(score: ReturnType<typeof createPartSwingExportFixture>, name = 'source.chromatics') {
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: name, filePath: '/fixture/' + name, contents: encodeNativeProject(createNativeProject(score)) })
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
}
async function mount(score: ReturnType<typeof createPartSwingExportFixture>) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { App } = await import('./App'); render(<App />); await load(score)
  chooseScoreView('악보 보기', 'part'); chooseScoreView('파트보 선택', 'other')
}
function copy(mode: Mode) {
  openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: label(mode) }))
}
function recordCopy(kind: string, scope: string, mode: Mode, source: ReturnType<typeof createPartSwingExportFixture>, contents: number[] | string) {
  const root = process.env.STUDIO_PART_SWING_EXPORT_QA_DIR
  if (!root) return
  const directory = join(root, kind, scope, mode)
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, 'source.chromatics'), encodeNativeProject(createNativeProject(source)), { flag: 'wx' })
  writeFileSync(join(directory, mode === 'midi' ? 'actual.mid' : 'actual.musicxml'), typeof contents === 'string' ? contents : Buffer.from(contents), { flag: 'wx' })
}

it.each(modes.flatMap(mode => (['unaligned', 'aligned', 'off', 'off-unaligned'] as const).map(kind => ({ mode, kind }))))(
  'exports non-primary part $mode/$kind with the full-score swing eligibility and original native intact', async ({ mode, kind }) => {
    const score = createPartSwingExportFixture(kind), before = encodeNativeProject(createNativeProject(score))
    await mount(score)
    if (mode === 'midi') vi.mocked(window.inC.midi.save).mockResolvedValueOnce({ fileName: 'part.mid', filePath: '/fixture/part.mid' })
    else vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValueOnce({ fileName: 'part.musicxml', filePath: '/fixture/part.musicxml' })
    const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    const dirty = document.querySelector('.studio-document__state')!.textContent
    copy(mode)
    const expected = { ...score, parts: [score.parts[1]], ...(kind === 'unaligned' ? { swingPlayback: undefined } : {}) }
    if (mode === 'midi') {
      await waitFor(() => expect(window.inC.midi.save).toHaveBeenCalledOnce())
      expect(vi.mocked(window.inC.midi.save).mock.calls[0][0].contents).toEqual(Array.from(serializeMidi(expected)))
      recordCopy(kind, 'part', mode, score, vi.mocked(window.inC.midi.save).mock.calls[0][0].contents)
    } else {
      await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
      const parsed = parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents)
      expect(parsed.swingPlayback).toEqual(expected.swingPlayback)
      expect(serializeMidi(parsed)).toEqual(serializeMidi(expected))
      recordCopy(kind, 'part', mode, score, vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents)
    }
    const live = createPlaybackTimeline(score).events.filter(e => e.partId === 'other').map(e => [e.startBeat, e.durationBeats])
    expect(createPlaybackTimeline(expected).events.map(e => [e.startBeat, e.durationBeats])).toEqual(live)
    if (kind === 'unaligned') {
      const report = within(await screen.findByRole('region', { name: region(mode) }))
      expect(report.getByText(summary)).toBeVisible()
      const raw = report.getByText(/^Part copy omits global swing playback /)
      expect(raw).not.toBeVisible()
      const technical = report.getByRole('button', { name: '기술 정보' })
      fireEvent.keyDown(technical, { key: 'Enter', code: 'Enter' }); fireEvent.keyDown(technical, { key: ' ', code: 'Space' })
      expect(playbackMockState.play).not.toHaveBeenCalled()
      fireEvent.click(technical); expect(raw).toBeVisible()
    } else await waitFor(() => expect(screen.queryByRole('region', { name: region(mode) })).not.toBeInTheDocument())
    expect(encodeNativeProject(createNativeProject(playbackMockState.lastScore!))).toBe(before)
    expect(document.querySelector('.studio-document__state')).toHaveTextContent(dirty!)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selected!)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    const saved = vi.mocked(window.inC.project.save).mock.calls[0][0].contents
    expect(decodeNativeProject(saved).score).toEqual(score)
    const directory = process.env.STUDIO_PART_SWING_EXPORT_QA_DIR
    if (directory) writeFileSync(join(directory, kind, 'part', mode, 'saved-project.chromatics'), saved, { flag: 'wx' })
  }
)

it.each(modes)('keeps the stored unavailable swing in full-score %s output policy and the native source', async mode => {
  const score = createPartSwingExportFixture()
  await mount(score); chooseScoreView('악보 보기', 'score')
  if (mode === 'midi') vi.mocked(window.inC.midi.save).mockResolvedValueOnce({ fileName: 'full.mid', filePath: '/fixture/full.mid' })
  else vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValueOnce({ fileName: 'full.musicxml', filePath: '/fixture/full.musicxml' })
  copy(mode)
  if (mode === 'midi') {
    await waitFor(() => expect(window.inC.midi.save).toHaveBeenCalledOnce())
    const contents = vi.mocked(window.inC.midi.save).mock.calls[0][0].contents
    expect(contents).toEqual(Array.from(serializeMidi(score)))
    recordCopy('unaligned', 'full', mode, score, contents)
    const report = within(await screen.findByRole('region', { name: region(mode) }))
    expect(report.getByText(/저장된 전역 스윙 설정을 현재 악보에 적용할 수 없어/)).toBeVisible()
    expect(report.queryByText(summary)).not.toBeInTheDocument()
  } else {
    await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
    const contents = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents
    const parsed = parseMusicXml(contents)
    expect(parsed.swingPlayback).toEqual(score.swingPlayback)
    expect(serializeMidi(parsed)).toEqual(serializeMidi(score))
    recordCopy('unaligned', 'full', mode, score, contents)
    expect(screen.queryByText(summary)).not.toBeInTheDocument()
  }
  expect(playbackMockState.lastScore).toEqual(score)
})

it.each(modes.flatMap(mode => (['success', 'failure', 'cancel'] as const).map(outcome => ({ mode, outcome }))))(
  'isolates $mode/$outcome completion after document replacement', async ({ mode, outcome }) => {
    const score = createPartSwingExportFixture(), replacement = createPartSwingExportFixture('aligned')
    replacement.title = 'Replacement document'
    await mount(score)
    let resolve!: (value: { fileName: string; filePath: string } | null) => void, reject!: (reason: Error) => void
    const pending = new Promise<{ fileName: string; filePath: string } | null>((yes, no) => { resolve = yes; reject = no })
    if (mode === 'midi') vi.mocked(window.inC.midi.save).mockReturnValueOnce(pending)
    else vi.mocked(window.inC.musicXml.exportCopy).mockReturnValueOnce(pending)
    copy(mode)
    await waitFor(() => expect(mode === 'midi' ? window.inC.midi.save : window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
    await load(replacement, 'replacement.chromatics')
    if (outcome === 'failure') reject(new Error('Old copy failed'))
    else resolve(outcome === 'cancel' ? null : { fileName: 'old-copy', filePath: '/fixture/old-copy' })
    await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('replacement.chromatics을 열었습니다.'))
    expect(playbackMockState.lastScore).toEqual(replacement)
    expect(screen.queryByRole('region', { name: region(mode) })).not.toBeInTheDocument()
    expect(document.querySelector('.studio-status__result')).not.toHaveTextContent('old-copy')
    expect(document.querySelector('.studio-status__result')).not.toHaveTextContent('Old copy failed')
  }
)

it.each(modes)('preserves a pending edit and its single undo after %s copy completion', async mode => {
  const score = createPartSwingExportFixture()
  await mount(score)
  let resolve!: (value: { fileName: string; filePath: string }) => void
  const pending = new Promise<{ fileName: string; filePath: string }>(yes => { resolve = yes })
  if (mode === 'midi') vi.mocked(window.inC.midi.save).mockReturnValueOnce(pending)
  else vi.mocked(window.inC.musicXml.exportCopy).mockReturnValueOnce(pending)
  copy(mode)
  await waitFor(() => expect(mode === 'midi' ? window.inC.midi.save : window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
  fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' }))
  const title = screen.getByLabelText('악보 제목')
  fireEvent.change(title, { target: { value: 'Edited while copying' } }); fireEvent.keyDown(title, { key: 'Enter' })
  const edited = structuredClone(playbackMockState.lastScore!)
  const dirty = document.querySelector('.studio-document__state')!.textContent
  expect(edited.title).toBe('Edited while copying')
  resolve({ fileName: 'pending-copy', filePath: '/fixture/pending-copy' })
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('내보내기 시작 이후의 수정 내용은 포함되지 않았습니다.'))
  expect(await screen.findByText(summary)).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(edited)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent(dirty!)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(edited)
})
