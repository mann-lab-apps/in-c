// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {beforeEach,expect,it,vi} from 'vitest'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../project/schema'
import {createNewScore} from './editor/new-score'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {serializeMusicXml} from '../../musicxml'
import {serializeMidi} from './midi/serialize-midi'
import {openStudioWorkspace,playbackMockState,registerAppTestHooks} from './App.test-harness'
registerAppTestHooks()
beforeEach(()=>Object.defineProperty(Element.prototype,'scrollIntoView',{configurable:true,value:vi.fn()}))
function fixture(mode:'duration-first'|'pitch-first'){
 const p=createNativeProject(createNewScore({title:'입력 설정 보존',templateId:'solo-melody',measureCount:2,keySignature:{fifths:0,mode:'major'},timeSignature:{beats:4,beatType:4}}));p.settings.inputMode=mode;return p
}
function freezeFixture(project:ReturnType<typeof createNativeProject>){
 const dir=process.env.STUDIO_NATIVE_INPUT_QA_DIR;if(!dir)return
 mkdirSync(dir,{recursive:true});const id=project.settings.inputMode
 for(const [ext,contents] of [['chromatics',encodeNativeProject(project)],['musicxml',serializeMusicXml(project.score)],['mid',serializeMidi(project.score)]] as const)writeFileSync(join(dir,id+'.'+ext),contents,{flag:'wx'})
}
async function setup(route:'open'|'backup'|'autosave',mode:'duration-first'|'pitch-first'){
 const project=fixture(mode);window.history.replaceState({},'',route==='autosave'?'/':'/?fixture=release-test')
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/input.chromatics',fileName:'input.chromatics',contents:encodeNativeProject(project)})
 vi.mocked(window.inC.project.listBackups).mockResolvedValue([{id:'input-backup',fileName:'input.chromatics',title:project.score.title,updatedAt:''}]);vi.mocked(window.inC.project.readBackup).mockResolvedValueOnce({contents:encodeNativeProject(project)})
 if(route==='autosave')vi.mocked(window.inC.autosave.read).mockResolvedValueOnce({score:project.score,project,metadata:{title:project.score.title,updatedAt:'2026-11-04T00:00:00Z',version:'1'}})
 const {App}=await import('./App');render(<App/>)
 if(route==='autosave')fireEvent.click(await screen.findByRole('button',{name:'복구본 열기'}))
 else {openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:route==='open'?'프로젝트 열기':'프로젝트 백업'}));if(route==='backup'){const d=await screen.findByRole('dialog',{name:'프로젝트 백업'});fireEvent.click(await within(d).findByRole('button',{name:project.score.title+' 복구'}))}}
 await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score));return project
}
it.each(['open','backup','autosave'] as const)('explains unsupported pitch-first on %s and preserves the native setting and music',async route=>{
 const project=await setup(route,'pitch-first')
 expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).toHaveTextContent('음높이를 먼저 선택하는 입력 방식은 아직 지원하지 않습니다')
 expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
 const saved=decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents);expect(saved.settings).toEqual(project.settings);expect(saved.score).toEqual(project.score);if(route==='open')freezeFixture(project)
})
it.each(['open','backup','autosave'] as const)('keeps the supported default %s result free of a misleading warning',async route=>{
 const project=await setup(route,'duration-first');expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).not.toHaveTextContent('음높이를 먼저 선택하는 입력 방식은 아직 지원하지 않습니다');if(route==='open')freezeFixture(project)
})
it('retains the current real note-entry and exact undo while preserving the stored unsupported option',async()=>{
 const project=await setup('open','pitch-first')
 expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).toHaveTextContent('음높이를 먼저 선택하는 입력 방식은 아직 지원하지 않습니다')
 fireEvent.keyDown(window,{key:'n',code:'KeyN'});fireEvent.keyDown(window,{key:'c',code:'KeyC'})
 expect(playbackMockState.lastScore).not.toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
 expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).settings.inputMode).toBe('pitch-first')
})
it('retains both the opened-document setting notice and an owned recent-index failure',async()=>{
 vi.mocked(window.inC.recentMusicXml.add).mockRejectedValueOnce(new Error('Owned recent index failure'))
 await setup('open','pitch-first');await waitFor(()=>expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).toHaveTextContent('최근 목록을 갱신하지 못했습니다'))
 expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).toHaveTextContent('음높이를 먼저 선택하는 입력 방식은 아직 지원하지 않습니다')
})
