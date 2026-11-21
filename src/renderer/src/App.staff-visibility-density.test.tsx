// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createStaffVisibilityFixture, createRepeatedStaffVisibilityFixture } from '../../testing/staff-visibility-fixture'
import { parseMusicXmlWithReport } from '../../musicxml'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()
const summary='원본의 보표 숨김 설정은 보존하지 못했습니다. 화면과 출력에 보표가 나타날 수 있으므로 원본 MusicXML을 보관하고 보표와 다시 내보낸 파일을 비교해 주세요.'
it.each(['multiple','many'] as const)('summarizes %s staff visibility warnings while retaining every source diagnostic and snapshot ownership', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source=kind==='many'?createRepeatedStaffVisibilityFixture(30):createStaffVisibilityFixture('multiple'),parsed=parseMusicXmlWithReport(source),count=parsed.report.warnings.length
  vi.mocked(window.inC.musicXml.open).mockResolvedValue({fileName:'same-hidden.musicxml',filePath:'/fixture/same-hidden.musicxml',contents:source})
  const { App }=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
  const report=await screen.findByRole('region',{name:'MusicXML 경고 상세'}),panel=within(report),toggle=panel.getByRole('button',{name:`마디별 경고 상세 ${count}개`})
  expect(toggle).toHaveAttribute('aria-expanded','false');expect(panel.getByText(summary,{exact:true})).toBeVisible()
  expect(report).toHaveTextContent(`MusicXML 가져오기 경고 ${count}개`)
  expect(report.querySelectorAll('li')).toHaveLength(count)
  expect(panel.queryByRole('button',{name:'기술 정보'})).not.toBeInTheDocument()
  const selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
  for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown','Enter',' '])fireEvent.keyDown(toggle,{key,code:key===' '?'Space':key})
  expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(parsed.score)
  expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')).toBe(selected)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  fireEvent.click(toggle);expect(toggle).toHaveAttribute('aria-expanded','true')
  expect(panel.getAllByRole('button',{name:'기술 정보'})).toHaveLength(count)
  const rows=report.querySelectorAll('li'),first=within(rows[0])
  fireEvent.click(first.getByRole('button',{name:'기술 정보'}))
  expect(first.getByText(parsed.report.warnings[0].path!)).toBeVisible()
  expect(first.getByText(parsed.report.warnings[0].message)).toBeVisible()
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
  await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(parsed.score)
  fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
  await waitFor(()=>expect(within(screen.getByRole('region',{name:'MusicXML 경고 상세'})).getByRole('button',{name:`마디별 경고 상세 ${count}개`})).toHaveAttribute('aria-expanded','false'))
  const fresh=screen.getByRole('region',{name:'MusicXML 경고 상세'});expect(fresh).not.toBe(report)
  fireEvent.click(within(fresh).getByRole('button',{name:`마디별 경고 상세 ${count}개`}))
  for(const raw of fresh.querySelectorAll('.studio-warning-technical__content'))expect(raw).not.toBeVisible()
  expect(playbackMockState.lastScore).toEqual(parsed.score)
})
it.each(['hidden-second','line-mixed'] as const)('keeps %s single or mixed diagnostics fully visible', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source=createStaffVisibilityFixture(kind),parsed=parseMusicXmlWithReport(source)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'mixed-hidden.musicxml',filePath:'/fixture/mixed-hidden.musicxml',contents:source})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
  const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
  expect(report.queryByRole('button',{name:/마디별 경고 상세/})).not.toBeInTheDocument()
  expect(report.getByText(/숨김으로 지정된 보표의 표시 설정은 보존하지 못했습니다/)).toBeVisible()
  if(kind==='line-mixed')expect(report.getByText(/원본의 보표 줄 수는 보존하지 못했습니다/)).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(parsed.score)
})
