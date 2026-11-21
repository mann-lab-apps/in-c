// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,within,waitFor} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createInlineClefFixture} from '../../testing/inline-clef-fixture'
import {parseMusicXml} from '../../musicxml'
import {registerAppTestHooks,openStudioWorkspace,playbackMockState} from './App.test-harness'
registerAppTestHooks()
it('shows the exact inline-clef loss outside technical disclosure and preserves the supported import snapshot',async()=>{
 window.history.replaceState({},'', '/?fixture=release-test')
 const xml=createInlineClefFixture('middle'),source=parseMusicXml(xml)
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/inline.musicxml',fileName:'inline.musicxml',contents:xml})
 vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/fixture/inline.chromatics',fileName:'inline.chromatics'})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
 expect(report.getByText(/^1번째 파트 · 2마디 · 마디 안 음자리표 변경의 위치는 보존하지 못합니다/)).toBeVisible()
 expect(report.getByText('part[1].measure[2].attributes[1].clef[1]')).not.toBeVisible()
 expect(playbackMockState.lastScore).toEqual(source)
 fireEvent.click(report.getByRole('button',{name:'기술 정보'}));expect(report.getByText('part[1].measure[2].attributes[1].clef[1]')).toBeVisible()
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
 expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(source)
})
