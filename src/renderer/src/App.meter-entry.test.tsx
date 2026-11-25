// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createNewScore} from './editor/new-score'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../project/schema'
import {parseMusicXml,serializeMusicXml} from '../../musicxml'
import {openStudioWorkspace,registerAppTestHooks,playbackMockState} from './App.test-harness'
registerAppTestHooks()
it('right-click opens the selected bar meter field without editing, then applies one-bar meter and one undo',async()=>{
 window.history.replaceState({},'', '/?fixture=release-test')
 const source=createNativeProject(createNewScore({title:'Meter QA',templateId:'string-quartet',measureCount:3,keySignature:{fifths:0},timeSignature:{beats:4,beatType:4}}))
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/meter.chromatics',fileName:'meter.chromatics',contents:encodeNativeProject(source)})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
 await waitFor(()=>expect(playbackMockState.lastScore).toEqual(source.score))
 fireEvent.contextMenu(screen.getByRole('button',{name:'2마디 선택'}),{clientX:200,clientY:180})
 fireEvent.click(within(screen.getByRole('menu',{name:'마디 작업'})).getByRole('menuitem',{name:'박자표 변경…'}))
 expect(screen.queryByRole('menu',{name:'마디 작업'})).not.toBeInTheDocument()
 const meter=screen.getByRole('combobox',{name:'박자표'})
 await waitFor(()=>expect(meter).toHaveFocus())
 expect(playbackMockState.lastScore).toEqual(source.score)
 expect(screen.getByText(/박자표 적용:.*2마디.*선택 보표의 이 마디만/)).toBeVisible()
 fireEvent.click(meter);fireEvent.click(screen.getByRole('option',{name:'3/4'}))
 const next=playbackMockState.lastScore!
 expect(next.parts[0].staves[0].measures[1].timeSignature).toEqual({beats:3,beatType:4})
 expect(next.parts[0].staves[0].measures[0]).toEqual(source.score.parts[0].staves[0].measures[0])
 expect(next.parts[0].staves[0].measures[2]).toEqual(source.score.parts[0].staves[0].measures[2])
 expect(next.parts.slice(1)).toEqual(source.score.parts.slice(1))
 expect(decodeNativeProject(encodeNativeProject({...source,score:next})).score).toEqual(next)
 const exchanged=parseMusicXml(serializeMusicXml(next))
 expect(exchanged.parts[0].staves[0].measures.map(m=>m.timeSignature)).toEqual([{beats:4,beatType:4},{beats:3,beatType:4},{beats:4,beatType:4}])
 expect(exchanged.parts.slice(1).flatMap(p=>p.staves.flatMap(s=>s.measures.map(m=>m.timeSignature)))).toEqual(Array(9).fill({beats:4,beatType:4}))
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source.score)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(next)
})

it('changes the complete score at the selected bar through a separate explicit command', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = createNativeProject(createNewScore({ title: 'Score meter QA', templateId: 'string-quartet',
    measureCount: 3, keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } }))
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({
    filePath: '/fixture/score-meter.chromatics', fileName: 'score-meter.chromatics', contents: encodeNativeProject(source)
  })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score))
  fireEvent.contextMenu(screen.getByRole('button', { name: '2마디 선택' }), { clientX: 200, clientY: 180 })
  fireEvent.click(within(screen.getByRole('menu', { name: '마디 작업' })).getByRole('menuitem', { name: '박자표 변경…' }))
  fireEvent.click(screen.getByRole('button', { name: '이 마디의 총보 박자표…' }))
  const dialog = within(screen.getByRole('dialog', { name: '총보 박자표' }))
  expect(dialog.getByText(/모든 보표의 이 마디/)).toBeVisible()
  fireEvent.change(dialog.getByRole('spinbutton', { name: '박자 분자' }), { target: { value: '3' } })
  fireEvent.click(dialog.getByRole('button', { name: '적용' }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '총보 박자표' })).not.toBeInTheDocument())
  const changed = playbackMockState.lastScore!
  expect(changed.parts.map(part => part.staves[0].measures.map(bar => bar.timeSignature.beats)))
    .toEqual(Array.from({ length: 4 }, () => [4, 3, 4]))
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(source.score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(changed)
})
