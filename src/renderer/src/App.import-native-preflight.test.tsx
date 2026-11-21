// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createPracticeLoopFixture} from '../../testing/practice-loop-fixture'
import {createCreditImageFixture} from '../../testing/credit-image-fixture'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../project/schema'
import {parseMusicXml} from '../../musicxml'
import {playbackMockState,registerAppTestHooks,openStudioWorkspace} from './App.test-harness'
registerAppTestHooks()
// Ordinal numbering is now approved; retain preflight rejection with unsupported time signatures.
const file=(kind:string,contents:string)=>({fileName:kind+'.musicxml',filePath:'/fixture/'+kind+'.musicxml',contents})
function source(kind:'beats-zero'|'beats-overflow'|'beats-text'|'valid'){
 const xml=createCreditImageFixture('control').replace('이미지 교환 감사 control','마디 번호 검사'),at=xml.indexOf('<part id="P2">'),part=xml.slice(at)
 let changed=kind==='beats-zero'?part.replace('<beats>4</beats>','<beats>0</beats>'):kind==='beats-overflow'?part.replace('<beats>4</beats>','<beats>129</beats>'):kind==='beats-text'?part.replace('<beats>4</beats>','<beats>2a</beats>'):part.replace('<measure number="1">','<measure number="10">').replace('<measure number="2">','<measure number="20">').replace('<measure number="3">','<measure number="30">')
 if(kind==='beats-overflow'){
  const divisions=Number(xml.match(/<divisions>(\d+)<\/divisions>/)?.[1]);if(!divisions)throw Error('Owned divisions')
  changed=changed.replaceAll('</measure>',Array.from({length:125},()=>`<note><rest/><duration>${divisions}</duration><type>quarter</type></note>`).join('')+'</measure>')
 }
 return xml.slice(0,at)+changed
}
async function setup(){
 window.history.replaceState({},'','/?fixture=release-test');const score=createPracticeLoopFixture();score.title='이전 편집 문서';const project=createNativeProject(score),first=score.parts[0].staves[0].measures[0].voices[0].events[0],path='/fixture/previous.chromatics'
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'previous.chromatics',filePath:path,contents:encodeNativeProject(project)})
 const{App}=await import('./App');render(<App/>);fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score));fireEvent.click(screen.getByRole('button',{name:first.id+' 선택'}));fireEvent.keyDown(window,{key:'ArrowUp',code:'ArrowUp'});const dirty=structuredClone(playbackMockState.lastScore!);expect(dirty).not.toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
 return{project,first,path,dirty}
}
async function importXml(kind:'beats-zero'|'beats-overflow'|'beats-text'|'valid'){
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce(file(kind,source(kind)));openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
}
it.each(['beats-zero','beats-overflow','beats-text']as const)('preserves the prior dirty document, selection, undo and native path when %s cannot form a native project',async kind=>{
 if(kind==='beats-overflow'){const parsed=parseMusicXml(source(kind));expect(()=>createNativeProject(parsed)).toThrow()}else expect(()=>parseMusicXml(source(kind))).toThrow()
 const{project,first,path,dirty}=await setup(),recentCount=vi.mocked(window.inC.recentMusicXml.add).mock.calls.length;await importXml(kind)
 await screen.findByText(/^MusicXML을 가져오지 못했습니다\. 현재 악보는 유지됩니다/)
 expect(playbackMockState.lastScore).toEqual(dirty);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',first.id);expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경');expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');expect(window.inC.recentMusicXml.add).toHaveBeenCalledTimes(recentCount)
 fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score);fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(dirty)
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());const request=vi.mocked(window.inC.project.save).mock.calls[0][0];expect(request.filePath).toBe(path);expect(decodeNativeProject(request.contents).score).toEqual(dirty)
 const dir=process.env.STUDIO_IMPORT_NATIVE_GUARD_QA_DIR
 if(dir&&kind==='beats-zero'){mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'previous.chromatics'),encodeNativeProject(project),{flag:'wx'});writeFileSync(join(dir,'dirty.chromatics'),encodeNativeProject({...project,score:dirty}),{flag:'wx'});for(const value of['beats-zero','beats-overflow','beats-text','valid']as const)writeFileSync(join(dir,value+'.musicxml'),source(value),{flag:'wx'});writeFileSync(join(dir,'valid-expected.chromatics'),encodeNativeProject(createNativeProject(parseMusicXml(source('valid')))),{flag:'wx'});writeFileSync(join(dir,'meta.json'),JSON.stringify({firstEventId:first.id,invalid:[{kind:'beats-zero',reason:'리듬 정합성이 올바르지 않습니다: invalid'},{kind:'beats-overflow',reason:'Too big'}],sourceKinds:['beats-zero','beats-overflow','beats-text','valid']},null,2),{flag:'wx'})}
})
it('permits a valid sparse positive numbering retry and saves the new document without the old native path',async()=>{
 await setup();await importXml('beats-text');await screen.findByText(/^MusicXML을 가져오지 못했습니다\./);await importXml('valid');const expected=parseMusicXml(source('valid'));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(expected));expect(expected.parts[1].staves[0].measures.map(b=>b.number)).toEqual([10,20,30]);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());const request=vi.mocked(window.inC.project.save).mock.calls[0][0];expect(request).not.toHaveProperty('filePath');expect(decodeNativeProject(request.contents).score).toEqual(expected)
})
it.each(['beats-zero','beats-overflow']as const)('keeps the welcome screen and recent list when a recent %s source cannot form a native project',async kind=>{
 window.history.replaceState({},'','/');const entry={fileName:kind+'.musicxml',filePath:'/fixture/'+kind+'.musicxml',openedAt:'2026-11-04T00:00:00Z'};vi.mocked(window.inC.recentMusicXml.list).mockResolvedValueOnce([entry]);vi.mocked(window.inC.recentMusicXml.open).mockResolvedValueOnce({...entry,contents:source(kind)})
 const{App}=await import('./App');render(<App/>);const initial=structuredClone(playbackMockState.lastScore);fireEvent.click(await screen.findByRole('button',{name:new RegExp(kind+'\\.musicxml')}));await screen.findByText(/^MusicXML을 가져오지 못했습니다\./);expect(document.querySelector('.studio-start')).toBeVisible();expect(document.querySelector('.studio-document')).not.toBeInTheDocument();expect(playbackMockState.lastScore).toEqual(initial);expect(window.inC.recentMusicXml.add).not.toHaveBeenCalled()
})
