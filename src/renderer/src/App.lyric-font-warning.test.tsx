// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createLyricFontFixture, createRepeatedLyricFontFixture } from '../../testing/lyric-font-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['single','repeated','mixed'] as const)('explains %s lyric emphasis loss without changing its words/history',async kind=>{
 window.history.replaceState({},'', '/?fixture=release-test')
 const source=createLyricFontFixture('italic'),xml=kind==='repeated'?createRepeatedLyricFontFixture():kind==='mixed'?source.replace('<type>whole</type>','<type>whole</type><notehead>none</notehead>'):source
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/lyric-font.musicxml',fileName:'lyric-font.musicxml',contents:xml})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일')
 fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
 if(kind==='repeated') {
  const toggle=report.getByRole('button',{name:'마디별 경고 상세 30개'})
  expect(toggle).toHaveAttribute('aria-expanded','false');expect(report.queryByRole('button',{name:'기술 정보'})).not.toBeInTheDocument()
  expect(report.getByText(/가사 글자의 굵게·기울임 지정은 보존하지 못했습니다/)).toBeVisible()
  fireEvent.click(toggle);expect(report.getAllByRole('button',{name:'기술 정보'})).toHaveLength(30)
 }else {
  expect(report.queryByRole('button',{name:/마디별 경고 상세/})).not.toBeInTheDocument()
  expect(report.getByText(/가사 글자의 기울임 지정은 보존하지 못했습니다/)).toBeVisible()
  expect(report.getAllByRole('button',{name:'기술 정보'})).toHaveLength(kind==='mixed'?2:1)
  const path='part[2].measure[2].note[1].lyric[1].text[1].@font-style'
  expect(report.getByText(path)).not.toBeVisible()
  const row=report.getByText(path).closest('li');if(!row)throw Error('Expected warning owner row')
  fireEvent.click(within(row).getByRole('button',{name:'기술 정보'}));expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unrepresented lyric font-style /)).toHaveTextContent('"value":"italic"')
 }
 expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/part\[|Unrepresented/)
 expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml));expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 vi.mocked(window.inC.project.save).mockResolvedValueOnce({filePath:'/fixture/font.chromatics',fileName:'font.chromatics'})
 fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
 expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(parseMusicXml(xml))
 await waitFor(()=>expect(window.inC.recentMusicXml.add).toHaveBeenCalledWith(expect.objectContaining({filePath:'/fixture/font.chromatics',format:'native'})))
 expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
})
