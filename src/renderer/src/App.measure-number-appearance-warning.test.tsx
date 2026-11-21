// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createMeasureNumberAppearanceFixture} from '../../testing/measure-number-appearance-fixture'
import {parseMusicXml} from '../../musicxml'
import {playbackMockState,registerAppTestHooks,openStudioWorkspace} from './App.test-harness'
registerAppTestHooks()
it.each(['text','none']as const)('explains %s display loss without renumbering the score or creating an undo',async kind=>{
 window.history.replaceState({},'','/?fixture=release-test');const xml=createMeasureNumberAppearanceFixture(kind),score=parseMusicXml(xml)
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'number-appearance.musicxml',filePath:'/fixture/number-appearance.musicxml',contents:xml})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}));expect(report.getByText(kind==='text'?/^2번째 파트 · 2마디 · 원본 마디 번호 문구는/:/^2번째 파트 · 2마디 · 원본 마디 번호 표시설정은/)).toBeVisible();expect(playbackMockState.lastScore).toEqual(score)
 const path=kind==='text'?'part[2].measure[2].@text':'part[2].measure[2].print[1].measure-numbering[1]';expect(report.getByText(path)).not.toBeVisible();const technical=report.getByRole('button',{name:'기술 정보'});fireEvent.keyDown(technical,{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled();fireEvent.click(technical);expect(report.getByText(path)).toBeVisible();expect(report.getAllByText(/Unrepresented measure number/)[0]).toBeVisible();expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());const project=JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents);expect(project.score).toEqual(score);expect(project.score.parts[1].staves[0].measures.map((b:{number:number})=>b.number)).toEqual([1,2,3])
})
