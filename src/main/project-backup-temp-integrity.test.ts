import { afterEach, expect, it, vi } from 'vitest'
import * as io from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { NativeProjectFileSession, readNativeProjectFile } from './project-files'
import { NativeProjectBackupStore } from './project-backups'
import { createScore } from '../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'

const collision = vi.hoisted(() => ({ directory: '', armed: false, path: '', bytes: 'another complete file; not created by the app',
  failure: '' as '' | 'write' | 'sync' | 'rename', injected: false }))
vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return { ...actual, open: vi.fn(async (...args: Parameters<typeof actual.open>) => {
    if (collision.armed && dirname(String(args[0])) === collision.directory && String(args[0]).endsWith('.tmp')) {
      collision.armed = false; collision.path = String(args[0])
      await actual.writeFile(collision.path, collision.bytes, { flag: 'wx', mode: 0o600 })
    }
    const handle = await actual.open(...args)
    if (dirname(String(args[0])) === collision.directory && String(args[0]).endsWith('.tmp')) {
      const write = handle.writeFile.bind(handle), sync = handle.sync.bind(handle)
      handle.writeFile = async (...values: Parameters<typeof handle.writeFile>) => {
        if (collision.failure === 'write' && !collision.injected) {
          collision.injected = true
          await write(String(values[0]).slice(0, 32), 'utf8')
          throw Object.assign(new Error('owned backup partial write'), { code: 'ENOSPC' })
        }
        return write(...values)
      }
      handle.sync = async () => {
        if (collision.failure === 'sync' && !collision.injected) {
          collision.injected = true
          throw Object.assign(new Error('owned backup sync failure'), { code: 'ENOSPC' })
        }
        return sync()
      }
    }
    return handle
  }), rename: vi.fn(async (...args: Parameters<typeof actual.rename>) => {
    if (collision.failure === 'rename' && !collision.injected && dirname(String(args[0])) === collision.directory) {
      collision.injected = true
      throw Object.assign(new Error('owned backup rename failure'), { code: 'EACCES' })
    }
    return actual.rename(...args)
  }) }
})
let directory = ''
afterEach(async () => {
  collision.directory = ''; collision.armed = false; collision.path = ''
  collision.failure = ''; collision.injected = false
  if (directory) await io.rm(directory, { recursive: true, force: true })
  directory = ''
})

it.each(['write', 'sync', 'rename'] as const)('cleans its own backup temp after %s failure while preserving the primary file and retry', async failure => {
  directory = await io.realpath(await io.mkdtemp(join(tmpdir(), 'studio-backup-owned-failure-')))
  const backups = join(directory, 'backups'), source = join(directory, 'score.chromatics'), neighbor = join(directory, 'neighbor')
  const project = createNativeProject(createScore({ title: 'Original before owned backup failure' }))
  const original = encodeNativeProject(project)
  await io.writeFile(source, original); await io.writeFile(neighbor, 'keep neighbor')
  const mode = (await io.stat(source)).mode & 0o777
  const store = new NativeProjectBackupStore(() => backups), session = new NativeProjectFileSession(path => store.create(path))
  await session.open(source); project.score.title = 'App edit pending backup'
  collision.directory = backups; collision.failure = failure
  await expect(session.save(source, project)).rejects.toMatchObject({ code: failure === 'rename' ? 'EACCES' : 'ENOSPC' })
  expect(collision.injected).toBe(true)
  expect(await io.readFile(source, 'utf8')).toBe(original)
  expect((await io.stat(source)).mode & 0o777).toBe(mode)
  expect(await io.readdir(backups)).toEqual([])
  expect((await io.readdir(directory)).filter(name => name.startsWith('.chromatics-'))).toEqual([])
  expect(await io.readFile(neighbor, 'utf8')).toBe('keep neighbor')
  await session.save(source, project)
  expect(await readNativeProjectFile(source)).toEqual(project)
  const entries = await store.list(); expect(entries).toHaveLength(1)
  expect(await store.read(entries[0].id)).toBe(original)
  expect(await io.readdir(backups)).toEqual([entries[0].id])
  expect((await io.readdir(directory)).filter(name => name.startsWith('.chromatics-'))).toEqual([])
})

it('preserves an unowned backup temp on Native save collision and retries with intact revision and discoverable backup', async () => {
  directory = await io.realpath(await io.mkdtemp(join(tmpdir(), 'studio-backup-temp-integrity-')))
  const backups = join(directory, 'backups'), source = join(directory, 'score.chromatics'), neighbor = join(directory, 'neighbor')
  const project = createNativeProject(createScore({ title: 'Original before backup' }))
  const original = encodeNativeProject(project)
  await io.writeFile(source, original); await io.writeFile(neighbor, 'keep neighbor')
  const store = new NativeProjectBackupStore(() => backups), session = new NativeProjectFileSession(path => store.create(path))
  await session.open(source); project.score.title = 'App edit awaiting backup'
  collision.directory = backups; collision.armed = true
  await expect(session.save(source, project)).rejects.toMatchObject({ code: 'EEXIST' })
  expect(collision.armed).toBe(false); expect(collision.path).not.toBe('')
  expect(await io.readFile(collision.path, 'utf8')).toBe(collision.bytes)
  expect(await io.readFile(source, 'utf8')).toBe(original)
  expect(await io.readFile(neighbor, 'utf8')).toBe('keep neighbor')
  expect((await io.readdir(directory)).filter(name => name.startsWith('.chromatics-'))).toEqual([])
  expect(await store.list()).toEqual([])
  await session.save(source, project)
  expect(await readNativeProjectFile(source)).toEqual(project)
  expect(await io.readFile(collision.path, 'utf8')).toBe(collision.bytes)
  const entries = await store.list()
  expect(entries).toHaveLength(1)
  expect(decodeNativeProject(await store.read(entries[0].id)).score.title).toBe('Original before backup')
  expect((await io.readdir(backups)).sort()).toEqual([collision.path.slice(backups.length + 1), entries[0].id].sort())
  const external = structuredClone(project); external.score.title = 'External after successful retry'
  await io.writeFile(source, encodeNativeProject(external))
  await expect(session.save(source, project)).rejects.toThrow(/changed on disk/)
  expect(await readNativeProjectFile(source)).toEqual(external)
})
