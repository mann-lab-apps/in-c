// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import sourceXml from '../../musicxml/fixtures/expanded-v1-part-export.musicxml?raw'
import { parseMusicXml } from '../../musicxml'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { chooseScoreView, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

describe('MIDI immutable view source', () => {
  registerAppTestHooks()
  it.each(['score-to-part', 'part-to-part', 'part-to-score', 'unchanged', 'return-to-source', 'score-return-to-source'] as const)(
    'export.midi-view-source %s preserves bytes and distinguishes effective output scope', async scenario => {
      window.history.replaceState({}, '', '/?fixture=release-test')
      const project = createNativeProject(parseMusicXml(sourceXml))
      project.view = scenario.startsWith('score-') ? { mode: 'score' } : { mode: 'part', partId: 'P1' }
      const initial = structuredClone(project)
      vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/scores/view-source.chromatics',fileName:'view-source.chromatics',contents:encodeNativeProject(project)})
      let finish!: (result: {fileName:string} | null) => void
      vi.mocked(window.inC.midi.save).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
      const { App } = await import('./App')
      render(<App />)
      openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
      await waitFor(() => expect(playbackMockState.lastScore).toEqual(initial.score))
      openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MIDI 내보내기'}))
      await waitFor(() => expect(window.inC.midi.save).toHaveBeenCalledOnce())
      const request = vi.mocked(window.inC.midi.save).mock.calls[0][0]
      const expectedMidiScore = structuredClone(playbackMockState.lastPreviewScore!)
      expect(request.contents).toEqual(Array.from(serializeMidi(expectedMidiScore)))
      if (scenario === 'score-to-part') { chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택','P2') }
      if (scenario === 'part-to-part') chooseScoreView('파트보 선택','P2')
      if (scenario === 'part-to-score') chooseScoreView('악보 보기','score')
      if (scenario === 'return-to-source') { chooseScoreView('파트보 선택','P2');chooseScoreView('파트보 선택','P1') }
      if (scenario === 'score-return-to-source') { chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택','P2');chooseScoreView('악보 보기','score') }
      const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
      const dirty = document.querySelector('.studio-document__state')!.textContent
      await act(async () => finish({fileName:'original-view.mid'}))
      await waitFor(() => expect(document.querySelector('.editor-status')).toHaveTextContent('original-view.mid'))
      if (['score-to-part','part-to-part','part-to-score'].includes(scenario)) {
        expect(document.querySelector('.studio-status__result')).toHaveTextContent('내보내기 시작 이후의 보기 변경은 포함되지 않았습니다.')
      } else expect(document.querySelector('.studio-status__result')).not.toHaveTextContent('보기 변경')
      expect(playbackMockState.lastScore).toEqual(initial.score)
      expect(document.querySelector('.studio-document__state')).toHaveTextContent(dirty!)
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',selected!)
      expect(request.contents).toEqual(Array.from(serializeMidi(expectedMidiScore)))
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
      expect(saved.score).toEqual(initial.score)
      expect(saved.view).toEqual(scenario === 'score-to-part' || scenario === 'part-to-part' ? {mode:'part',partId:'P2'} : scenario === 'part-to-score' ? {mode:'score'} : initial.view)
      if (process.env.DDIRORI_MIDI_VIEW_QA_DIR) {
        const {mkdirSync,writeFileSync} = await import('node:fs'),{join} = await import('node:path')
        const dir = join(process.env.DDIRORI_MIDI_VIEW_QA_DIR,scenario);mkdirSync(dir,{recursive:true})
        writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(initial))
        writeFileSync(join(dir,'expected.mid'),serializeMidi(expectedMidiScore))
        writeFileSync(join(dir,'expected-native.chromatics'),encodeNativeProject(saved))
        writeFileSync(join(dir,'expectations.json'),JSON.stringify({scenario,sourceView:initial.view,resultView:saved.view,viewWarning:['score-to-part','part-to-part','part-to-score'].includes(scenario),scopeParts:expectedMidiScore.parts.map(p=>p.id)},null,2))
      }

    }, 15_000
  )
})

describe('MIDI shared channel guidance', () => {
 registerAppTestHooks()
 it.each([16, 17])('export.midi-shared-channel explains %i parts and permits an independent part copy', async count => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { createMidiChannelFixture } = await import('../../testing/midi-channel-fixture')
  const { score } = createMidiChannelFixture(count)
  const original = structuredClone(score)
  vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/channels.chromatics', fileName: 'channels.chromatics', contents: encodeNativeProject(createNativeProject(score)) })
  vi.mocked(window.inC.midi.save).mockResolvedValueOnce({ fileName: 'ensemble.mid' }).mockResolvedValueOnce({ fileName: 'flute.mid' })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(original))
  openStudioWorkspace('내보내기')
  fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))
  const report = within(await screen.findByRole('region', { name: 'MIDI 경고 상세' }))
  expect(report.getByText(`MIDI 내보내기 경고 ${count - 15}개`)).toBeVisible()
  expect(report.getByText(/16번째 파트.*MIDI 채널을 다른 파트와 공유/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('경고 상세에서 파트 간 채널 공유를 확인해 주세요.')
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent('part[16]')
  const items = report.getAllByRole('listitem')
  fireEvent.click(within(items[0]).getByText('기술 정보'))
  expect(within(items[0]).getByText('part[16].midi-channel')).toBeVisible()
  expect(within(items[0]).getByText(/MIDI channel 1 is shared with part 1/)).toBeVisible()
  expect(vi.mocked(window.inC.midi.save).mock.calls[0][0].contents).toEqual(Array.from(serializeMidi(original)))
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  fireEvent.keyDown(within(items[0]).getByText('기술 정보'), { key: 'Enter', code: 'Enter' })
  fireEvent.keyDown(within(items[0]).getByText('기술 정보'), { key: ' ', code: 'Space' })
  expect(playbackMockState.play).not.toHaveBeenCalled()
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  chooseScoreView('악보 보기', 'part')
  chooseScoreView('파트보 선택', 'P16')
  // The earlier report belongs to the earlier full-score file until a new
  // successful copy replaces it; changing view must not reinterpret its owner.
  expect(report.getByText('ensemble.mid')).toBeVisible()
  expect(report.getByText('part[16].midi-channel')).toBeVisible()
  openStudioWorkspace('내보내기')
  fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))
  await waitFor(() => expect(window.inC.midi.save).toHaveBeenCalledTimes(2))
  await waitFor(() => expect(screen.queryByRole('region', { name: 'MIDI 경고 상세' })).not.toBeInTheDocument())
  expect(vi.mocked(window.inC.midi.save).mock.calls[1][0].contents).toEqual(Array.from(serializeMidi(playbackMockState.lastPreviewScore!)))
  expect(playbackMockState.lastPreviewScore!.parts.map(part => part.id)).toEqual(['P16'])
  expect(playbackMockState.lastScore).toEqual(original)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
  expect(saved.score).toEqual(original)
  expect(saved.view).toEqual({ mode: 'part', partId: 'P16' })
 })
})

