// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import{fireEvent,render,screen,waitFor,within}from'@testing-library/react'
import{expect,it,vi}from'vitest'
import{createArpeggioFixture}from'../../testing/arpeggio-fixture'
import{parseMusicXml}from'../../musicxml'
import{playbackMockState,openStudioWorkspace,registerAppTestHooks}from'./App.test-harness'
registerAppTestHooks()
it.each(['arpeggiate-down','glissando']as const)('explains additional notation loss in Korean and preserves original diagnostics %j',async kind=>{
 window.history.replaceState({},'','/?fixture=release-test')
 const xml=createArpeggioFixture(kind),supported=parseMusicXml(xml)
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/arpeggio.musicxml',fileName:'arpeggio.musicxml',contents:xml})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
 expect(report.getAllByText(/^2번째 파트 · 2마디 · 원본 아르페지오·글리산도/)[0]).toBeVisible();expect(report.getByText(`part[2].measure[2].note[1].notations[1].${kind==='arpeggiate-down'?'arpeggiate':'glissando'}[1]`)).not.toBeVisible();expect(playbackMockState.lastScore).toEqual(supported)
 expect(report.getAllByRole('button',{name:'기술 정보'})).toHaveLength(kind==='arpeggiate-down'?3:2);fireEvent.click(report.getAllByRole('button',{name:'기술 정보'})[0]);expect(report.getByText(`part[2].measure[2].note[1].notations[1].${kind==='arpeggiate-down'?'arpeggiate':'glissando'}[1]`)).toBeVisible();expect(report.getAllByText(/Unrepresented additional notation/)[0]).toBeVisible()
 expect(document.querySelector('.studio-status__result')).toHaveTextContent('경고 상세에서 보존되지 않은 추가 기호를 확인해 주세요.')
 expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(supported)
})

it('keeps unrelated notehead loss visible when additional notation warnings are mixed', async () => {
 window.history.replaceState({},'','/?fixture=release-test')
 const xml=createArpeggioFixture('glissando').replace('<type>quarter</type>','<type>quarter</type><notehead>diamond</notehead>')
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/mixed.musicxml',fileName:'mixed.musicxml',contents:xml})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}));expect(report.getAllByRole('button',{name:'기술 정보'})).toHaveLength(3)
 expect(document.querySelector('.studio-status__result')).toHaveTextContent('음표 머리의');expect(document.querySelector('.studio-status__result')).toHaveTextContent('원본 아르페지오·글리산도')
 expect(document.querySelector('.studio-status__result')).not.toHaveTextContent('경고 상세에서 보존되지 않은 추가 기호를 확인해 주세요.')
 expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
