// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMetronomeTextFixture } from '../../testing/metronome-text-fixture'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it('imports an approximate label with numeric sound and saves the real projected tempo',async()=>{
  window.history.replaceState({},'','/?fixture=release-test')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/approx.musicxml',fileName:'approx.musicxml',contents:createMetronomeTextFixture({text:'ca. 90',soundQuarter:90})})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
  await waitFor(()=>expect(playbackMockState.lastScore?.tempo).toMatchObject({bpm:90,text:'♩ = ca. 90'}))
  expect(screen.queryByRole('group',{name:'MusicXML 가져오기 기술 정보'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score.tempo).toMatchObject({bpm:90,text:'♩ = ca. 90'})
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('preserves dirty editing and technical cause after an unsupported label, then accepts retry',async()=>{
  window.history.replaceState({},'','/?fixture=demo')
  const open=vi.mocked(window.inC.musicXml.open)
  open.mockResolvedValueOnce({filePath:'/fixture/no-value.musicxml',fileName:'no-value.musicxml',contents:createMetronomeTextFixture({text:'ca. 90'})})
  open.mockResolvedValueOnce({filePath:'/fixture/retry.musicxml',fileName:'retry.musicxml',contents:createMetronomeTextFixture({text:'ca. 90',soundQuarter:90})})
  const {App}=await import('./App');render(<App/>);fireEvent.keyDown(window,{key:'ArrowUp',altKey:true,shiftKey:true})
  const edited=structuredClone(playbackMockState.lastScore),selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
  await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent('이 MusicXML의 빠르기 문구에서 사용할 재생값을 확인하지 못했습니다.'))
  expect(playbackMockState.lastScore).toEqual(edited);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selection)
  expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
  const technical=within(screen.getByRole('group',{name:'MusicXML 가져오기 기술 정보'})),cause=technical.getByText('MusicXML 숫자 값이 올바르지 않습니다: per-minute')
  expect(cause).not.toBeVisible();fireEvent.click(technical.getByRole('button',{name:'기술 정보'}));expect(cause).toBeVisible()
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).not.toEqual(edited)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
  fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));await waitFor(()=>expect(playbackMockState.lastScore?.tempo?.text).toBe('♩ = ca. 90'))
  expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
})

it('explains a separately lost visible metronome label without overwriting explicit words',async()=>{
  window.history.replaceState({},'','/?fixture=release-test')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/words.musicxml',fileName:'words.musicxml',contents:createMetronomeTextFixture({text:'90–100',soundQuarter:95,words:'Allegro'})})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
  const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
  expect(report.getByText(/원래 메트로놈 빠르기 문구의 일부 표기는 보존하지 못했습니다/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('빠르기 표시 문구 손실')
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/Unrepresented|part\[/)
  const path=report.getByText('part[1].measure[1].direction[1].direction-type[2].metronome.per-minute')
  expect(path).not.toBeVisible();fireEvent.click(report.getByRole('button',{name:'기술 정보'}));expect(path).toBeVisible()
  expect(report.getByText(/Unrepresented metronome tempo text /)).toHaveTextContent('90–100')
  expect(playbackMockState.lastScore?.tempo).toMatchObject({bpm:95,text:'Allegro'})
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