describe('MIDI structural snapshot ownership', () => {
 registerAppTestHooks()
 it.each(['deleted', 'undo-restored'] as const)('export.midi-structural-snapshot %s keeps file diagnostics separate from the current part count', async action => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { createMidiChannelFixture } = await import('../../testing/midi-channel-fixture')
  const { score } = createMidiChannelFixture(16)
  vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/structural-midi.chromatics', fileName: 'structural-midi.chromatics', contents: encodeNativeProject(createNativeProject(score)) })
  let finish!: (result: { fileName: string }) => void
  vi.mocked(window.inC.midi.save).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore?.parts).toHaveLength(16))
  const source = structuredClone(playbackMockState.lastScore!)
  openStudioWorkspace('내보내기')
  fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))
  await waitFor(() => expect(window.inC.midi.save).toHaveBeenCalledOnce())
  const bytes = vi.mocked(window.inC.midi.save).mock.calls[0][0].contents
  expect(bytes).toEqual(Array.from(serializeMidi(source)))
  openStudioWorkspace('악보')
  fireEvent.click(screen.getByRole('button', { name: '파트 삭제' }))
  await waitFor(() => expect(playbackMockState.lastScore?.parts).toHaveLength(15))
  if (action === 'undo-restored') {
   const nav = within(screen.getByRole('navigation', { name: '앱 메뉴' }))
   fireEvent.click(nav.getByRole('button', { name: '편집' }))
   fireEvent.click(nav.getByRole('menuitem', { name: '실행 취소' }))
   await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
  }
  const current = structuredClone(playbackMockState.lastScore!)
  const dirty = document.querySelector('.studio-document__state')!.textContent
  const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  await act(async () => finish({ fileName: 'source-sixteen.mid' }))
  const report = within(await screen.findByRole('region', { name: 'MIDI 경고 상세' }))
  expect(report.getByText('source-sixteen.mid')).toBeVisible()
  expect(report.getByText('MIDI 내보내기 경고 1개')).toBeVisible()
  expect(report.getByText(/16번째 파트가 MIDI 채널을 다른 파트와 공유/)).toBeVisible()
  if (action === 'deleted') expect(document.querySelector('.studio-status__result')).toHaveTextContent('내보내기 시작 이후의 수정 내용은 포함되지 않았습니다.')
  else expect(document.querySelector('.studio-status__result')).not.toHaveTextContent('수정 내용은 포함되지 않았습니다.')
  expect(playbackMockState.lastScore).toEqual(current)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent(dirty!)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selected!)
  expect(vi.mocked(window.inC.midi.save).mock.calls[0][0].contents).toEqual(bytes)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(current)
 })
})
