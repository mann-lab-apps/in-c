// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createStaffTextWeightFixture} from '../../testing/staff-text-weight-fixture'
import {parseMusicXml} from '../../musicxml'
import {playbackMockState,registerAppTestHooks,openStudioWorkspace} from './App.test-harness'
registerAppTestHooks()
it('explains retained staff words and lost bold separately, preserving technical keys and saved score',async()=>{
 window.history.replaceState({},'','/?fixture=release-test');const xml=createStaffTextWeightFixture(),score=parseMusicXml(xml)
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'staff-weight.musicxml',filePath:'/fixture/staff-weight.musicxml',contents:xml})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}));expect(report.getByText(/보표 글자의 굵게 서식은 보존하지 못했습니다/)).toBeVisible();expect(report.getByText(/글자 내용은 유지됩니다/)).toBeVisible()
 const path='part[2].measure[2].direction[1].direction-type[1].words.@font-weight';expect(report.getByText(path)).not.toBeVisible();expect(playbackMockState.lastScore).toEqual(score)
 const technical=report.getByRole('button',{name:'기술 정보'});for(const[key,code]of[[' ','Space'],['Enter','Enter']])fireEvent.keyDown(technical,{key,code});expect(playbackMockState.play).not.toHaveBeenCalled();fireEvent.click(technical);expect(report.getByText(path)).toBeVisible();expect(report.getByText(/Unrepresented staff text font-weight /)).toBeVisible();expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
