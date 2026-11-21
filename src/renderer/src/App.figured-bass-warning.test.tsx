// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createFiguredBassFixture} from '../../testing/figured-bass-fixture'
import {parseMusicXml} from '../../musicxml'
import {playbackMockState,registerAppTestHooks,openStudioWorkspace} from './App.test-harness'
registerAppTestHooks()
it.each(['stacked','extend'] as const)('explains %s data loss in Korean, preserves original diagnostics and normalized native',async kind=>{
 window.history.replaceState({},'','/?fixture=release-test');const xml=createFiguredBassFixture(kind),score=parseMusicXml(xml)
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'figured-bass.musicxml',filePath:'/fixture/figured-bass.musicxml',contents:xml})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}));expect(report.getByText(/^2번째 파트 · 2마디 · 원본 숫자저음/)).toBeVisible();const path='part[2].measure[2].figured-bass[1]';expect(report.getByText(path)).not.toBeVisible();expect(playbackMockState.lastScore).toEqual(score)
 const technical=report.getAllByRole('button',{name:'기술 정보'})[0];fireEvent.keyDown(technical,{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled();fireEvent.click(technical);expect(report.getByText(path)).toBeVisible();expect(report.getAllByText(/Unrepresented figured-bass /)[0]).toBeVisible();expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
