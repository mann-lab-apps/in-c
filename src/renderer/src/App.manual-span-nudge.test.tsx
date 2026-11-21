// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createNote,createDuration} from '../../score-core'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../project/schema'
import {createNewScore} from './editor/new-score'
import {serializeMidi} from './midi/serialize-midi'
import {playbackMockState,chooseSpanReference,registerAppTestHooks} from './App.test-harness'
registerAppTestHooks()
async function setup(kind:'slur'|'hairpin'='slur',offsetY=0,automatic=false){
 window.history.replaceState({},'','/?fixture=release-test')
 const score=createNewScore({title:'수동 표기 이동 '+kind,templateId:'solo-melody',measureCount:4,keySignature:{fifths:0,mode:'major'},timeSignature:{beats:4,beatType:4}})
 const bars=score.parts[0].staves[0].measures
 for(const bar of bars)bar.voices[0].events=[createNote({id:bar.voices[0].events[0].id,duration:createDuration('whole'),pitch:{step:'C',octave:4}})]
 const ids=bars.map(b=>b.voices[0].events[0].id)
 score.slurs=[{id:'nudge-slur',startEventId:ids[0],endEventId:ids[1],engraving:automatic?undefined:{placement:'above',offsetX:0,offsetY,height:2}}]
 score.hairpins=[{id:'nudge-hairpin',type:'crescendo',startEventId:ids[2],endEventId:ids[3],engraving:automatic?undefined:{placement:'below',offsetX:0,offsetY,height:1}}]
 const project=decodeNativeProject(encodeNativeProject(createNativeProject(score)))
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/nudge.chromatics',fileName:'nudge.chromatics',contents:encodeNativeProject(project)})
 const{App}=await import('./App');render(<App/>);fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score));chooseSpanReference(`${kind}:nudge-${kind}`)
 // Project only the real renderer's focus target; actual SVG/keyboard follows in owned Electron.
 const node=document.createElementNS('http://www.w3.org/2000/svg','g');node.classList.add('notation-span-target');node.dataset.spanKind=kind;node.dataset.spanId='nudge-'+kind;node.setAttribute('tabindex','0');screen.getByTestId('notation-preview').append(node);act(()=>node.focus());expect(node).toHaveFocus()
 return{project,node,kind}
}
it.each(['slur','hairpin']as const)('nudges one manual %s through the existing command and preserves music/one undo',async kind=>{
 const{project,node}=await setup(kind),field=kind==='slur'?'offsetY':'offsetX',key=kind==='slur'?'ArrowUp':'ArrowRight'
 fireEvent.keyDown(node,{key,code:key});const changed=structuredClone(playbackMockState.lastScore!),spans=kind==='slur'?changed.slurs!:changed.hairpins!
 expect(spans[0].engraving?.[field]).toBe(kind==='slur'?-.25:.25)
 const expected=structuredClone(project.score),target=kind==='slur'?expected.slurs!:expected.hairpins!;target[0].engraving![field]=kind==='slur'?-.25:.25
 expect(changed).toEqual(expected);expect(serializeMidi(changed)).toEqual(serializeMidi(project.score));expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score);fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(changed)
 const dir=process.env.STUDIO_SPAN_NUDGE_QA_DIR;if(dir){mkdirSync(dir,{recursive:true});writeFileSync(join(dir,kind+'-source.chromatics'),encodeNativeProject(project),{flag:'wx'});writeFileSync(join(dir,kind+'-expected.chromatics'),encodeNativeProject({...project,score:changed}),{flag:'wx'});writeFileSync(join(dir,kind+'.json'),JSON.stringify({kind,id:'nudge-'+kind,key,field,value:kind==='slur'?-.25:.25},null,2),{flag:'wx'})}
})
it('snaps an imported fractional offset only on explicit motion and preserves zero/height',async()=>{
 const{project,node}=await setup('slur',.1);expect(playbackMockState.lastScore).toEqual(project.score);fireEvent.keyDown(node,{key:'ArrowUp',code:'ArrowUp'});expect(playbackMockState.lastScore!.slurs![0].engraving).toEqual({...project.score.slurs![0].engraving,offsetY:0})
})
it('rejects motion past the bound without clamping or empty undo, then permits inward motion',async()=>{
 const{project,node}=await setup('slur',8);fireEvent.keyDown(node,{key:'ArrowDown',code:'ArrowDown'});expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');fireEvent.keyDown(node,{key:'ArrowUp',code:'ArrowUp'});expect(playbackMockState.lastScore!.slurs![0].engraving!.offsetY).toBe(7.75)
})
it('keeps automatic spans unchanged and explains the manual-only scope',async()=>{
 const{project,node}=await setup('slur',0,true);fireEvent.keyDown(node,{key:'ArrowUp',code:'ArrowUp'});expect(playbackMockState.lastScore).toEqual(project.score);expect(screen.getByLabelText('표기 직접 이동 안내')).toHaveTextContent('수동 배치');expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('keeps composition, modifier and number-draft ownership',async()=>{
 const{project,node}=await setup();for(const extra of[{isComposing:true},{keyCode:229},{altKey:true},{shiftKey:true}])fireEvent.keyDown(node,{key:'ArrowUp',code:'ArrowUp',...extra});expect(playbackMockState.lastScore).toEqual(project.score)
 fireEvent.click(screen.getByRole('button',{name:'배치 · 형상'}));const input=screen.getByRole('spinbutton',{name:'표기 세로 이동'});act(()=>input.focus());fireEvent.change(input,{target:{value:'1'}});fireEvent.keyDown(input,{key:'ArrowUp',code:'ArrowUp'});expect(playbackMockState.lastScore).toEqual(project.score);act(()=>input.blur());expect(playbackMockState.lastScore!.slurs![0].engraving!.offsetY).toBe(1);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
})
it('does not apply a stale target after another span is selected',async()=>{
 const{project,node}=await setup();chooseSpanReference('hairpin:nudge-hairpin');fireEvent.keyDown(node,{key:'ArrowUp',code:'ArrowUp'});expect(playbackMockState.lastScore).toEqual(project.score)
})

it('uses the command-modified one-sp grid without changing note octaves',async()=>{
 const{project,node}=await setup('slur',.25)
 fireEvent.keyDown(node,{key:'ArrowDown',code:'ArrowDown',ctrlKey:true});expect(playbackMockState.lastScore!.slurs![0].engraving!.offsetY).toBe(1)
 fireEvent.keyDown(node,{key:'ArrowLeft',code:'ArrowLeft',metaKey:true});expect(playbackMockState.lastScore!.slurs![0].engraving!.offsetX).toBe(-1);expect(playbackMockState.lastScore!.parts).toEqual(project.score.parts)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore!.slurs![0].engraving).toEqual({...project.score.slurs![0].engraving,offsetY:1})
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
})
it('does not move a selected span when its SVG target does not own focus',async()=>{
 const{project,node}=await setup();act(()=>screen.getByRole('button',{name:'악보로 이동'}).focus());fireEvent.keyDown(node,{key:'ArrowUp',code:'ArrowUp'});expect(playbackMockState.lastScore).toEqual(project.score)
})
