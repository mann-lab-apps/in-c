import { chmod, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, expect, it } from 'vitest'
import { savePngBatch, savePngFile } from './png-files'
import { withPngResolution } from '../image-export/png'
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
it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)('preserves a read-only selected PNG and retries after the owner makes it writable', async () => {
  const dir = await folder(), target = join(dir, 'chosen.png')
  const previous = withPngResolution(bytes, 150), replacement = withPngResolution(bytes, 300)
  await writeFile(target, previous)
  await writeFile(join(dir, 'neighbor'), 'keep neighbor')
  await chmod(target, 0o444)
  await expect(savePngFile(target, replacement)).rejects.toMatchObject({ code: 'EACCES' })
  expect(new Uint8Array(await readFile(target))).toEqual(previous)
  expect((await stat(target)).mode & 0o777).toBe(0o444)
  expect((await readdir(dir)).sort()).toEqual(['chosen.png', 'neighbor'])
  expect(await readFile(join(dir, 'neighbor'), 'utf8')).toBe('keep neighbor')

  await chmod(target, 0o600)
  await savePngFile(target, replacement)
  expect(new Uint8Array(await readFile(target))).toEqual(replacement)
  expect((await stat(target)).mode & 0o777).toBe(0o600)
  expect((await readdir(dir)).sort()).toEqual(['chosen.png', 'neighbor'])
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

it.each(['late-write', 'next-page-collision'] as const)(
  'preserves unrelated files inside an interrupted batch and retries safely after %s', async failure => {
    const dir = await folder(), pages = [{ pageNumber: 1, bytes }, { pageNumber: 3, bytes }]
    await writeFile(join(dir, 'parent-note.txt'), 'parent note')
    const previous = await savePngBatch(dir, 'score', pages)
    const interrupted = join(dir, 'score-png (2)')
    const foreignName = failure === 'late-write' ? 'external-note.txt' : 'score-p0003.png'
    const foreignContents = 'created by another writer; must survive'
    const diskError = new Error('owned later page write failure')
    let writes = 0
    const saving = savePngBatch(dir, 'score', pages, async (handle, data) => {
      await handle.writeFile(data)
      await handle.sync()
      if (++writes === 1) await writeFile(join(interrupted, foreignName), foreignContents, { flag: 'wx' })
      if (failure === 'late-write' && writes === 2) throw diskError
    })
    if (failure === 'late-write') await expect(saving).rejects.toBe(diskError)
    else await expect(saving).rejects.toMatchObject({ code: 'EEXIST', path: join(interrupted, foreignName) })

    expect(writes).toBe(failure === 'late-write' ? 2 : 1)
    expect(await readdir(interrupted)).toEqual([foreignName])
    expect(await readFile(join(interrupted, foreignName), 'utf8')).toBe(foreignContents)
    expect(await readFile(join(dir, 'parent-note.txt'), 'utf8')).toBe('parent note')
    for (const name of ['score-p0001.png', 'score-p0003.png']) {
      expect(new Uint8Array(await readFile(join(previous, name)))).toEqual(bytes)
    }

    const retry = await savePngBatch(dir, 'score', pages)
    expect(retry).toBe(join(dir, 'score-png (3)'))
    expect((await readdir(retry)).sort()).toEqual(['score-p0001.png', 'score-p0003.png'])
    for (const name of ['score-p0001.png', 'score-p0003.png']) {
      expect(new Uint8Array(await readFile(join(retry, name)))).toEqual(bytes)
      expect(new Uint8Array(await readFile(join(previous, name)))).toEqual(bytes)
    }
    expect(await readFile(join(interrupted, foreignName), 'utf8')).toBe(foreignContents)
    expect((await readdir(dir)).sort()).toEqual(['parent-note.txt', 'score-png', 'score-png (2)', 'score-png (3)'])
  }
)
