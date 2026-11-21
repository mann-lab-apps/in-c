// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNoteVisibilityFixture, createRepeatedNoteVisibilityFixture } from '../../testing/note-visibility-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['main','rest'] as const)('explains $owner note visibility loss and preserves exact score/native output',async owner=>{
 window.history.replaceState({},'', '/?fixture=release-test')
 const xml=createNoteVisibilityFixture({owner,partCount:2,targetPart:2,targetMeasure:2}),score=parseMusicXml(xml)
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/hidden.musicxml',fileName:'hidden.musicxml',contents:xml})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
 expect(report.getByText(/음표·쉼표의 숨김 설정은 보존하지 못했습니다/)).toBeVisible()
 expect(report.getByText(/원본 MusicXML을 보관하고/)).toBeVisible()
 expect(document.querySelector('.studio-status__result')).toHaveTextContent('음표·쉼표 숨김 설정 손실')
 expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/part\[|Unrepresented/)
 const path='part[2].measure[2].note[1].@print-object';expect(report.getByText(path)).not.toBeVisible()
 fireEvent.click(report.getByRole('button',{name:'기술 정보'}));expect(report.getByText(path)).toBeVisible()
 expect(report.getByText(/Unrepresented note visibility /)).toHaveTextContent('"printObject":"no"')
 expect(playbackMockState.lastScore).toEqual(score);expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(score))
 fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
 expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
 expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음');expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it.each(['same-family','mixed-notehead'] as const)('keeps repeated hidden-note report density scoped to %s',async kind=>{
 window.history.replaceState({},'', '/?fixture=release-test')
 const repeated=createRepeatedNoteVisibilityFixture(30),xml=kind==='mixed-notehead'?repeated.replace('<type>whole</type>','<type>whole</type><notehead>none</notehead>'):repeated
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/many-hidden.musicxml',fileName:'many-hidden.musicxml',contents:xml})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
 if(kind==='same-family') {
  const toggle=report.getByRole('button',{name:'마디별 경고 상세 30개'})
  expect(toggle).toHaveAttribute('aria-expanded','false');expect(report.queryByRole('button',{name:'기술 정보'})).not.toBeInTheDocument()
  expect(report.getByText(/원본의 음표·쉼표 숨김 설정은 보존하지 못했습니다/)).toBeVisible()
  fireEvent.click(toggle);expect(report.getAllByRole('button',{name:'기술 정보'})).toHaveLength(30)
 }else {
  expect(report.queryByRole('button',{name:/마디별 경고 상세/})).not.toBeInTheDocument()
  expect(report.getAllByRole('button',{name:'기술 정보'})).toHaveLength(31)
  expect(report.getByText(/특수 모양·채움·괄호 지정은 보존하지 못했습니다/)).toBeVisible()
 }
 expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml));expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
