// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import type {DurationValue} from '../../score-core'
import {decodeNativeProject} from '../../project/schema'
import {createMetronomeTextFixture} from '../../testing/metronome-text-fixture'
import {serializeMidi} from './midi/serialize-midi'
import {tempoMarkingToQuarterBpm} from './playback/timeline'
import {openStudioWorkspace,playbackMockState,registerAppTestHooks} from './App.test-harness'
registerAppTestHooks()
async function load(beatUnit:DurationValue,dots=0,position=false){
 window.history.replaceState({},'','/?fixture=release-test')
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/beat.musicxml',fileName:'beat.musicxml',contents:createMetronomeTextFixture({text:'90',beatUnit,dots,position})})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 await waitFor(()=>expect(position?playbackMockState.lastScore?.tempoEvents?.[0]:playbackMockState.lastScore?.tempo).toMatchObject({bpm:90,beatUnit,dots}))
 openStudioWorkspace('악보');return structuredClone(playbackMockState.lastScore!)
}
it.each([{unit:'32nd' as const,dots:0,label:/32분음표/},{unit:'64th' as const,dots:0,label:/64분음표/},{unit:'quarter' as const,dots:3,label:/점\s*3개/}])('shows the actually supported stored $unit dots$dots without a missing or clamped selection',async({unit,dots,label})=>{
 const before=await load(unit,dots),combo=screen.getByRole('combobox',{name:'빠르기 기준 음가'})
 expect(combo).toHaveTextContent(label);expect(playbackMockState.lastScore).toEqual(before);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it.each(['32nd','64th']as const)('opening and tabbing out of stored %s does not choose another beat or alter clock/history/native',async unit=>{
 const before=await load(unit),selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id'),q=tempoMarkingToQuarterBpm(before.tempo!),midi=serializeMidi(before),combo=screen.getByRole('combobox',{name:'빠르기 기준 음가'})
 fireEvent.click(combo);fireEvent.keyDown(combo,{key:'Tab',code:'Tab'})
 expect(playbackMockState.lastScore).toEqual(before);expect(tempoMarkingToQuarterBpm(playbackMockState.lastScore!.tempo!)).toBe(q);expect(serializeMidi(playbackMockState.lastScore!)).toEqual(midi);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')).toBe(selection)
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
 const contents=vi.mocked(window.inC.project.save).mock.calls[0][0].contents,saved=decodeNativeProject(contents)
 expect(saved.score).toEqual(before)
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/beat.chromatics',fileName:'beat.chromatics',contents});fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(saved.score));openStudioWorkspace('악보');expect(screen.getByRole('combobox',{name:'빠르기 기준 음가'})).toHaveTextContent(unit==='32nd'?'32분음표':'64분음표')
})
it.each(['32nd','64th']as const)('opening and escaping stored %s preserves the existing score control',async unit=>{
 const before=await load(unit),combo=screen.getByRole('combobox',{name:'빠르기 기준 음가'});fireEvent.click(combo);fireEvent.keyDown(combo,{key:'ArrowDown',code:'ArrowDown'});fireEvent.keyDown(combo,{key:'Escape',code:'Escape'});expect(playbackMockState.lastScore).toEqual(before);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('opening/tabbing a normal quarter mark remains a no-op control',async()=>{
 const before=await load('quarter'),combo=screen.getByRole('combobox',{name:'빠르기 기준 음가'});expect(combo).toHaveTextContent('4분음표');fireEvent.click(combo);expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(15);fireEvent.keyDown(combo,{key:'Tab',code:'Tab'});expect(playbackMockState.lastScore).toEqual(before);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('states the real three-dot beat in the existing positioned tempo selector and scope',async()=>{
 const before=await load('quarter',3,true),combo=screen.getByRole('combobox',{name:'편집할 빠르기 위치'});fireEvent.click(combo)
 const option=within(screen.getByRole('listbox')).getByRole('option',{name:/90 BPM/});expect(option).toHaveTextContent(/점\s*3개/);fireEvent.click(option)
 expect(screen.getByRole('region',{name:'위치별 빠르기'})).toHaveTextContent(/BPM 기준:.*점\s*3개/)
 expect(playbackMockState.lastScore).toEqual(before);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('retains the conditional stored choice through explicit edit, undo and redo without widening new-score choices',async()=>{
 const before=await load('64th'),combo=screen.getByRole('combobox',{name:'빠르기 기준 음가'});fireEvent.click(combo)
 expect(within(screen.getByRole('listbox')).getByRole('option',{selected:true})).toHaveTextContent('64분음표')
 fireEvent.click(within(screen.getByRole('listbox')).getByRole('option',{name:'4분음표'}))
 expect(playbackMockState.lastScore?.tempo).toMatchObject({beatUnit:'quarter',dots:0,bpm:90});expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
 const after=structuredClone(playbackMockState.lastScore),menu=(name:string)=>{const nav=within(screen.getByRole('navigation',{name:'앱 메뉴'}));fireEvent.click(nav.getByRole('button',{name:'편집'}));fireEvent.click(nav.getByRole('menuitem',{name}))}
 menu('실행 취소');expect(playbackMockState.lastScore).toEqual(before);expect(screen.getByRole('combobox',{name:'빠르기 기준 음가'})).toHaveTextContent('64분음표')
 menu('다시 실행');expect(playbackMockState.lastScore).toEqual(after);expect(screen.getByRole('combobox',{name:'빠르기 기준 음가'})).toHaveTextContent('4분음표')
})
