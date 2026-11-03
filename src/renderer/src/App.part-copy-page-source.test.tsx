// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createMidiWarningScore, midiWarningRestOracle } from '../../testing/midi-warning-fixture'
import { parseMusicXml } from '../../musicxml'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { chooseScoreView, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

const cases = [
  ...(['structure','expanded'] as const).flatMap(channel =>
    (['changed','undo','return','neighbor','scale'] as const).map(scenario => ({channel,scenario}))),
  {channel:'midi' as const,scenario:'changed' as const}
]
const excludedEdits = '내보내기 시작 이후의 수정 내용은 포함되지 않았습니다.'
function editMargin(value: number) {
  openStudioWorkspace('내보내기')
  const field = screen.getByRole('spinbutton', { name: 'PDF 여백 mm' })
  field.focus()
  fireEvent.change(field, { target: { value: String(value) } })
  fireEvent.keyDown(field, { key: 'Enter', code: 'Enter' })
  fireEvent.blur(field)
}

describe('Independent part page settings and exported snapshot',()=>{
  registerAppTestHooks()
  it.each(cases)('export.part-copy-page $channel $scenario preserves physical page settings and current native metadata',async({channel,scenario})=>{
    window.history.replaceState({},'','/?fixture=release-test')
    const project=createNativeProject(midiWarningRestOracle(createMidiWarningScore('percussion')))
    const first=project.score.parts[0]!.id,second=project.score.parts[1]!.id
    project.view={mode:'part',partId:first}
    const pageSetup = {pageSize:'a4' as const,orientation:'portrait' as const,pageMarginMm:8,staffSizePercent:100,systemSpacingPercent:100}
    project.partLayouts=[{partId:first,title:'Original selected title',layout:{pageSetup}},{partId:second,title:'Neighbor selected title',layout:{pageSetup:{...pageSetup,pageMarginMm:11}}}]
    const initial=structuredClone(project)
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/scores/part-source.chromatics',fileName:'part-source.chromatics',contents:encodeNativeProject(project)})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/current.chromatics',fileName:'current.chromatics'})
    let finish!:(value:{filePath:string;fileName:string}|null)=>void
    if(channel==='midi')vi.mocked(window.inC.midi.save).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
    else vi.mocked(window.inC.musicXml.exportCopy).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
    const {App}=await import('./App');render(<App/>)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    await waitFor(()=>expect(playbackMockState.lastScore).toEqual(initial.score))
    const scoreReference=playbackMockState.lastScore,expectedMidi=serializeMidi(structuredClone(playbackMockState.lastPreviewScore!))
    openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:channel==='midi'?'MIDI 내보내기':channel==='structure'?'MusicXML 내보내기':'반복 펼치기 MusicXML 내보내기'}))
    await waitFor(()=>expect(channel==='midi'?window.inC.midi.save:window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
    const xml=channel==='midi'?undefined:vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents
    const midi=channel==='midi'?[...vi.mocked(window.inC.midi.save).mock.calls[0][0].contents]:undefined
    if(xml) { expect(parseMusicXml(xml).layout?.pageSetup?.pageMarginMm).toBe(8);expect(parseMusicXml(xml).parts.map(p=>p.id)).toEqual([first]) }
    if(midi)expect(midi).toEqual(Array.from(expectedMidi))
    if (scenario === 'neighbor') {
      openStudioWorkspace('악보');chooseScoreView('파트보 선택', second)
      editMargin(12)
      openStudioWorkspace('악보');chooseScoreView('파트보 선택', first)
    } else if (scenario === 'scale') {
      fireEvent.change(screen.getByRole('slider', { name: 'PDF 보표 크기 100%' }), { target: { value: '90' } })
    } else {
      editMargin(12)
      if (scenario === 'undo') fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
      if (scenario === 'return') editMargin(8)
    }
    expect(playbackMockState.lastScore).toBe(scoreReference)
    const dirty=document.querySelector('.studio-document__state')!.textContent,selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    const fileName=channel==='midi'?'original-part.mid':'original-part.musicxml'
    await act(async()=>finish({filePath:'/scores/'+fileName,fileName}))
    await waitFor(()=>expect(document.querySelector('.studio-status__result')).toHaveTextContent(fileName))
    const shouldWarn=channel!=='midi'&&scenario==='changed'
    if(shouldWarn)expect(document.querySelector('.studio-status__result')).toHaveTextContent(excludedEdits)
    else expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(excludedEdits)
    expect(document.querySelector('.studio-status__result')).not.toHaveTextContent('보기 변경')
    expect(document.querySelector('.studio-document__state')).toHaveTextContent(dirty!)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',selection!)
    expect(playbackMockState.lastScore).toBe(scoreReference)
    if(xml)expect(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents).toBe(xml)
    if(midi)expect(vi.mocked(window.inC.midi.save).mock.calls[0][0].contents).toEqual(midi)
    const save = async () => {
      const count = vi.mocked(window.inC.project.save).mock.calls.length
      openStudioWorkspace('파일')
      fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(count + 1))
      await waitFor(() => expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음'))
      return decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[count]![0].contents)
    }
    const saved = await save()
    expect(saved.score).toEqual(initial.score);expect(saved.view).toEqual(initial.view)
    const firstLayout = saved.partLayouts.find(p => p.partId === first)!
    const expectedMargin = scenario === 'changed' ? 12 : 8
    expect(firstLayout.layout.pageSetup?.pageMarginMm).toBe(expectedMargin)
    expect(firstLayout.layout.pageSetup?.staffSizePercent).toBe(scenario === 'scale' ? 90 : 100)
    expect(saved.partLayouts.find(p => p.partId === second)!.layout.pageSetup?.pageMarginMm).toBe(scenario === 'neighbor' ? 12 : 11)
    expect(saved.partLayouts.map(p => p.title)).toEqual(initial.partLayouts.map(p => p.title))
    if (scenario === 'changed') {
      fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});const undone=await save()
      expect(undone.partLayouts).toEqual(initial.partLayouts);expect(undone.score).toEqual(initial.score)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      fireEvent.keyDown(window,{key:'y',code:'KeyY',ctrlKey:true});const redone=await save()
      expect(redone.partLayouts).toEqual(saved.partLayouts);expect(redone.score).toEqual(initial.score)
    }
    if(process.env.DDIRORI_PART_COPY_PAGE_QA_DIR) {
      const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),dir=join(process.env.DDIRORI_PART_COPY_PAGE_QA_DIR,channel+'-'+scenario);mkdirSync(dir,{recursive:true})
      writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(initial));writeFileSync(join(dir,'expected-native.chromatics'),encodeNativeProject(saved))
      if(xml)writeFileSync(join(dir,'expected.musicxml'),xml)
      if(midi)writeFileSync(join(dir,'expected.mid'),new Uint8Array(midi))
      writeFileSync(join(dir,'expectations.json'),JSON.stringify({channel,scenario,first,second,expectedMargin,shouldWarn},null,2))
    }
  },15_000)
})
