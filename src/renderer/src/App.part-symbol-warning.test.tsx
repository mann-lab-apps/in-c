// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createPartSymbolFixture} from '../../testing/part-symbol-fixture'
import {parseMusicXml} from '../../musicxml'
import {playbackMockState,registerAppTestHooks,openStudioWorkspace} from './App.test-harness'
registerAppTestHooks()
it.each(['none','partial'] as const)('explains %s multistaff source symbol loss in Korean without changing music',async kind=>{
 window.history.replaceState({},'','/?fixture=release-test');const xml=createPartSymbolFixture(kind),score=parseMusicXml(xml);vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'part-symbol.musicxml',filePath:'/fixture/part-symbol.musicxml',contents:xml})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
 expect(report.getByText(/다중 보표의 원본 묶음 모양·범위는 보존하지 못했습니다/)).toBeVisible();const path='part[1].measure[1].attributes[1].part-symbol';expect(report.getByText(path)).not.toBeVisible();expect(playbackMockState.lastScore).toEqual(score)
 const technical=report.getByRole('button',{name:'기술 정보'});for(const[key,code]of[[' ','Space'],['Enter','Enter']])fireEvent.keyDown(technical,{key,code});expect(playbackMockState.play).not.toHaveBeenCalled();fireEvent.click(technical);expect(report.getByText(path)).toBeVisible();expect(report.getByText(/Unrepresented part-symbol /)).toBeVisible();expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
