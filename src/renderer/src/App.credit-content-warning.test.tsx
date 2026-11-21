// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createCreditContentFixture} from '../../testing/credit-content-fixture'
import {openStudioWorkspace,playbackMockState,registerAppTestHooks} from './App.test-harness'
registerAppTestHooks()
it.each(['page2','symbol']as const)('explains %s lost root content with its real page and no false score address',async kind=>{
 window.history.replaceState({},'','/?fixture=release-test');vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/credit.musicxml',fileName:'credit.musicxml',contents:createCreditContentFixture(kind)})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
 expect(report.getByText(/^원본 2쪽의 추가 글자·음악 기호는 현재 악보에 보존하지 못했습니다/)).toBeVisible();expect(report.queryByText(/번째 파트|[0-9]마디/)).not.toBeInTheDocument();expect(document.querySelector('.studio-status__result')).toHaveTextContent('페이지 글자·기호 손실')
 const raw=report.getByText(/Unrepresented credit content /);expect(raw).not.toBeVisible();fireEvent.keyDown(report.getByRole('button',{name:'기술 정보'}),{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled();fireEvent.click(report.getByRole('button',{name:'기술 정보'}));expect(raw).toBeVisible();expect(report.getByText('credit[1].'+(kind==='symbol'?'credit-symbol':'credit-words')+'[1]')).toBeVisible()
 fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(playbackMockState.lastScore)
 expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('summarizes repeated root content by page while retaining all 30 original rows',async()=>{
 window.history.replaceState({},'','/?fixture=release-test');vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/many.musicxml',fileName:'many.musicxml',contents:createCreditContentFixture('many')})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
 const button=report.getByRole('button',{name:'페이지별 경고 상세 30개'});expect(report.getAllByText(/Unrepresented credit content /)).toHaveLength(30);expect(report.getByText('credit[30].credit-words[1]')).not.toBeVisible();fireEvent.click(button);expect(report.getByText('credit[30].credit-words[1]')).not.toBeVisible();expect(report.getAllByRole('button',{name:'기술 정보'})).toHaveLength(30)
})
it('keeps mixed content and rights rows visible without hiding them behind the repeated-page summary',async()=>{
 window.history.replaceState({},'','/?fixture=release-test');vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/mixed.musicxml',fileName:'mixed.musicxml',contents:createCreditContentFixture('mixed')})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}));expect(report.queryByRole('button',{name:/페이지별 경고 상세/})).not.toBeInTheDocument();expect(report.getAllByRole('button',{name:'기술 정보'})).toHaveLength(31);expect(report.getByText(/원본 저작권 고지/)).toBeVisible()
})
