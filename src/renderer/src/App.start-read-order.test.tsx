// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { serializeMusicXml } from '../../musicxml'
import { encodeNativeProject } from '../../project/schema'
import { createPartSpanResetFixture } from '../../testing/part-span-reset-fixture'
import { registerAppTestHooks, playbackMockState, openStudioWorkspace } from './App.test-harness'

registerAppTestHooks()
const pairs = [
  ['recent-xml','recent-xml'], ['recent-native','recent-xml'],
  ['xml-picker','recent-native'], ['recent-xml','native-picker'],
  ['native-picker','xml-picker'], ['recent-native','recent-native']
] as const
type File = {filePath:string; fileName:string; contents:string}
const cases = pairs.flatMap(([older,newer]) => (['older-success-first','older-failure-first','newer-success-first','newer-failure-first','newer-success-older-failure'] as const).map(order => ({older,newer,order})))

it.each(cases)('studio.start-read-order $older -> $newer keeps newest ownership through $order', async ({older,newer,order}) => {
  window.history.replaceState({}, '', '/')
  const project = createPartSpanResetFixture()
  const records = [older,newer].map((kind,index) => {
    const native = kind.includes('native'), name = index ? 'newer' : 'older'
    const entry = {filePath:`/fixture/${name}.${native?'chromatics':'musicxml'}`,fileName:`${name}.${native?'chromatics':'musicxml'}`,openedAt:'2026-10-31T00:00:00Z',...(native?{format:'native' as const}:{})}
    const score = {...project.score,title:name+' document'}
    return {kind,entry,file:{...entry,contents:native?encodeNativeProject({...project,score}):serializeMusicXml(score)}}
  })
  vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue(records.filter(r=>r.kind.startsWith('recent')).map(r=>r.entry))
  const pending = new Map<number,{resolve:(file:File|null)=>void;reject:(error:Error)=>void}>()
  const request = (index:number) => new Promise<File|null>((resolve,reject)=>pending.set(index,{resolve,reject}))
  vi.mocked(window.inC.project.open).mockImplementation(()=>request(records.findIndex(r=>r.kind==='native-picker')))
  vi.mocked(window.inC.musicXml.open).mockImplementation(()=>request(records.findIndex(r=>r.kind==='xml-picker')))
  vi.mocked(window.inC.recentMusicXml.open).mockImplementation(({filePath})=>request(records.findIndex(r=>r.entry.filePath===filePath)) as Promise<File>)
  const {App} = await import('./App');render(<App />)
  const initial = structuredClone(playbackMockState.lastScore)
  const click = async (index:number) => {
    const record = records[index]
    fireEvent.click(await screen.findByRole('button',{name:record.kind.startsWith('recent')?new RegExp(record.entry.fileName):record.kind==='native-picker'?'프로젝트 열기':'MusicXML 가져오기'}))
    expect(pending.has(index)).toBe(true)
  }
  await click(0);await click(1)
  const finish = async (index:number, failure=false) => act(async () => {
    if(failure)pending.get(index)!.reject(Error(index?'Newest read failure':'Older read failure'))
    else pending.get(index)!.resolve(records[index].file)
  })
  const olderFirst = order.startsWith('older')
  await finish(olderFirst?0:1,order==='older-failure-first'||order==='newer-failure-first')
  if(olderFirst) {
    expect(playbackMockState.lastScore).toEqual(initial)
    expect(document.querySelector('.studio-document')).not.toBeInTheDocument()
    expect(screen.queryByText(/Older read failure/)).not.toBeInTheDocument()
    if(newer.endsWith('picker'))expect(screen.getByRole('button',{name:newer==='native-picker'?'프로젝트 열기':'MusicXML 가져오기'})).toBeDisabled()
  }
  await finish(olderFirst?1:0,order==='newer-success-older-failure')
  if(order==='newer-failure-first') {
    expect(playbackMockState.lastScore).toEqual(initial)
    expect(screen.getByText('Newest read failure')).not.toBeVisible()
    expect(document.querySelector('.studio-document')).not.toBeInTheDocument()
  } else {
    await waitFor(()=>expect(playbackMockState.lastScore?.title).toBe('newer document'))
    expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
    expect(screen.queryByText(/Older read failure/)).not.toBeInTheDocument()
    expect(window.inC.recentMusicXml.add).toHaveBeenCalledTimes(1)
    expect(vi.mocked(window.inC.recentMusicXml.add).mock.calls[0][0].filePath).toBe(records[1].entry.filePath)
  }
})

it('studio.start-read-order a declined discard confirmation does not supersede the authorized read', async () => {
  window.history.replaceState({},'','/')
  const source=createPartSpanResetFixture()
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/source.chromatics',fileName:'source.chromatics',contents:encodeNativeProject(source)})
  const {App}=await import('./App');render(<App />)
  fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
  await waitFor(()=>expect(playbackMockState.lastScore).toEqual(source.score))
  fireEvent.click(screen.getByRole('button',{name:'파트보 제목 수정'}))
  const field=screen.getByRole('textbox',{name:'파트보 제목 입력'})
  fireEvent.change(field,{target:{value:'Dirty before the authorized read'}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
  let finish!: (file:File) => void
  vi.mocked(window.inC.musicXml.open).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
  expect(finish).toBeTypeOf('function')
  vi.mocked(window.confirm).mockReturnValue(false)
  fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
  expect(window.inC.project.open).toHaveBeenCalledOnce()
  await act(async()=>finish({filePath:'/fixture/authorized.musicxml',fileName:'authorized.musicxml',contents:serializeMusicXml({...source.score,title:'Already authorized XML'})}))
  expect(playbackMockState.lastScore?.title).toBe('Already authorized XML')
})

it.each(['native','xml'] as const)('studio.start-read-order newest %s picker cancel never revives an older recent read', async format => {
  window.history.replaceState({}, '', '/')
  const project = createPartSpanResetFixture()
  const entry = {filePath:'/fixture/older.musicxml',fileName:'older.musicxml',openedAt:'2026-10-31T00:00:00Z'}
  vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([entry])
  let finishOlder!: (file:File) => void, finishNewer!: (file:null) => void
  vi.mocked(window.inC.recentMusicXml.open).mockImplementationOnce(()=>new Promise(resolve=>{finishOlder=resolve}))
  if(format==='native')vi.mocked(window.inC.project.open).mockImplementationOnce(()=>new Promise(resolve=>{finishNewer=resolve}))
  else vi.mocked(window.inC.musicXml.open).mockImplementationOnce(()=>new Promise(resolve=>{finishNewer=resolve}))
  const {App}=await import('./App');render(<App />)
  const initial=structuredClone(playbackMockState.lastScore)
  fireEvent.click(await screen.findByRole('button',{name:/older.musicxml/}))
  fireEvent.click(screen.getByRole('button',{name:format==='native'?'프로젝트 열기':'MusicXML 가져오기'}))
  await act(async()=>finishNewer(null))
  await act(async()=>finishOlder({...entry,contents:serializeMusicXml({...project.score,title:'Canceled older read'})}))
  expect(playbackMockState.lastScore).toEqual(initial)
  expect(document.querySelector('.studio-document')).not.toBeInTheDocument()
  expect(window.inC.recentMusicXml.add).not.toHaveBeenCalled()
})
