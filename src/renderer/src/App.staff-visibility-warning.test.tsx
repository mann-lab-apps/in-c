// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createStaffVisibilityFixture } from '../../testing/staff-visibility-fixture'
import { parseMusicXml } from '../../musicxml'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()
it.each(['hidden-second','hidden-spacing'] as const)('explains %s visibility loss and preserves original music and technical detail', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml=createStaffVisibilityFixture(kind),score=parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'staff-visibility.musicxml',filePath:'/fixture/staff-visibility.musicxml',contents:xml})
  const { App }=await import('./App');render(<App/>);openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
  const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
  expect(report.getByText(/숨김으로 지정된 보표의 표시 설정은 보존하지 못했습니다/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('보표 숨김 설정 손실')
  const path='part[2].measure[10].attributes[1].staff-details[1].@print-object'
  expect(report.getByText(path)).not.toBeVisible();expect(playbackMockState.lastScore).toEqual(score)
  const technical=report.getByRole('button',{name:'기술 정보'})
  for(const[key,code]of[[' ','Space'],['Enter','Enter']])fireEvent.keyDown(technical,{key,code})
  expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.click(technical);expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unrepresented staff visibility /)).toHaveTextContent('"staffNumber":"2"')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
  await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
