// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createMidiWarningScore, midiWarningRestOracle } from '../../testing/midi-warning-fixture'
import { parseMusicXml } from '../../musicxml'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { chooseScoreView, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

describe('MusicXML immutable view source', () => {
  registerAppTestHooks()
  it.each((['structure','expanded'] as const).flatMap(mode => (['score-to-part', 'part-to-part', 'part-to-score', 'unchanged', 'return-to-source', 'score-return-to-source'] as const).map(scenario => ({mode,scenario}))))(
    'export.xml-view-source $mode $scenario preserves the copied scope and current document', async ({mode,scenario}) => {
      window.history.replaceState({}, '', '/?fixture=release-test')
      const project = createNativeProject(midiWarningRestOracle(createMidiWarningScore('percussion')))
      const firstPart=project.score.parts[0]!.id,secondPart=project.score.parts[1]!.id
      project.view = scenario.startsWith('score-') ? { mode: 'score' } : { mode: 'part', partId: firstPart }
      const initial = structuredClone(project)
      vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/scores/view-source.chromatics',fileName:'view-source.chromatics',contents:encodeNativeProject(project)})
      let finish!: (result: {filePath:string;fileName:string} | null) => void
      vi.mocked(window.inC.musicXml.exportCopy).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
      const { App } = await import('./App')
      render(<App />)
      openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
      await waitFor(() => expect(playbackMockState.lastScore).toEqual(initial.score))
      openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:mode==='structure'?'MusicXML 내보내기':'반복 펼치기 MusicXML 내보내기'}))
      await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
      const request = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0]
      const contents = request.contents,exported=parseMusicXml(contents),expectedPartIds=initial.view.mode==='part'?[firstPart]:initial.score.parts.map(p=>p.id)
      expect(exported.parts.map(p=>p.id)).toEqual(expectedPartIds)
      const copiedMidi=serializeMidi(exported)
      if (scenario === 'score-to-part') { chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',secondPart) }
      if (scenario === 'part-to-part') chooseScoreView('파트보 선택',secondPart)
      if (scenario === 'part-to-score') chooseScoreView('악보 보기','score')
      if (scenario === 'return-to-source') { chooseScoreView('파트보 선택',secondPart);chooseScoreView('파트보 선택',firstPart) }
      if (scenario === 'score-return-to-source') { chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',secondPart);chooseScoreView('악보 보기','score') }
      const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
      const dirty = document.querySelector('.studio-document__state')!.textContent
      await act(async () => finish({filePath:'/scores/original-view.musicxml',fileName:'original-view.musicxml'}))
      await waitFor(() => expect(document.querySelector('.editor-status')).toHaveTextContent('original-view.musicxml'))
      if (['score-to-part','part-to-part','part-to-score'].includes(scenario)) {
        expect(document.querySelector('.studio-status__result')).toHaveTextContent('내보내기 시작 이후의 보기 변경은 포함되지 않았습니다.')
      } else expect(document.querySelector('.studio-status__result')).not.toHaveTextContent('보기 변경')
      expect(playbackMockState.lastScore).toEqual(initial.score)
      expect(document.querySelector('.studio-document__state')).toHaveTextContent(dirty!)
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',selected!)
      expect(request.contents).toBe(contents)
      expect(serializeMidi(parseMusicXml(request.contents))).toEqual(copiedMidi)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
      expect(saved.score).toEqual(initial.score)
      expect(saved.view).toEqual(scenario === 'score-to-part' || scenario === 'part-to-part' ? {mode:'part',partId:secondPart} : scenario === 'part-to-score' ? {mode:'score'} : initial.view)
      if (process.env.DDIRORI_XML_VIEW_QA_DIR) {
        const {mkdirSync,writeFileSync} = await import('node:fs'),{join} = await import('node:path')
        const dir = join(process.env.DDIRORI_XML_VIEW_QA_DIR,mode+'-'+scenario);mkdirSync(dir,{recursive:true})
        writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(initial))
        writeFileSync(join(dir,'expected.musicxml'),contents)
        writeFileSync(join(dir,'expected.mid'),copiedMidi)
        writeFileSync(join(dir,'expected-native.chromatics'),encodeNativeProject(saved))
        writeFileSync(join(dir,'expectations.json'),JSON.stringify({mode,scenario,sourceView:initial.view,resultView:saved.view,viewWarning:['score-to-part','part-to-part','part-to-score'].includes(scenario),scopeParts:expectedPartIds},null,2))
      }

    }, 15_000
  )
})
