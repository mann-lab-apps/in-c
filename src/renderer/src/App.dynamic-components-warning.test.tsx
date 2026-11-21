// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createDynamicComponentsCases} from '../../testing/dynamic-components-fixture'
import {parseMusicXml} from '../../musicxml'
import {playbackMockState,registerAppTestHooks,openStudioWorkspace} from './App.test-harness'
registerAppTestHooks()
it.each(createDynamicComponentsCases())('explains $id dynamic glyph loss separately from existing note loudness and keeps save/history',async c=>{
 window.history.replaceState({},'','/?fixture=release-test');const score=parseMusicXml(c.control)
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'dynamic-components.musicxml',filePath:'/fixture/dynamic-components.musicxml',contents:c.xml})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(score))
 if(c.lost||c.knownAttribute){
  const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}));expect(report.getAllByRole('listitem')).toHaveLength(Number(c.lost)+Number(Boolean(c.knownAttribute)))
  if(c.lost){const note=c.id.startsWith('note'),message=report.getByText(note?/음표·쉼표에 직접 붙은 셈여림 기호는 가져오지 못했습니다/:/복합 또는 미지원 셈여림 표기는 그대로 가져오지 못했습니다/),row=within(message.closest('li')!),path=c.id==='owner'?'part[2].measure[2].direction[2].direction-type[2].dynamics':note?'part[1].measure[1].note[1].notations[1].dynamics[1]':'part[1].measure[1].direction[1].direction-type[1].dynamics';expect(message).toBeVisible();if(c.id==='owner')expect(message).toHaveTextContent('2번째 파트 · 2마디 ·');expect(document.querySelector('.studio-status__result')).toHaveTextContent('셈여림 지원 범위');expect(row.getByText(path)).not.toBeVisible();const technical=row.getByRole('button',{name:'기술 정보'});fireEvent.keyDown(technical,{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled();fireEvent.click(technical);expect(row.getByText(path)).toBeVisible();expect(row.getByText(note?/Unrepresented note-attached dynamics /:/Unrepresented dynamic marking /)).toBeVisible()}
  if(c.knownAttribute)expect(report.getByText(/음표별로 지정된 재생 시작 세기는 가져오지 못했습니다/)).toBeVisible()
 }else expect(screen.queryByRole('region',{name:'MusicXML 경고 상세'})).not.toBeInTheDocument()
 expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
