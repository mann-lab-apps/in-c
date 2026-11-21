// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { parseMusicXml } from '../../musicxml/parse'
import { makeMeasureRestDurationXml } from '../../testing/measure-rest-duration-fixture'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each([8,20])('explains the %i-unit full-rest normalization in Korean and retains the raw source diagnostic',async units=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const xml=makeMeasureRestDurationXml(units),expected=decodeNativeProject(encodeNativeProject(createNativeProject(parseMusicXml(xml)))).score
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/rest-duration.musicxml',fileName:'rest-duration.musicxml',contents:xml})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
  const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
  expect(report.getByText(/원본 온마디 쉼표의 길이는 현재 마디 길이로 표시·재생됩니다/)).toBeVisible()
  expect(report.getByText('part[1].measure[1].note[2].duration')).not.toBeVisible()
  expect(JSON.parse(JSON.stringify(playbackMockState.lastScore))).toEqual(expected)
  fireEvent.click(report.getByRole('button',{name:'기술 정보'}))
  expect(report.getByText('part[1].measure[1].note[2].duration')).toBeVisible();expect(report.getByText(/Full-measure rest duration/)).toBeVisible()
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
})
