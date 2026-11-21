import { afterEach, expect, it, vi } from 'vitest'
import * as io from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { NativeProjectFileSession, readNativeProjectFile } from './project-files'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { parseMusicXml } from '../musicxml/parse'

const fault = vi.hoisted(() => ({ directory: '', armed: false, injected: false,
  bytes: Buffer.alloc(0), calls: 0, closes: 0 }))
vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return { ...actual, open: vi.fn(async (...args: Parameters<typeof actual.open>) => {
    const handle = await actual.open(...args)
    if (fault.directory && String(args[0]).startsWith(`${fault.directory}/.chromatics-`)) {
      const sync = handle.sync.bind(handle), close = handle.close.bind(handle)
      handle.sync = async () => {
        fault.calls++
        if (fault.armed) {
          fault.armed = false; fault.injected = true
          fault.bytes = await actual.readFile(args[0])
          throw Object.assign(new Error('owned complete-temp sync ENOSPC'), { code: 'ENOSPC' })
        }
        return sync()
      }
      handle.close = async () => { await close(); fault.closes++ }
    }
    return handle
  }) }
})

const directories: string[] = []
afterEach(async () => {
  Object.assign(fault, { directory: '', armed: false, injected: false, bytes: Buffer.alloc(0), calls: 0, closes: 0 })
  for (const directory of directories.splice(0)) await io.rm(directory, { recursive: true, force: true })
})

it.each([true, false])('preserves the original or absent Native target after complete-temp sync failure (existing=%s)', async existing => {
  const directory = await io.realpath(await io.mkdtemp(join(tmpdir(), 'studio-native-sync-')))
  directories.push(directory)
  const file = join(directory, 'score.chromatics'), backup = join(directory, 'previous-copy'), neighbor = join(directory, 'neighbor')
  const project = createNativeProject(parseMusicXml(await io.readFile('src/musicxml/fixtures/expanded-v1-part-export.musicxml', 'utf8')))
  const original = Buffer.from(encodeNativeProject(project)), backups: Buffer[] = []
  await io.writeFile(neighbor, 'keep neighbor')
  if (existing) { await io.writeFile(file, original); if (process.platform !== 'win32') await io.chmod(file, 0o660) }
  const session = new NativeProjectFileSession(async path => {
    try { const bytes = await io.readFile(path); backups.push(bytes); await io.writeFile(backup, bytes) }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  })
  if (existing) await session.open(file)
  else session.authorizeSave(file)
  project.score.title = 'App edit awaiting sync'
  fault.directory = directory; fault.armed = true
  await expect(session.save(file, project)).rejects.toMatchObject({ code: 'ENOSPC' })
  expect(fault.injected).toBe(true); expect(fault.calls).toBe(1); expect(fault.closes).toBe(1)
  expect(fault.bytes.toString('utf8')).toBe(encodeNativeProject(project))
  if (existing) expect(await io.readFile(file)).toEqual(original)
  else await expect(io.stat(file)).rejects.toMatchObject({ code: 'ENOENT' })
  expect(backups).toEqual([]); await expect(io.stat(backup)).rejects.toMatchObject({ code: 'ENOENT' })
  expect((await io.readdir(directory)).sort()).toEqual(existing ? ['neighbor', 'score.chromatics'] : ['neighbor'])
  await session.save(file, project)
  expect(fault.calls).toBe(2); expect(fault.closes).toBe(2)
  expect(await readNativeProjectFile(file)).toEqual(project)
  expect(backups).toEqual(existing ? [original] : [])
  if (existing) expect(await io.readFile(backup)).toEqual(original)
  if (process.platform !== 'win32') expect((await io.stat(file)).mode & 0o777).toBe(existing ? 0o660 : 0o600 & ~process.umask())
  expect(await io.readFile(neighbor, 'utf8')).toBe('keep neighbor')
  expect((await io.readdir(directory)).filter(name => name.endsWith('.tmp'))).toEqual([])
  const external = structuredClone(project); external.score.title = 'External after successful retry'
  await io.writeFile(file, encodeNativeProject(external))
  await expect(session.save(file, project)).rejects.toThrow(/changed on disk/)
  expect(await readNativeProjectFile(file)).toEqual(external)
  expect(fault.calls).toBe(2)
})
