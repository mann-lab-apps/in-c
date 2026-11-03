import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, expect, it } from 'vitest'
import { savePngBatch, savePngFile } from './png-files'
const dirs: string[] = []
const bytes = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64'))
afterEach(async () => { for (const p of dirs.splice(0)) await rm(p,{recursive:true,force:true}) })
async function folder() { const p=await mkdtemp(join(tmpdir(),'studio-png-'));dirs.push(p);return p }
it('replaces only the explicitly selected PNG file and keeps adjacent files', async () => {
  const dir=await folder(), target=join(dir,'chosen.png');await writeFile(target,'old');await writeFile(join(dir,'other'),'keep')
  await savePngFile(target,bytes)
  expect(new Uint8Array(await readFile(target))).toEqual(bytes)
  expect(await readFile(join(dir,'other'),'utf8')).toBe('keep')
  expect((await readdir(dir)).sort()).toEqual(['chosen.png','other'])
})
it('puts every page in a fresh folder without overwriting an earlier export', async () => {
  const dir=await folder(), pages=[{pageNumber:1,bytes},{pageNumber:3,bytes}]
  const first=await savePngBatch(dir,'score',pages), second=await savePngBatch(dir,'score',pages)
  expect(first).not.toBe(second)
  expect((await readdir(first)).sort()).toEqual(['score-p0001.png','score-p0003.png'])
  expect(await readFile(join(first,'score-p0001.png'))).toEqual(await readFile(join(second,'score-p0001.png')))
})
it('removes only its own partial export when a page write fails', async () => {
  const dir=await folder();await writeFile(join(dir,'other'),'keep');let count=0
  await expect(savePngBatch(dir,'score',[{pageNumber:1,bytes},{pageNumber:2,bytes}],async(handle,data)=>{
    await handle.writeFile(data);if(++count===2)throw new Error('owned disk failure')
  })).rejects.toThrow('owned disk failure')
  expect(await readdir(dir)).toEqual(['other'])
})
