import { afterEach, expect, it, vi } from 'vitest'
import * as io from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { saveBinaryExport } from './binary-export-files'

const failure = vi.hoisted(() => ({ write: false, rename: false }))
vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  const diskError = () => Object.assign(new Error('owned partial-write ENOSPC'), { code: 'ENOSPC' })
  return {
    ...actual,
    writeFile: vi.fn(async (...args: Parameters<typeof actual.writeFile>) => {
      if (failure.write) {
        failure.write = false
        await actual.writeFile(args[0], Buffer.from(args[1] as Uint8Array).subarray(0, 3), args[2])
        throw diskError()
      }
      return actual.writeFile(...args)
    }),
    open: vi.fn(async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args), write = handle.writeFile.bind(handle)
      handle.writeFile = async (...values: Parameters<typeof handle.writeFile>) => {
        if (failure.write) {
          failure.write = false
          await write(Buffer.from(values[0] as Uint8Array).subarray(0, 3))
          throw diskError()
        }
        return write(...values)
      }
      return handle
    }),
    rename: vi.fn(async (...args: Parameters<typeof actual.rename>) => {
      if (failure.rename) { failure.rename = false; throw Object.assign(new Error('owned commit EACCES'), { code: 'EACCES' }) }
      return actual.rename(...args)
    })
  }
})
const dirs: string[] = []
afterEach(async () => {
  failure.write = false
  failure.rename = false
  for (const p of dirs.splice(0)) await io.rm(p, { recursive: true, force: true })
})
async function setup(ext: string, existing = true) {
  const folder = await io.mkdtemp(join(tmpdir(), 'studio-export-write-'))
  dirs.push(folder)
  const target = join(folder, 'chosen.' + ext), previous = Buffer.from('previous complete export'), next = Buffer.from('replacement complete export')
  if (existing) await io.writeFile(target, previous)
  await io.writeFile(join(folder, 'neighbor'), 'keep neighbor')
  return { folder, target, previous, next }
}
it.each(['pdf', 'mid'])('preserves existing %s and neighbors after a partial write, then retries', async ext => {
  const { folder, target, previous, next } = await setup(ext)
  failure.write = true
  await expect(saveBinaryExport(target, next)).rejects.toMatchObject({ code: 'ENOSPC' })
  expect(await io.readFile(target)).toEqual(previous)
  expect(await io.readFile(join(folder, 'neighbor'), 'utf8')).toBe('keep neighbor')
  expect((await io.readdir(folder)).sort()).toEqual(['chosen.' + ext, 'neighbor'])
  await saveBinaryExport(target, next)
  expect(await io.readFile(target)).toEqual(next)
})
it.each(['pdf', 'mid'])('does not publish a partial new %s after a failed write', async ext => {
  const { folder, target, next } = await setup(ext, false)
  failure.write = true
  await expect(saveBinaryExport(target, next)).rejects.toMatchObject({ code: 'ENOSPC' })
  expect(await io.readdir(folder)).toEqual(['neighbor'])
  await saveBinaryExport(target, next)
  expect(await io.readFile(target)).toEqual(next)
})
it.each(['pdf', 'mid'])('preserves existing %s when the final replacement fails', async ext => {
  const { folder, target, previous, next } = await setup(ext)
  failure.rename = true
  await expect(saveBinaryExport(target, next)).rejects.toMatchObject({ code: 'EACCES' })
  expect(await io.readFile(target)).toEqual(previous)
  expect((await io.readdir(folder)).sort()).toEqual(['chosen.' + ext, 'neighbor'])
})
it.skipIf(process.platform === 'win32')('keeps a selected symlink and updates its resolved output without changing adjacent files', async () => {
  const { folder, target, next } = await setup('pdf')
  const alias = join(folder, 'alias.pdf')
  await io.symlink(target, alias)
  await saveBinaryExport(alias, next)
  expect((await io.lstat(alias)).isSymbolicLink()).toBe(true)
  expect(await io.readFile(target)).toEqual(next)
  expect(await io.readFile(alias)).toEqual(next)
  expect(await io.readFile(join(folder, 'neighbor'), 'utf8')).toBe('keep neighbor')
})
it.skipIf(process.platform === 'win32')('preserves existing permission bits and the ordinary new-file umask', async () => {
  const { folder, target, next } = await setup('mid')
  await io.chmod(target, 0o640)
  await saveBinaryExport(target, next)
  expect((await io.stat(target)).mode & 0o777).toBe(0o640)
  const fresh = join(folder, 'fresh.mid')
  await saveBinaryExport(fresh, next)
  expect((await io.stat(fresh)).mode & 0o777).toBe(0o666 & ~process.umask())
})
it('snapshots bytes before asynchronous disk work', async () => {
  const { target } = await setup('mid')
  const bytes = new Uint8Array([1, 2, 3, 4]), pending = saveBinaryExport(target, bytes)
  bytes.fill(9)
  await pending
  expect(await io.readFile(target)).toEqual(Buffer.from([1, 2, 3, 4]))
})
it.skipIf(process.platform === 'win32')('follows a dangling relative symlink without replacing the link', async () => {
  const { folder, next } = await setup('pdf', false)
  const alias = join(folder, 'alias.pdf')
  await io.symlink('chosen.pdf', alias)
  await saveBinaryExport(alias, next)
  expect((await io.lstat(alias)).isSymbolicLink()).toBe(true)
  expect(await io.readFile(join(folder, 'chosen.pdf'))).toEqual(next)
})
it('keeps a directory destination intact on rejection', async () => {
  const { folder, next } = await setup('pdf', false)
  const target = join(folder, 'chosen.pdf')
  await io.mkdir(target)
  await io.writeFile(join(target, 'keep'), 'directory content')
  await expect(saveBinaryExport(target, next)).rejects.toMatchObject({ code: 'EISDIR' })
  expect(await io.readFile(join(target, 'keep'), 'utf8')).toBe('directory content')
  expect((await io.readdir(folder)).sort()).toEqual(['chosen.pdf', 'neighbor'])
})
it('supports long selected names without extending their filename component', async () => {
  const { folder, next } = await setup('pdf', false)
  const target = join(folder, 'a'.repeat(251) + '.pdf')
  await saveBinaryExport(target, next)
  expect(await io.readFile(target)).toEqual(next)
  expect(await io.readdir(folder)).toHaveLength(2)
})
it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)('does not bypass a read-only destination by replacing its directory entry', async () => {
  const { folder, target, previous, next } = await setup('pdf')
  await io.chmod(target, 0o444)
  await expect(saveBinaryExport(target, next)).rejects.toMatchObject({ code: 'EACCES' })
  expect(await io.readFile(target)).toEqual(previous)
  expect((await io.stat(target)).mode & 0o777).toBe(0o444)
  expect((await io.readdir(folder)).sort()).toEqual(['chosen.pdf', 'neighbor'])
})
