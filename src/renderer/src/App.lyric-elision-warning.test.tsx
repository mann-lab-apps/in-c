// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent,render,screen,waitFor,within } from '@testing-library/react'
import { expect,it,vi } from 'vitest'
import { createLyricElisionFixture,lyricElisionCases } from '../../testing/lyric-elision-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace,playbackMockState,registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['single','mixed'] as const)('explains %s explicit lyric symbol loss with its original source and unchanged save/history',async kind=>{
 window.history.replaceState({},'', '/?fixture=release-test')
 const example=lyricElisionCases.find(c=>c.id==='undertie')!,source=createLyricElisionFixture(example),xml=kind==='mixed'?source.replace('<type>whole</type>','<type>whole</type><notehead>none</notehead>'):source
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/elision.musicxml',fileName:'elision.musicxml',contents:xml})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
 expect(report.getByText(/가사 음절 사이의 연결 기호는 보존하지 못했습니다/)).toBeVisible()
 const path='part[2].measure[2].note[1].lyric[1].elision[1]',raw=report.getByText(path),row=raw.closest('li');if(!row)throw Error('Source owner missing')
 expect(raw).not.toBeVisible();fireEvent.click(within(row).getByRole('button',{name:'기술 정보'}));expect(raw).toBeVisible();expect(within(row).getByText(/Unrepresented lyric elision /)).toHaveTextContent('"value":"‿"')
 expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/Unrepresented|part\[/)
 expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml));expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 vi.mocked(window.inC.project.save).mockResolvedValueOnce({filePath:'/fixture/elision.chromatics',fileName:'elision.chromatics'})
 fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
 expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(parseMusicXml(xml))
 await waitFor(()=>expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음'))
})
