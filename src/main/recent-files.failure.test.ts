import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { afterEach, expect, it, vi } from 'vitest'
import { RecentFileStore } from './recent-files'

const fault = vi.hoisted(() => ({
  stage: undefined as 'write' | 'rename' | undefined,
  fired: false, root: '', index: '',
  observed: [] as {stage:string; path:string; bytes:string; original:string}[]
}))
vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    writeFile: async (...args: Parameters<typeof actual.writeFile>) => {
      const path = String(args[0])
      if (fault.stage === 'write' && !fault.fired && path.startsWith(fault.root)) {
        fault.fired = true
        await actual.writeFile(args[0], 'partial fixture write', args[2])
        fault.observed.push({stage:'write', path, bytes:await actual.readFile(args[0], 'utf8'), original:await actual.readFile(fault.index, 'utf8')})
        throw Object.assign(new Error('Injected owned ENOSPC'), {code:'ENOSPC'})
      }
      return actual.writeFile(...args)
    },
    rename: async (...args: Parameters<typeof actual.rename>) => {
      const path = String(args[0])
      if (fault.stage === 'rename' && !fault.fired && path.startsWith(fault.root)) {
        fault.fired = true
        fault.observed.push({stage:'rename', path, bytes:await actual.readFile(args[0], 'utf8'), original:await actual.readFile(fault.index, 'utf8')})
        throw Object.assign(new Error('Injected owned EACCES'), {code:'EACCES'})
      }
      return actual.rename(...args)
    }
  }
})
const fs = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
afterEach(() => { fault.stage=undefined;fault.fired=false;fault.root='';fault.index='';fault.observed=[] })
const legacy = {filePath:'/fixture/old.musicxml',fileName:'old.musicxml',openedAt:'2026-11-07'}
const native = {filePath:'/fixture/native.chromatics',fileName:'native.chromatics',openedAt:'2026-11-07',format:'native' as const}
const hash = (text:string) => createHash('sha256').update(text).digest('hex')
async function artifact(name:string, data:unknown) {
  const directory = process.env.DDIRORI_RECENT_STORE_QA_DIR
  if (!directory) return
  await fs.mkdir(directory,{recursive:true})
  await fs.writeFile(join(directory,name+'.json'),JSON.stringify(data,null,2)+'\n',{flag:'wx'})
}
it.each((['write','rename'] as const).flatMap(stage=>(['add','remove'] as const).map(operation=>({stage,operation}))))('preserves the real index and queued requests after injected $stage failure in $operation',async({stage,operation})=>{
  const directory=await fs.mkdtemp(join(tmpdir(),'studio-recent-failure-')),path=join(directory,'recent.json'),original=JSON.stringify([native,legacy])
  let passed=false
  try {
    await fs.writeFile(path,original)
    fault.stage=stage;fault.root=directory+sep;fault.index=path
    const store=new RecentFileStore(()=>path)
    const attempted={filePath:'/fixture/not-committed.musicxml',fileName:'not-committed.musicxml'}
    const failed=operation==='add'?store.add(attempted):store.remove(native.filePath)
    const readAfter=store.list(),addAfter=store.add({filePath:'/fixture/after.chromatics',fileName:'after.chromatics',format:'native'})
    const [failure,reading,addition]=await Promise.allSettled([failed,readAfter,addAfter])
    expect(failure.status).toBe('rejected')
    if(failure.status!=='rejected')throw Error('Fault must reject its public operation')
    expect(failure.reason).toMatchObject({code:stage==='write'?'ENOSPC':'EACCES'})
    expect(fault.fired).toBe(true);expect(fault.observed).toHaveLength(1)
    expect(fault.observed[0].original).toBe(original)
    if(stage==='write')expect(fault.observed[0].bytes).toBe('partial fixture write')
    else expect(JSON.parse(fault.observed[0].bytes).some((row:{filePath:string})=>row.filePath===native.filePath)).toBe(operation==='add')
    expect(reading).toEqual({status:'fulfilled',value:[native,legacy]})
    if(reading.status!=='fulfilled')throw Error('Queued read must recover after the rejected write')
    expect(addition.status).toBe('fulfilled')
    if(addition.status!=='fulfilled')throw Error('Queue must recover without a new store')
    expect(addition.value).toEqual([expect.objectContaining({filePath:'/fixture/after.chromatics',format:'native'}),native,legacy])
    expect(await new RecentFileStore(()=>path).list()).toEqual(addition.value)
    expect(await fs.readdir(directory)).toEqual(['recent.json'])
    const removed=await store.remove('/fixture/after.chromatics');expect(removed).toEqual([native,legacy])
    passed=true
    await artifact(stage+'-'+operation,{passed,scope:'Injected IO error with real owned temporary filesystem; not natural OS failure',errorCode:failure.reason.code,originalSha256:hash(original),faultObservation:fault.observed,readAfter:reading.value,finalRows:removed,indexSha256:hash(await fs.readFile(path,'utf8')),directoryEntries:await fs.readdir(directory)})
  } finally { await fs.rm(directory,{recursive:true,force:true}) }
})
it.each(['malformed','oversized'] as const)('preserves an actual %s index and recovers after its owned fixture is repaired',async kind=>{
  const directory=await fs.mkdtemp(join(tmpdir(),'studio-recent-repair-')),path=join(directory,'recent.json'),original=JSON.stringify([native,legacy])
  try {
    const broken=kind==='malformed'?'{broken index':JSON.stringify([legacy])+ ' '.repeat(128*1024)
    await fs.writeFile(path,broken)
    const store=new RecentFileStore(()=>path)
    await expect(store.add({filePath:'/fixture/rejected.musicxml',fileName:'rejected.musicxml'})).rejects.toThrow(kind==='oversized'?'size limit':undefined)
    expect(await fs.readFile(path,'utf8')).toBe(broken)
    expect(await fs.readdir(directory)).toEqual(['recent.json'])
    // Repair only this test-owned fixture; never change the user's recent index.
    await fs.writeFile(path,original)
    const [listed,added]=await Promise.all([store.list(),store.add({filePath:'/fixture/repaired.musicxml',fileName:'repaired.musicxml'})])
    expect(listed).toEqual([native,legacy])
    expect(added).toEqual([expect.objectContaining({filePath:'/fixture/repaired.musicxml'}),native,legacy])
    expect(await new RecentFileStore(()=>path).list()).toEqual(added)
    expect(await fs.readdir(directory)).toEqual(['recent.json'])
    await artifact(kind,{passed:true,scope:'Real malformed/oversized owned file, then explicit fixture repair',brokenSha256:hash(broken),originalSha256:hash(original),indexSha256:hash(await fs.readFile(path,'utf8')),listed,finalRows:added,directoryEntries:await fs.readdir(directory)})
  } finally { await fs.rm(directory,{recursive:true,force:true}) }
})
