// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {it,expect,vi} from 'vitest'
import {createMetronomeTextFixture} from '../../testing/metronome-text-fixture'
import {decodeNativeProject} from '../../project/schema'
import {openStudioWorkspace,playbackMockState,registerAppTestHooks} from './App.test-harness'
registerAppTestHooks()
it('explains original and legacy applied BPM in Korean and saves the same projected native value',async()=>{
 window.history.replaceState({},'','/?fixture=release-test');vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/range.musicxml',fileName:'range.musicxml',contents:createMetronomeTextFixture({text:'1001'})})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}));expect(report.getByText(/원래 메트로놈 빠르기 1001은 현재 프로젝트 범위 밖이어서 기존 변환 규칙에 따라 240으로 적용했습니다/)).toBeVisible()
 expect(document.querySelector('.studio-status__result')).toHaveTextContent('빠르기 수치 변환');expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/Normalized|part\[/)
 const path=report.getByText('part[1].measure[1].direction[1].direction-type[1].metronome.per-minute');expect(path).not.toBeVisible();fireEvent.click(report.getByRole('button',{name:'기술 정보'}));expect(path).toBeVisible()
 expect(playbackMockState.lastScore?.tempo?.bpm).toBe(240);fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score.tempo?.bpm).toBe(240)
 expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
