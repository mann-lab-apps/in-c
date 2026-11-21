// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createRepeatedNoteInstrumentFixture } from '../../testing/note-instrument-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

// Resolve the current public surface after workspace/document remounts; never cache old fields.
const hvFileTools = () => within(screen.getByRole('region', { name: '파일 및 선택 도구' }))
registerAppTestHooks()

async function setup(kind: 'same'|'mixed-notehead'|'mixed-unknown' = 'same') {
  window.history.replaceState({},'', '/?fixture=release-test')
  let xml=createRepeatedNoteInstrumentFixture()
  if(kind==='mixed-notehead')xml=xml.replace('<type>whole</type>','<type>whole</type><notehead>none</notehead>')
  if(kind==='mixed-unknown')xml=xml.replace('</attributes>','</attributes><direction><direction-type><other-direction>opaque source mark</other-direction></direction-type></direction>')
  const expected=parseMusicXmlWithReport(xml.replace(/<instrument\s+id="[^"]+"\s*\/>/g,'')).score
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/many-instruments.musicxml',fileName:'many-instruments.musicxml',contents:xml})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(hvFileTools().getByRole('button',{name:'MusicXML 가져오기'}))
  const region=await screen.findByRole('region',{name:'MusicXML 경고 상세'}),report=within(region)
  const selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-address'),dirty=document.querySelector('.studio-document__state')!.textContent
  const preserve=()=>{
    expect(playbackMockState.lastScore).toEqual(expected)
    expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(expected))
    expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toBe(selection)
    expect(document.querySelector('.studio-document__state')!.textContent).toBe(dirty)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  }
  return {xml,expected,region,report,preserve}
}

it('summarizes repeated note instrument losses while retaining every source path and disclosure',async()=>{
  const {report,preserve,expected}=await setup()
  const group=report.getByRole('button',{name:'악기 지정별 경고 상세 30개'})
  expect(group).toHaveAttribute('aria-expanded','false')
  expect(report.getByText(/^원본의 음표별 악기 지정은 보존하지 못했습니다/)).toBeVisible()
  expect(report.queryByRole('button',{name:'기술 정보'})).not.toBeInTheDocument()
  for(let i=1;i<=30;i++)expect(report.getByText(`part[2].measure[${i}].note[1].instrument[1]`)).not.toBeVisible()
  fireEvent.keyDown(group,{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.click(group);expect(group).toHaveAttribute('aria-expanded','true')
  const buttons=report.getAllByRole('button',{name:'기술 정보'});expect(buttons).toHaveLength(30)
  for(const index of [0,29]){
    fireEvent.click(buttons[index]);expect(report.getByText(`part[2].measure[${index+1}].note[1].instrument[1]`)).toBeVisible()
  }
  fireEvent.click(group);expect(report.getByText('part[2].measure[30].note[1].instrument[1]')).not.toBeVisible()
  fireEvent.click(group);expect(report.getByText('part[2].measure[30].note[1].instrument[1]')).toBeVisible()
  preserve();fireEvent.click(hvFileTools().getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved=decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
  expect(saved.score).toEqual(expected);expect(serializeMusicXml(saved.score)).toBe(serializeMusicXml(expected));preserve()
})

it('keeps the import completion concise with the accepted file and warning count',async()=>{
  const {preserve}=await setup(),status=document.querySelector('.studio-status__result')!
  expect(status).toHaveTextContent('many-instruments.musicxml을 가져왔습니다. MusicXML 경고 30개: 경고 상세에서 음표별 악기 지정 손실을 확인해 주세요.')
  expect(status.textContent).not.toMatch(/part\[|Unrepresented|2번째 파트/)
  preserve()
})

it('starts a same-filename reimport with its own collapsed group and technical details',async()=>{
  const {xml,report,preserve}=await setup()
  fireEvent.click(report.getByRole('button',{name:'악기 지정별 경고 상세 30개'}))
  fireEvent.click(report.getAllByRole('button',{name:'기술 정보'})[0])
  expect(report.getByText('part[2].measure[1].note[1].instrument[1]')).toBeVisible()
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/many-instruments.musicxml',fileName:'many-instruments.musicxml',contents:xml})
  openStudioWorkspace('파일');await act(async()=>fireEvent.click(hvFileTools().getByRole('button',{name:'MusicXML 가져오기'})))
  await waitFor(()=>expect(within(screen.getByRole('region',{name:'MusicXML 경고 상세'})).getByRole('button',{name:'악기 지정별 경고 상세 30개'})).toHaveAttribute('aria-expanded','false'))
  const current=within(screen.getByRole('region',{name:'MusicXML 경고 상세'}));expect(current.queryByRole('button',{name:'기술 정보'})).not.toBeInTheDocument()
  fireEvent.click(current.getByRole('button',{name:'악기 지정별 경고 상세 30개'}));expect(current.getAllByRole('button',{name:'기술 정보'})[0]).toHaveAttribute('aria-expanded','false');preserve()
})

it('keeps an accepted report expanded through an unrelated edit and exact undo/redo',async()=>{
  const {report,expected}=await setup();fireEvent.click(report.getByRole('button',{name:'악기 지정별 경고 상세 30개'}))
  fireEvent.click(report.getAllByRole('button',{name:'기술 정보'})[0])
  fireEvent.click(screen.getByRole('button',{name:'악보 제목 수정'}));fireEvent.change(screen.getByRole('textbox', { name: '악보 제목' }),{target:{value:'별도 제목 수정'}});fireEvent.keyDown(screen.getByRole('textbox', { name: '악보 제목' }),{key:'Enter'})
  expect(playbackMockState.lastScore).toEqual({...expected,title:'별도 제목 수정'})
  expect(report.getByRole('button',{name:'악기 지정별 경고 상세 30개'})).toHaveAttribute('aria-expanded','true')
  expect(report.getByText('part[2].measure[1].note[1].instrument[1]')).toBeVisible()
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(expected)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual({...expected,title:'별도 제목 수정'})
  expect(report.getByText('part[2].measure[1].note[1].instrument[1]')).toBeVisible()
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(expected)
  // A real undo/redo sequence must not replace the accepted report snapshot.
  expect(report.getByRole('button',{name:'악기 지정별 경고 상세 30개'})).toHaveAttribute('aria-expanded','true')
})

it.each(['mixed-notehead','mixed-unknown'] as const)('keeps every %s warning visible without classifying it as homogeneous',async kind=>{
  const {report,preserve}=await setup(kind)
  expect(report.queryByRole('button',{name:/악기 지정별 경고 상세/})).not.toBeInTheDocument()
  expect(report.getAllByRole('listitem')).toHaveLength(31)
  expect(report.getAllByRole('button',{name:'기술 정보'})).toHaveLength(31)
  expect(report.getByText(kind==='mixed-notehead'?/특수 모양·채움·괄호 지정/:/일부 지시 기호를 가져오지 못했습니다/)).toBeVisible()
  if(kind==='mixed-unknown') {
    fireEvent.click(report.getAllByRole('button',{name:'기술 정보'})[0])
    expect(report.getByText('part[1].measure[1].direction[1].direction-type[1].other-direction')).toBeVisible()
    expect(report.getByText('other-direction direction is not imported yet.')).toBeVisible()
  }
  preserve()
})
