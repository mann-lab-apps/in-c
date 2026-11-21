// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createRightsFixture} from '../../testing/rights-fixture'
import {parseMusicXml} from '../../musicxml'
import {playbackMockState,registerAppTestHooks,openStudioWorkspace} from './App.test-harness'
registerAppTestHooks()
it.each(['root-single','credit-multi']as const)('explains lost %s notices in Korean with local technical disclosure and unchanged native score',async kind=>{
 window.history.replaceState({},'','/?fixture=release-test');const xml=createRightsFixture(kind),expected=parseMusicXml(createRightsFixture('control'))
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'rights.musicxml',filePath:'/fixture/rights.musicxml',contents:xml});const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}));expect(report.getAllByText(/^원본 저작권 고지/)[0]).toBeVisible();expect(report.queryByText(/번째 파트|\d마디/)).not.toBeInTheDocument();expect(playbackMockState.lastScore).toEqual(expected)
 const path=kind==='root-single'?'identification.rights[1]':'credit[3].credit-words[1]';expect(report.getByText(path)).not.toBeVisible();const technical=report.getAllByRole('button',{name:'기술 정보'})[0];fireEvent.keyDown(technical,{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled();fireEvent.click(technical);expect(report.getByText(path)).toBeVisible();expect(report.getAllByText(/Unrepresented rights notice /)[0]).toBeVisible();expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
})
