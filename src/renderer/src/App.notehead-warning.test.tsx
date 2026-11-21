// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import{fireEvent,render,screen,waitFor,within}from'@testing-library/react'
import{expect,it,vi}from'vitest'
import{createNoteheadFixture}from'../../testing/notehead-fixture'
import{parseMusicXml}from'../../musicxml'
import{playbackMockState,openStudioWorkspace,registerAppTestHooks}from'./App.test-harness'
registerAppTestHooks()
it.each([{head:'diamond',value:'whole'},{head:'normal',value:'quarter',filled:'no'}]as const)('explains actual notehead loss in Korean and preserves original diagnostics %j',async options=>{
 window.history.replaceState({},'','/?fixture=release-test')
 const xml=createNoteheadFixture({...options,partCount:2,targetPart:2,targetMeasure:2}),supported=parseMusicXml(xml)
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/notehead.musicxml',fileName:'notehead.musicxml',contents:xml})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
 expect(report.getByText(/^2번째 파트 · 2마디 · 원본 음표 머리의/)).toBeVisible();expect(report.getByText('part[2].measure[2].note[1].notehead')).not.toBeVisible();expect(playbackMockState.lastScore).toEqual(supported)
 fireEvent.click(report.getByRole('button',{name:'기술 정보'}));expect(report.getByText('part[2].measure[2].note[1].notehead')).toBeVisible();expect(report.getByText(/Explicit notehead appearance/)).toBeVisible()
 expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(supported)
})
