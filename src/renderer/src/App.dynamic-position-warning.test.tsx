// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createDynamicPositionFixture,dynamicPositionCases} from '../../testing/dynamic-position-fixture'
import {parseMusicXml} from '../../musicxml'
import {playbackMockState,registerAppTestHooks,openStudioWorkspace} from './App.test-harness'
registerAppTestHooks()
it.each(dynamicPositionCases)('explains $id dynamic scope loss without changing the measure model or save history',async c=>{
 window.history.replaceState({},'','/?fixture=release-test');const xml=createDynamicPositionFixture(c.id),score=parseMusicXml(createDynamicPositionFixture())
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'dynamic-position.musicxml',filePath:'/fixture/dynamic-position.musicxml',contents:xml})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 await waitFor(()=>expect(playbackMockState.lastScore).toEqual(score))
 if(c.tick!==0||c.voice!==undefined){
  const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
  expect(report.getByText(/셈여림의 마디 안 위치·성부 지정은 보존하지 못했습니다/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('셈여림 적용 범위')
  const path='part[1].measure[1].direction[1].direction-type[1].dynamics';expect(report.getByText(path)).not.toBeVisible()
  const technical=report.getByRole('button',{name:'기술 정보'});fireEvent.keyDown(technical,{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.click(technical);expect(report.getByText(path)).toBeVisible();expect(report.getByText(/Unrepresented dynamic scope /)).toBeVisible()
 }else expect(screen.queryByRole('region',{name:'MusicXML 경고 상세'})).not.toBeInTheDocument()
 expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
