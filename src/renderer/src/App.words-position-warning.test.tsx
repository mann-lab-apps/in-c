// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createWordsPositionFixture } from '../../testing/words-position-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['staff-mid', 'system-mid'] as const)('explains the source text position while retaining edit/history/Native for %s', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { xml, plain, path, scope } = createWordsPositionFixture(kind), score = parseMusicXml(plain)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath:'/fixture/words-position.musicxml', fileName:'words-position.musicxml', contents:xml })
  const { App } = await import('./App');render(<App />)
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button', { name:'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name:'MusicXML 경고 상세' }))
  expect(report.getByText(new RegExp(`^1번째 파트 · 7마디 · ${scope === 'system' ? '시스템' : '보표'} 글자의 마디 안 위치는 보존하지 못했습니다`))).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('경고 상세에서 보표·시스템 글자의 위치 손실을 확인해 주세요.')
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/Unrepresented|part\[/)
  const item = report.getAllByRole('listitem').find(n => n.textContent?.includes(path))!
  expect(within(item).getByText(path)).not.toBeVisible()
  const technical = within(item).getByRole('button', {name:'기술 정보'});fireEvent.click(technical)
  expect(within(item).getByText(path)).toBeVisible();expect(within(item).getByText(/position=2 quarter-beats/)).toBeVisible()
  fireEvent.keyDown(technical,{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled()
  expect(playbackMockState.lastScore).toEqual(score)
  const selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  fireEvent.click(screen.getByRole('button',{name:'악보 제목 수정'}));fireEvent.change(screen.getByLabelText('악보 제목'),{target:{value:'위치 안내 확인'}});fireEvent.keyDown(screen.getByLabelText('악보 제목'),{key:'Enter'})
  const changed={...score,title:'위치 안내 확인'};expect(playbackMockState.lastScore).toEqual(changed)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(changed)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',selection!)
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(changed)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
})
it('does not warn when a negative relative offset returns the text to measure start', async()=>{
  window.history.replaceState({}, '', '/?fixture=release-test')
  const {xml}=createWordsPositionFixture('staff-cancel-control')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/control.musicxml',fileName:'control.musicxml',contents:xml})
  const {App}=await import('./App');render(<App />);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
  await waitFor(()=>expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml)))
  expect(screen.queryByRole('region',{name:'MusicXML 경고 상세'})).not.toBeInTheDocument()
})
