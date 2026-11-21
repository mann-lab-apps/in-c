// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { createNote, createDuration, type SpanEngraving } from '../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { createNewScore } from './editor/new-score'
import { chooseSpanReference, playbackMockState, registerAppTestHooks } from './App.test-harness'
import type { NotationPreviewProps } from './notation/NotationPreview'
registerAppTestHooks()
let props: NotationPreviewProps
let restore: (()=>void)|undefined
afterEach(()=>{restore?.();restore=undefined})
async function setup(kind:'slur'|'hairpin'='slur',automatic=false){
 window.history.replaceState({},'','/?fixture=release-test')
 const module=await import('./notation/NotationPreview'),original=module.NotationPreview,spy=vi.spyOn(module,'NotationPreview').mockImplementation(value=>{if(!value.printLayout)props=value;return original(value)});restore=()=>spy.mockRestore()
 const score=createNewScore({title:'수동 선 끌기 검증',templateId:'solo-melody',measureCount:4,keySignature:{fifths:0,mode:'major'},timeSignature:{beats:4,beatType:4}}),bars=score.parts[0].staves[0].measures
 for(const bar of bars)bar.voices[0].events=[createNote({id:bar.voices[0].events[0].id,duration:createDuration('whole'),pitch:{step:'C',octave:4}})]
 const ids=bars.map(bar=>bar.voices[0].events[0].id)
 score.slurs=[{id:'drag-slur',startEventId:ids[0],endEventId:ids[1],engraving:automatic?undefined:{placement:'above',offsetX:0,offsetY:.13,height:2}}]
 score.hairpins=[{id:'drag-hairpin',type:'crescendo',startEventId:ids[2],endEventId:ids[3],engraving:automatic?undefined:{placement:'below',offsetY:0,height:1}}]
 const project=decodeNativeProject(encodeNativeProject(createNativeProject(score)))
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'drag.chromatics',filePath:'/fixture/drag.chromatics',contents:encodeNativeProject(project)})
 const{App}=await import('./App');render(<App/>);fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score));chooseSpanReference(`${kind}:drag-${kind}`)
 const base=(kind==='slur'?project.score.slurs!:project.score.hairpins!)[0].engraving
 return{project,base,kind,begin:()=>{expect(typeof props.onBeginSpanDrag).toBe('function');return props.onBeginSpanDrag!({kind,id:'drag-'+kind},base!)}}
}
it.each(['slur','hairpin'] as const)('commits one manual %s drag through the existing engraving command with exact undo/native and unchanged music',async kind=>{
 const{project,base,begin}=await setup(kind),transaction=begin();expect(transaction).toBeDefined();expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 const next={...base,offsetX:.5,offsetY:-.25};act(()=>{expect(transaction!.commit(next)).toBe(true);expect(transaction!.commit({...next,offsetX:1})).toBe(false)});const expected=structuredClone(project.score);(kind==='slur'?expected.slurs!:expected.hairpins!)[0].engraving=next
 expect(playbackMockState.lastScore).toEqual(expected);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');expect(serializeMidi(expected)).toEqual(serializeMidi(project.score))
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score);fireEvent.keyDown(window,{key:'y',code:'KeyY',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(expected)
 fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
})
it('rejects no-op, range overflow and shape changes without adding history',async()=>{
 const{project,base,begin}=await setup();for(const next of[base!,{...base,offsetX:9},{...base,height:3,offsetY:.5}]){const tx=begin();act(()=>expect(tx!.commit(next as SpanEngraving)).toBe(false))};expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('keeps automatic spans outside the drag transaction',async()=>{
 const{project,begin}=await setup('slur',true);expect(begin()).toBeUndefined();expect(playbackMockState.lastScore).toEqual(project.score)
})
it('cancels a stale transaction after another span is selected',async()=>{
 const{project,base,begin}=await setup(),tx=begin();chooseSpanReference('hairpin:drag-hairpin');act(()=>expect(tx!.commit({...base,offsetX:.5})).toBe(false));expect(playbackMockState.lastScore).toEqual(project.score)
})
it('cannot apply an old gesture to another document with identical span ids and geometry',async()=>{
 const{project,base,begin}=await setup(),tx=begin(),other=structuredClone(project);other.score.title='다른 문서'
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'other.chromatics',filePath:'/fixture/other.chromatics',contents:encodeNativeProject(other)});fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(other.score));chooseSpanReference('slur:drag-slur');act(()=>expect(tx!.commit({...base,offsetX:.5})).toBe(false));expect(playbackMockState.lastScore).toEqual(other.score)
})

it('does not leak an unconfirmed geometry draft into a drag or replay an old gesture after the field commits',async()=>{
 const{base,begin}=await setup(),old=begin();fireEvent.click(screen.getByRole('button',{name:'배치 · 형상'}));const input=screen.getByRole('spinbutton',{name:'표기 세로 이동'});act(()=>input.focus());fireEvent.change(input,{target:{value:'1'}});expect(begin()).toBeUndefined();act(()=>input.blur());const edited=structuredClone(playbackMockState.lastScore!);expect(edited.slurs![0].engraving!.offsetY).toBe(1);act(()=>expect(old!.commit({...base,offsetX:.5})).toBe(false));expect(playbackMockState.lastScore).toEqual(edited);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
})
