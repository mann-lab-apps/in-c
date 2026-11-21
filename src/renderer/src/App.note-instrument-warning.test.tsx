// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNoteInstrumentFixture } from '../../testing/note-instrument-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['secondary','multiple'] as const)('explains %s note instrument loss in Korean while preserving the document',async kind=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {xml,baselineXml}=createNoteInstrumentFixture(kind),expected=parseMusicXmlWithReport(baselineXml).score
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/instruments.musicxml',fileName:'instruments.musicxml',contents:xml})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
  const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
  if(kind==='multiple') {
    const group=report.getByRole('button',{name:'악기 지정별 경고 상세 2개'})
    expect(group).toHaveAttribute('aria-expanded','false')
    fireEvent.click(group)
  } else expect(report.queryByRole('button',{name:/악기 지정별 경고 상세/})).not.toBeInTheDocument()
  const rows=report.getAllByRole('listitem')
  expect(rows).toHaveLength(kind==='multiple'?2:1)
  for(const row of rows) expect(within(row).getByText(/음표별 악기 지정은 보존하지 못했습니다/)).toBeVisible()
  const technicalButtons=report.getAllByRole('button',{name:'기술 정보'})
  expect(technicalButtons).toHaveLength(kind==='multiple'?2:1)
  for(const [index,button] of technicalButtons.entries()){
    const path=`part[2].measure[1].note[1].instrument[${index+1}]`
    expect(report.getByText(path)).not.toBeVisible()
    fireEvent.keyDown(button,{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled()
    fireEvent.click(button);expect(report.getByText(path)).toBeVisible()
    expect(report.getByText(new RegExp(`Unrepresented note instrument.*P2-I${index+1}`))).toBeVisible()
  }
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved=decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
  expect(saved.score).toEqual(expected);expect(serializeMusicXml(saved.score)).toBe(serializeMusicXml(expected))
  expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
})
