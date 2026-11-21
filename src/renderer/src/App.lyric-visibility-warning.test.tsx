// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createLyricVisibilityFixture, createRepeatedLyricVisibilityFixture } from '../../testing/lyric-visibility-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { playbackMockState, openStudioWorkspace, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['single','repeated','mixed-note'] as const)('explains $kind lyric visibility loss with full technical evidence',async kind=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const xml=kind==='repeated'?createRepeatedLyricVisibilityFixture():createLyricVisibilityFixture(kind==='mixed-note'?'note-hidden':'mixed-verses')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/lyrics.musicxml',fileName:'lyrics.musicxml',contents:xml})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
  const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
  if(kind==='repeated') {
    const disclosure=report.getByRole('button',{name:'마디별 경고 상세 30개'})
    expect(disclosure).toHaveAttribute('aria-expanded','false')
    expect(report.queryByRole('button',{name:'기술 정보'})).not.toBeInTheDocument()
    expect(report.getByText(/가사 숨김 설정은 보존하지 못했습니다/)).toBeVisible()
    fireEvent.click(disclosure)
    expect(report.getAllByRole('button',{name:'기술 정보'})).toHaveLength(30)
  } else {
    expect(report.queryByRole('button',{name:/마디별 경고 상세/})).not.toBeInTheDocument()
    const summaries=report.getAllByText(/가사의 숨김 설정은 보존하지 못했습니다/)
    expect(summaries[0]).toBeVisible()
    expect(report.getAllByRole('button',{name:'기술 정보'})).toHaveLength(kind==='single'?1:3)
    const technical=report.getAllByRole('button',{name:'기술 정보'})[kind==='single'?0:1]
    const path=`part[2].measure[2].note[1].lyric[${kind==='single'?2:1}]`
    expect(report.getByText(path)).not.toBeVisible()
    fireEvent.click(technical);expect(report.getByText(path)).toBeVisible()
    for (const diagnostic of report.getAllByText(/Unrepresented lyric visibility /)) {
      expect(diagnostic).toHaveTextContent('visibilitySource')
    }
  }
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/part\[|Unrepresented/)
  expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml))
  fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
  await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(parseMusicXml(xml))
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
})
