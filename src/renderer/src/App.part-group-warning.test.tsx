// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createPartGroupFixture} from '../../testing/part-group-fixture'
import {parseMusicXml} from '../../musicxml'
import {playbackMockState,registerAppTestHooks,openStudioWorkspace} from './App.test-harness'
registerAppTestHooks()
it.each(['named','nested'] as const)('explains %s original part-group loss in Korean without promising restored brackets',async kind=>{
 window.history.replaceState({},'','/?fixture=release-test');const xml=createPartGroupFixture(kind),score=parseMusicXml(xml);vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'part-group.musicxml',filePath:'/fixture/part-group.musicxml',contents:xml})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
 expect(report.getAllByText(/원본 파트 묶음 지정은 보존하지 못했습니다/)).toHaveLength(kind==='nested'?2:1);const path='part-list.part-group[1]';expect(report.getByText(path)).not.toBeVisible();expect(playbackMockState.lastScore).toEqual(score)
 const technical=report.getAllByRole('button',{name:'기술 정보'})[0];for(const[key,code]of[[' ','Space'],['Enter','Enter']])fireEvent.keyDown(technical,{key,code});expect(playbackMockState.play).not.toHaveBeenCalled();fireEvent.click(technical);expect(report.getByText(path)).toBeVisible();expect(report.getAllByText(/Unrepresented part-group /)[0]).toBeVisible();expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
