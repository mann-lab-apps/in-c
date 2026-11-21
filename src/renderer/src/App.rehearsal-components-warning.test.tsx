// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createRehearsalComponentsFixture } from '../../testing/rehearsal-components-fixture'
import { parseMusicXml } from '../../musicxml'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()
it.each(['styled','multiple'] as const)('explains %s lost rehearsal components in Korean and preserves save/keyboard contracts',async kind=>{
 window.history.replaceState({},'','/?fixture=release-test');const xml=createRehearsalComponentsFixture(kind),score=parseMusicXml(xml)
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'rehearsal-components.musicxml',filePath:'/fixture/rehearsal-components.musicxml',contents:xml})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
 expect(report.getAllByText(/여러 조각으로 작성된 연습표 글자는 현재 악보에 보존하지 못했습니다/)).toHaveLength(kind==='multiple'?3:1)
 const path=kind==='multiple'?'part[1].measure[3].direction[1].direction-type[1].rehearsal':'part[1].measure[2].direction[1].direction-type[1].rehearsal'
 expect(report.getByText(path)).not.toBeVisible();expect(playbackMockState.lastScore).toEqual(score)
 const technical=report.getAllByRole('button',{name:'기술 정보'})[0]
 for(const [key,code]of [[' ','Space'],['Enter','Enter']])fireEvent.keyDown(technical,{key,code})
 expect(playbackMockState.play).not.toHaveBeenCalled();fireEvent.click(technical)
 expect(report.getByText(path)).toBeVisible();expect(report.getAllByText(/Unrepresented rehearsal components /)[0]).toBeVisible()
 expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
 await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
