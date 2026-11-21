// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { parseMusicXml } from '../../musicxml/parse'
import { makeNavigationSoundXml } from '../../testing/navigation-sound-fixture'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['direction','direct'] as const)('explains the lost %s D.C. directive in Korean without executing a new jump',async container=>{
 window.history.replaceState({},'', '/?fixture=release-test')
 const xml=makeNavigationSoundXml({container}),expected=decodeNativeProject(encodeNativeProject(createNativeProject(parseMusicXml(xml)))).score
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/navigation.musicxml',fileName:'navigation.musicxml',contents:xml})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
 expect(report.getByText(/2번째 파트 · 2마디 · MusicXML의 D.C. 재생 이동 지시는 아직 적용하지 않습니다/)).toBeVisible()
 const path=container==='direct'?'part[2].measure[2].sound[1].dacapo':'part[2].measure[2].direction[1].sound.dacapo'
 expect(report.getByText(path)).not.toBeVisible();expect(JSON.parse(JSON.stringify(playbackMockState.lastScore))).toEqual(expected)
 const navigationItem=report.getAllByRole('listitem').find(item=>item.textContent?.includes(path))!
 expect(navigationItem).toBeTruthy()
 const navigationTechnical=within(navigationItem).getByRole('button',{name:'기술 정보'})
 fireEvent.click(navigationTechnical);expect(within(navigationItem).getByText(path)).toBeVisible();expect(within(navigationItem).getByText(/Playback navigation sound "dacapo"/)).toBeVisible()
 expect(report.getAllByRole('listitem')).toHaveLength(container==='direction'?2:1)
 if(container==='direction'){
  const textPath='part[2].measure[2].direction[1].direction-type[1].words'
  const textItem=report.getAllByRole('listitem').find(item=>item.textContent?.includes(textPath))!
  expect(within(textItem).getByText(/^2번째 파트 · 2마디 · 보표 글자의 마디 안 위치는 보존하지 못했습니다/)).toBeVisible()
  expect(within(textItem).getByText(textPath)).not.toBeVisible()
  fireEvent.click(within(textItem).getByRole('button',{name:'기술 정보'}))
  expect(within(textItem).getByText(textPath)).toBeVisible()
  expect(within(textItem).getByText(/position=4 quarter-beats/)).toBeVisible()
 }
 fireEvent.keyDown(navigationTechnical,{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled()
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
 expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
})
