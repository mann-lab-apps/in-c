import { afterEach, expect, it, vi } from 'vitest'
import * as io from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { savePngExport } from './png-export'
import { withPngResolution } from '../image-export/png'

const fault = vi.hoisted(() => ({ folder: '', kind: '' as '' | 'collision' | 'write' | 'chmod' | 'sync' | 'rename',
  injected: false, temporary: '', closed: 0, partial: Buffer.alloc(0) }))
vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    open: vi.fn(async (...args: Parameters<typeof actual.open>) => {
      const owned = fault.folder && dirname(String(args[0])) === fault.folder && basename(String(args[0])).startsWith('.studio-png-')
      if (owned && fault.kind === 'collision' && !fault.injected) {
        fault.injected = true; fault.temporary = String(args[0])
        await actual.writeFile(args[0], 'another complete file; not made by PNG export', { flag: 'wx', mode: 0o600 })
      }
      const handle = await actual.open(...args)
      if (owned) {
        const write = handle.writeFile.bind(handle), sync = handle.sync.bind(handle), close = handle.close.bind(handle)
        const chmod = handle.chmod.bind(handle)
        handle.writeFile = async (...values: Parameters<typeof handle.writeFile>) => {
          if (fault.kind === 'write' && !fault.injected) {
            fault.injected = true; fault.partial = Buffer.from(values[0] as Uint8Array).subarray(0, 13)
            await write(fault.partial)
            throw Object.assign(new Error('owned PNG partial write'), { code: 'ENOSPC' })
          }
          return write(...values)
        }
        handle.chmod = async mode => {
          if (fault.kind === 'chmod' && !fault.injected) {
            fault.injected = true
            fault.partial = await actual.readFile(String(args[0]))
            throw Object.assign(new Error('owned PNG mode restore failure'), { code: 'EPERM' })
          }
          return chmod(mode)
        }
        handle.sync = async () => {
          if (fault.kind === 'sync' && !fault.injected) {
            fault.injected = true; throw Object.assign(new Error('owned PNG sync failure'), { code: 'ENOSPC' })
          }
          return sync()
        }
        handle.close = async () => { await close(); fault.closed++ }
      }
      return handle
    }),
    rename: vi.fn(async (...args: Parameters<typeof actual.rename>) => {
      if (fault.folder && dirname(String(args[0])) === fault.folder && fault.kind === 'rename' && !fault.injected) {
        fault.injected = true; throw Object.assign(new Error('owned PNG rename failure'), { code: 'EACCES' })
      }
      return actual.rename(...args)
    })
  }
})

const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64'))
let folder = ''
afterEach(async () => {
  Object.assign(fault, { folder: '', kind: '', injected: false, temporary: '', closed: 0, partial: Buffer.alloc(0) })
  if (folder) await io.rm(folder, { recursive: true, force: true })
  folder = ''
})
async function setup(existing = true) {
  folder = await io.realpath(await io.mkdtemp(join(tmpdir(), 'studio-png-integrity-')))
  const target = join(folder, 'selected.png'), neighbor = join(folder, 'neighbor'), previous = withPngResolution(png, 150), next = withPngResolution(png, 300)
  if (existing) { await io.writeFile(target, previous); await io.chmod(target, 0o640) }
  await io.writeFile(neighbor, 'keep neighbor')
  const dialogs = { chooseFile: vi.fn(async () => target), chooseFolder: vi.fn() }
  fault.folder = folder
  const save = () => savePngExport({ suggestedName: 'score', pages: [{ pageNumber: 2, bytes: next }] }, dialogs)
  const preserve = async () => {
    if (existing) {
      expect(new Uint8Array(await io.readFile(target))).toEqual(previous)
      if (process.platform !== 'win32') expect((await io.stat(target)).mode & 0o777).toBe(0o640)
    } else await expect(io.stat(target)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await io.readFile(neighbor, 'utf8')).toBe('keep neighbor')
  }
  const retry = async () => {
    fault.kind = ''
    expect(await save()).toEqual({ filePath: target, fileName: 'selected.png', pageCount: 1, kind: 'file' })
    expect(new Uint8Array(await io.readFile(target))).toEqual(next)
    expect(dialogs.chooseFile).toHaveBeenNthCalledWith(1, 'score-p0002.png')
    expect(dialogs.chooseFile).toHaveBeenCalledTimes(2)
    expect(dialogs.chooseFolder).not.toHaveBeenCalled()
    expect(await io.readFile(neighbor, 'utf8')).toBe('keep neighbor')
  }
  return { target, dialogs, next, save, preserve, retry }
}

it.each([true, false])('keeps an unowned single-page PNG temp on collision and retries safely (existing=%s)', async existing => {
  const env = await setup(existing); fault.kind = 'collision'
  await expect(env.save()).rejects.toMatchObject({ code: 'EEXIST' })
  expect(fault.injected).toBe(true); expect(fault.closed).toBe(0)
  await env.preserve()
  expect(await io.readFile(fault.temporary, 'utf8')).toBe('another complete file; not made by PNG export')
  await env.retry()
  expect(await io.readFile(fault.temporary, 'utf8')).toBe('another complete file; not made by PNG export')
  expect((await io.readdir(folder)).filter(name => name.endsWith('.tmp'))).toEqual([fault.temporary.slice(folder.length + 1)])
})

it.each(['write', 'sync', 'rename'] as const)('cleans only its owned PNG temp after %s failure and retries', async kind => {
  const env = await setup(); fault.kind = kind
  await expect(env.save()).rejects.toMatchObject({ code: kind === 'rename' ? 'EACCES' : 'ENOSPC' })
  expect(fault.injected).toBe(true); expect(fault.closed).toBe(1)
  if (kind === 'write') expect(fault.partial).toEqual(Buffer.from(env.next).subarray(0, 13))
  await env.preserve()
  expect((await io.readdir(folder)).sort()).toEqual(['neighbor', 'selected.png'])
  await env.retry()
  expect(fault.closed).toBe(2)
  expect((await io.readdir(folder)).sort()).toEqual(['neighbor', 'selected.png'])
})

it.skipIf(process.platform === 'win32')('cleans the complete temp and keeps the old PNG when restoring its mode fails', async () => {
  const env = await setup()
  fault.kind = 'chmod'
  await expect(env.save()).rejects.toMatchObject({ code: 'EPERM' })
  expect(fault.injected).toBe(true)
  expect(fault.closed).toBe(1)
  expect(fault.partial).toEqual(Buffer.from(env.next))
  await env.preserve()
  expect((await io.readdir(folder)).sort()).toEqual(['neighbor', 'selected.png'])

  await env.retry()
  expect((await io.stat(env.target)).mode & 0o777).toBe(0o640)
  expect((await io.readdir(folder)).sort()).toEqual(['neighbor', 'selected.png'])
})
