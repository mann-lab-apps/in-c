// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { parseMusicXml } from '../../musicxml/parse'
import { createScoreRepeatPlaybackPlan } from '../../score-core'
import { makeNavigationSoundXml } from '../../testing/navigation-sound-fixture'
import { chooseScoreView, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['direction','direct'] as const)('explains the lost %s D.C. directive in Korean without executing a new jump',async container=>{
 window.history.replaceState({},'', '/?fixture=release-test')
 const xml=makeNavigationSoundXml({container,midMeasure:true}),expected=decodeNativeProject(encodeNativeProject(createNativeProject(parseMusicXml(xml)))).score
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

it.each([false, true])('exports the full D.S. route from a selected part with after-jump %s', async afterJump => {
  const attributes = '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>'
  const bar = '<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>'
  const repeatStart = '<barline location="left"><repeat direction="forward"/></barline>'
  const repeatEnd = (flag?: boolean) =>
    `<barline location="right"><repeat direction="backward"${flag === undefined ? '' : ` after-jump="${flag ? 'yes' : 'no'}"`}/></barline>`
  const input = `<score-partwise version="4.0"><part-list>
    <score-part id="P1"><part-name>First</part-name></score-part>
    <score-part id="P2"><part-name>Second</part-name></score-part>
    </part-list><part id="P1"><measure number="1">${attributes}${repeatStart}<sound segno="S"/>${bar}</measure>
    <measure number="2">${bar}${repeatEnd()}</measure>
    <measure number="3">${bar}<sound fine="yes"/></measure>
    <measure number="4">${bar}</measure></part>
    <part id="P2"><measure number="1">${attributes}${repeatStart}${bar}</measure>
    <measure number="2">${bar}${repeatEnd(afterJump)}</measure>
    <measure number="3">${bar}</measure>
    <measure number="4">${bar}<sound dalsegno="S"/></measure></part></score-partwise>`
  const project = createNativeProject(parseMusicXml(input))
  const expected = [1, 2, 1, 2, 3, 4, 1, 2, ...(afterJump ? [1, 2] : []), 3]
  const order = (score: typeof project.score) =>
    createScoreRepeatPlaybackPlan(score)?.entries.map(entry => entry.measureIndex + 1)
  expect(order(project.score)).toEqual(expected)
  const native = encodeNativeProject(project)
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({
    filePath: '/fixture/split-navigation.chromatics', fileName: 'split-navigation.chromatics', contents: native
  })
  const {App} = await import('./App')
  render(<App/>)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  chooseScoreView('악보 보기', 'part')
  chooseScoreView('파트보 선택', 'P1')
  openStudioWorkspace('내보내기')
  const exportCopy = vi.mocked(window.inC.musicXml.exportCopy)
  exportCopy.mockResolvedValue({ filePath: '/fixture/part.musicxml', fileName: 'part.musicxml' })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' })))
  await waitFor(() => expect(exportCopy).toHaveBeenCalledOnce())
  const ordinary = parseMusicXml(exportCopy.mock.calls[0][0].contents)
  expect(ordinary.parts.map(part => part.id)).toEqual(['P1'])
  expect(ordinary.parts[0].staves[0].measures[1].repeat?.afterJump).toBe(afterJump)
  expect(order(ordinary)).toEqual(expected)
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '반복 펼치기 MusicXML 내보내기' })))
  await waitFor(() => expect(exportCopy).toHaveBeenCalledTimes(2))
  const expanded = parseMusicXml(exportCopy.mock.calls[1][0].contents)
  expect(expanded.parts[0].staves[0].measures).toHaveLength(expected.length)
  expect(expanded.parts[0].staves[0].measures.every(measure => !measure.navigation)).toBe(true)
  expect(playbackMockState.lastScore).toEqual(project.score)
})

it('blocks a MusicXML copy when reopening it would lose a Native jump', async () => {
  const score = parseMusicXml(makeNavigationSoundXml({ container: 'direct' }))
  const jump = score.parts[1].staves[0].measures[1]
  expect(jump.navigation).toEqual([{ type: 'dacapo' }])
  jump.navigation = [{ type: 'dalsegno', label: 'missing-marker' }]
  const project = createNativeProject(score)
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({
    filePath: '/fixture/missing-segno.chromatics',
    fileName: 'missing-segno.chromatics',
    contents: encodeNativeProject(project)
  })
  const { App } = await import('./App')
  render(<App/>)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  openStudioWorkspace('내보내기')
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' })))
  expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled()
  expect(screen.getByRole('status', { name: '편집 및 파일 상태' })).toHaveTextContent('MusicXML 저장 검증에 실패했습니다.')
  expect(playbackMockState.lastScore).toEqual(project.score)
})
