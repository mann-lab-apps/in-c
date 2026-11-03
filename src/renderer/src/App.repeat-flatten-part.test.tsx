// @vitest-environment jsdom
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {expandScoreRepeatsForMusicXml} from '../../musicxml/expand-repeats'
import {registerAppTestHooks,openStudioWorkspace,chooseScoreView,playbackMockState} from './App.test-harness'
import {secondaryRepeatFixture} from '../../testing/secondary-repeat-fixture'
import {createNativeProject,encodeNativeProject} from '../../project/schema'
import {parseMusicXml,serializeMusicXml} from '../../musicxml'
import {serializeMidi} from './midi/serialize-midi'
registerAppTestHooks()
const label='반복 펼치기 MusicXML 내보내기'
async function setup(index:number){
 window.history.replaceState({},'','/?fixture=release-test')
 const {score}=secondaryRepeatFixture('other','volta'),project=createNativeProject(score)
 project.partLayouts=score.parts.map((p,i)=>({partId:p.id,title:`Practice ${i+1}`,layout:{pageSetup:{pageSize:'a4',orientation:'portrait',pageMarginMm:i?17:11,staffSizePercent:100,systemSpacingPercent:100}}}))
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/owned/parts.chromatics',fileName:'parts.chromatics',contents:encodeNativeProject(project)})
 const {App}=await import('./App');render(<App />);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(score))
 chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',score.parts[index].id);openStudioWorkspace('내보내기');return{score,project,part:score.parts[index]}
}
it.each([0,1])('studio.repeat-flatten-part projects the global repeat to selected part %s with independent title and paper',async index=>{
 const {score,part,project}=await setup(index);vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValue({filePath:'/owned/part.musicxml',fileName:'part.musicxml'})
 fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}));await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce());const ordinary=vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents
 const button=screen.getByRole('button',{name:label});await waitFor(()=>expect(button).toBeEnabled());fireEvent.click(button);await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(2));const request=vi.mocked(window.inC.musicXml.exportCopy).mock.calls[1][0],copy=parseMusicXml(request.contents)
 expect(copy.parts).toHaveLength(1);expect(copy.parts[0].id).toBe(part.id);expect(copy.title).toBe(`Practice ${index+1}`);expect(copy.parts[0].staves).toHaveLength(part.staves.length);expect(copy.parts[0].staves.every(s=>s.measures.length===5)).toBe(true)
 expect(copy.parts[0].staves[0].measures.map(m=>m.voices[0].events[0].type==='note'?m.voices[0].events[0].pitch.step:'rest')).toEqual(['C','D','C','E','F'])
 expect(copy.layout?.pageSetup?.pageMarginMm).toBe(index?17:11);expect(serializeMidi(copy)).toEqual(serializeMidi(parseMusicXml(ordinary)));expect(playbackMockState.lastScore).toEqual(score);expect(request.suggestedName).toContain(`-${part.name.toLowerCase()}-반복펼치기.musicxml`)
 const qa=process.env.DDIRORI_REPEAT_FLATTEN_PART_OUT
 if(qa){
  const literal=structuredClone(score);literal.parts=[structuredClone(part)];literal.title=`Practice ${index+1}`;literal.layout=structuredClone(project.partLayouts[index].layout)
  for(const staff of literal.parts[0].staves){for(const m of staff.measures){delete m.repeat;delete m.volta}staff.measures[0].repeat={start:true};staff.measures[1].repeat={end:true,times:2};staff.measures[1].volta={number:1,start:true,end:true};staff.measures[2].volta={number:2,start:true}}
  const dir=join(qa,`part-${index+1}`);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject({...project,view:{mode:'part',partId:part.id}}));writeFileSync(join(dir,'source.musicxml'),serializeMusicXml(literal));writeFileSync(join(dir,'expanded.musicxml'),serializeMusicXml(expandScoreRepeatsForMusicXml(literal)));writeFileSync(join(dir,'expected.mid'),serializeMidi(literal));writeFileSync(join(dir,'oracle.json'),JSON.stringify({scope:'Literal independent selected-part reference; source.chromatics retains both parts. XML files describe expected selected view, not the whole native score.',partId:part.id,staves:part.staves.length,title:literal.title,margin:index?17:11,pitches:index?[[72],[74],[72],[76],[77]]:[[60,48],[62,50],[60,48],[64,52],[65,53]],onsets:[0,1920,3840,5760,7680],duration:1920}))
 }
})
it('studio.repeat-flatten-part retains its captured target without moving focus back from a newer part selection',async()=>{
 const {score,part}=await setup(0);let finish!:(v:{filePath:string;fileName:string})=>void
 vi.mocked(window.inC.musicXml.exportCopy).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
 const button=screen.getByRole('button',{name:label});fireEvent.click(button);await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce());const snapshot=vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0]
 chooseScoreView('파트보 선택',score.parts[1].id);const target=screen.getByRole('combobox',{name:'파트보 선택'});target.focus()
 await act(async()=>finish({filePath:'/owned/first-part.musicxml',fileName:'first-part.musicxml'}))
 expect(parseMusicXml(snapshot.contents).parts.map(p=>p.id)).toEqual([part.id]);expect(target).toHaveTextContent(score.parts[1].name);expect(target).toHaveFocus();expect(playbackMockState.lastScore).toEqual(score);expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).toHaveTextContent('first-part.musicxml')
})
