// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor, within } from '@testing-library/react'
import {expect,it,vi} from 'vitest'
const{resolveOwner}=vi.hoisted(()=>({resolveOwner:vi.fn()}))
vi.mock('./notation/note-pointer-owner',()=>({resolveNotePointerOwner:resolveOwner}))
import {createPracticeLoopFixture} from '../../testing/practice-loop-fixture'
import {createNativeProject,encodeNativeProject} from '../../project/schema'
import {playbackMockState,registerAppTestHooks} from './App.test-harness'

// Resolve the current public surface after workspace/document remounts; never cache old fields.
const hvPreview = () => within(screen.getByTestId('notation-preview'))
const hvPaletteFamily = () => within(screen.getByRole('region', { name: '장식음 팔레트' }))
import {readPaletteEventInk} from './notation/palette-event-ink'
registerAppTestHooks()
function transfer(){const a:Record<string,string>={};return{effectAllowed:'none',dropEffect:'none',get types(){return Object.keys(a)},setData:(t:string,v:string)=>{a[t]=v},getData:(t:string)=>a[t]??''}}
async function setup(kind:'ornament'|'articulation'|'dynamic'){
 window.history.replaceState({},'','/?fixture=release-test');const score=createPracticeLoopFixture(),bar=score.parts[0].staves[0].measures[1],other=score.parts[1].staves[0].measures[0],target=bar.voices[0].events[0],foreign=other.voices[0].events[0],first=score.parts[0].staves[0].measures[0].voices[0].events[0]
 score.dynamics=[{id:'ink-target',measureId:bar.id,value:'p'},{id:'ink-foreign',measureId:other.id,value:'p'}]
 const project=createNativeProject(score);vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'ink.chromatics',filePath:'/fixture/ink.chromatics',contents:encodeNativeProject(project)})
 const{App}=await import('./App');render(<App/>);fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score));fireEvent.click(hvPreview().getByRole('button',{name:first.id+' 선택'}));fireEvent.click(screen.getByRole('button',{name:'추가'}));fireEvent.click(screen.getByRole('menuitem',{name:'표기 팔레트 열기'}))
 const family={ornament:'장식음',articulation:'표현 기호',dynamic:'셈여림'}[kind],name={ornament:'트릴 적용 또는 해제',articulation:'스타카토 적용 또는 해제',dynamic:'f 셈여림 적용'}[kind];if(!screen.queryByRole('button',{name}))fireEvent.click(screen.getByRole('button',{name:family}));const tile=screen.getByRole('button',{name})
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');screen.getByTestId('notation-preview').append(svg)
 const node=(event:typeof target,measure:typeof bar,part:typeof score.parts[number])=>{const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.classList.add('notation-event','vf-stavenote');g.setAttribute('role','button');Object.assign(g.dataset,{eventId:event.id,measureId:measure.id,partId:part.id,staffId:part.staves[0].id,voiceId:measure.voices[0].id});g.innerHTML='<g class="vf-notehead"><text>head</text></g>';g.getBoundingClientRect=()=>({x:10,y:10,width:20,height:20,left:10,top:10,right:30,bottom:30,toJSON(){}});svg.append(g);return g}
 const actual=node(target,bar,score.parts[0]),cover=node(foreign,other,score.parts[1]),address={partId:score.parts[0].id,staffId:score.parts[0].staves[0].id,measureId:bar.id,voiceId:bar.voices[0].id};return{project,tile,actual,cover,target,foreign,address}
}
function drop(node:Element,t:ReturnType<typeof transfer>){const e=new Event('drop',{bubbles:true,cancelable:true});Object.defineProperties(e,{clientX:{value:12},clientY:{value:14},dataTransfer:{value:t}});fireEvent(node,e)}
it.each(['ornament','articulation','dynamic']as const)('uses actual unique ink ownership for %s through another staff rectangle',async kind=>{
 const{project,tile,actual,cover,target,address}=await setup(kind),t=transfer();resolveOwner.mockReturnValue({element:actual,eventId:target.id,address,inkElement:actual.querySelector('text')});fireEvent.dragStart(tile,{dataTransfer:t});drop(cover,t)
 const expected=structuredClone(project.score),n=expected.parts[0].staves[0].measures[1].voices[0].events[0];if(n.type!=='note')throw Error('Note');if(kind==='ornament')n.ornaments=['trill'];else if(kind==='articulation')n.articulations=['staccato'];else {const changed={...expected.dynamics![0],value:'f' as const};expected.dynamics=[expected.dynamics![1],changed]}
 expect(playbackMockState.lastScore).toEqual(expected);expect(resolveOwner).toHaveBeenCalledWith(cover,12,14);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
})
it.each(['ornament','articulation']as const)('rejects attached grace ink even through a foreign rectangle: %s',async kind=>{
 const{project,tile,actual,cover,target,address}=await setup(kind),inner=document.createElementNS('http://www.w3.org/2000/svg','g');inner.classList.add('vf-stavenote');inner.innerHTML='<g class="vf-notehead"><text>grace</text></g>';actual.append(inner);resolveOwner.mockReturnValue({element:actual,eventId:target.id,address,inkElement:inner.querySelector('text')});const t=transfer();fireEvent.dragStart(tile,{dataTransfer:t});drop(cover,t);expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('keeps existing DOM ownership when ink is ambiguous',async()=>{
 const{project,tile,cover}=await setup('ornament'),t=transfer();resolveOwner.mockReturnValue(undefined);fireEvent.dragStart(tile,{dataTransfer:t});drop(cover,t);const expected=structuredClone(project.score),n=expected.parts[1].staves[0].measures[0].voices[0].events[0];if(n.type!=='note')throw Error('Note');n.ornaments=['trill'];expect(playbackMockState.lastScore).toEqual(expected)
})

it.each([true,false])('uses measured ink for the frame and keeps guidance without unavailable bounds: measured=%s',async measured=>{
 const{project,tile,actual,cover,target,address}=await setup('ornament'),t=transfer()
 resolveOwner.mockReturnValue({element:actual,eventId:target.id,address,inkElement:actual.querySelector('text')})
 actual.getBoundingClientRect=()=>new DOMRect(0,0,900,700)
 vi.mocked(readPaletteEventInk).mockReturnValue(measured?new DOMRect(101,202,12,46):undefined)
 fireEvent.dragStart(tile,{dataTransfer:t})
 const over=new Event('dragover',{bubbles:true,cancelable:true});Object.defineProperties(over,{clientX:{value:12},clientY:{value:14},dataTransfer:{value:t}});fireEvent(cover,over)
 expect(readPaletteEventInk).toHaveBeenCalledWith(actual)
 expect(hvPaletteFamily().getByLabelText('장식음 끌기 안내')).toHaveTextContent('2마디')
 const frame=document.querySelector('.studio-palette-drop-highlight')
 if(measured)expect(frame).toHaveStyle({left:'101px',top:'202px',width:'12px',height:'46px'});else expect(frame).not.toBeInTheDocument()
 expect(playbackMockState.lastScore).toEqual(project.score)
 drop(cover,t);const expected=structuredClone(project.score),note=expected.parts[0].staves[0].measures[1].voices[0].events[0];if(note.type!=='note')throw Error('Note');note.ornaments=['trill']
 expect(playbackMockState.lastScore).toEqual(expected)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
})
