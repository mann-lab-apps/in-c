import { afterEach, expect, it, vi } from 'vitest'
import * as io from 'node:fs/promises'
import { basename, join } from 'node:path'
import { tmpdir } from 'node:os'
import { MusicXmlFileSession } from './musicxml-files'
import { NativeProjectFileSession } from './project-files'
import { decodeMusicXmlFile, encodeMusicXmlFile } from '../musicxml/container'
import { parseMusicXml } from '../musicxml/parse'
import { createNativeProject, encodeNativeProject } from '../project/schema'

const fault = vi.hoisted(() => ({ directory: '', armed: false, calls: 0, injected: false,
  tempBytes: Buffer.alloc(0), tempMode: 0, closed: 0 }))
vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return { ...actual, open: vi.fn(async (...args: Parameters<typeof actual.open>) => {
    const handle = await actual.open(...args)
    if (fault.directory && String(args[0]).startsWith(`${fault.directory}/.`)) {
      const chmod = handle.chmod.bind(handle), close = handle.close.bind(handle)
      handle.chmod = async mode => {
        fault.calls++
        if (fault.armed) {
          fault.armed = false; fault.injected = true
          fault.tempBytes = await actual.readFile(args[0])
          fault.tempMode = (await handle.stat()).mode & 0o777
          throw Object.assign(new Error('owned complete-temp chmod EPERM'), { code: 'EPERM' })
        }
        return chmod(mode)
      }
      handle.close = async () => { await close(); fault.closed++ }
    }
    return handle
  }) }
})

const directories: string[] = []
afterEach(async () => {
  Object.assign(fault, { directory: '', armed: false, calls: 0, injected: false,
    tempBytes: Buffer.alloc(0), tempMode: 0, closed: 0 })
  for (const directory of directories.splice(0)) await io.rm(directory, { recursive: true, force: true })
})
const scenarios = [
  { format: 'native', operation: 'save' },
  { format: 'musicxml', operation: 'save' }, { format: 'mxl', operation: 'save' },
  { format: 'musicxml', operation: 'exportCopy' }, { format: 'mxl', operation: 'exportCopy' }
] as const

async function setup(scenario: typeof scenarios[number], existing: boolean) {
  const directory = await io.realpath(await io.mkdtemp(join(tmpdir(), 'studio-chmod-failure-')))
  directories.push(directory)
  const native = scenario.format === 'native'
  const target = join(directory, `actual.${native ? 'chromatics' : scenario.format}`)
  // Native new-file canonicalization is a separate contract; use an ordinary path there.
  const selected = !existing && native ? target : join(directory, `selected.${native ? 'chromatics' : scenario.format}`)
  if (selected !== target) await io.symlink(basename(target), selected)
  const backup = join(directory, 'previous-copy'), neighbor = join(directory, 'neighbor')
  const backups: Buffer[] = []
  const backUp = async (path: string) => {
    try { const bytes = await io.readFile(path); backups.push(bytes); await io.writeFile(backup, bytes) }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  }
  await io.writeFile(neighbor, 'keep neighbor')
  const project = createNativeProject(parseMusicXml(await io.readFile('src/musicxml/fixtures/expanded-v1-part-export.musicxml', 'utf8')))
  const first = native ? encodeNativeProject(project) : '<score-partwise><work><work-title>Before</work-title></work></score-partwise>'
  project.score.title = 'After'
  const next = native ? encodeNativeProject(project) : first.replace('Before', 'After')
  const original = Buffer.from(native ? first : encodeMusicXmlFile(first, selected))
  if (existing) { await io.writeFile(target, original); await io.chmod(target, 0o660) }
  const source = scenario.operation === 'exportCopy' ? join(directory, `source.${scenario.format}`) : undefined
  const nativeSession = new NativeProjectFileSession(backUp), xmlSession = new MusicXmlFileSession(backUp)
  if (native) {
    if (existing) await nativeSession.open(selected)
    else nativeSession.authorizeSave(selected)
  } else if (source) { await io.writeFile(source, original); await xmlSession.open(source) }
  else xmlSession.authorizeSave(selected)
  fault.directory = directory; fault.armed = true
  return { directory, target, selected, backup, neighbor, backups, original, next, source, native,
    save: () => native ? nativeSession.save(selected, project) : xmlSession[scenario.operation](selected, next),
    read: async () => native ? await io.readFile(target, 'utf8') : decodeMusicXmlFile(await io.readFile(target), selected),
    assertAuthority: async () => {
      if (native) {
        const external = structuredClone(project); external.score.title = 'External after retry'
        await io.writeFile(target, encodeNativeProject(external))
        await expect(nativeSession.save(selected, project)).rejects.toThrow(/changed on disk/)
        expect(await io.readFile(target, 'utf8')).toBe(encodeNativeProject(external))
      } else if (source) {
        await expect(xmlSession.save(selected, next)).rejects.toThrow(/대화상자/)
        await expect(xmlSession.exportCopy(source, next)).rejects.toThrow(/원본/)
      } else await expect(xmlSession.exportCopy(selected, next)).rejects.toThrow(/원본/)
    }
  }
}

it.skipIf(process.platform === 'win32').each(scenarios)(
  'preserves $format $operation after complete-temp chmod failure and retries in the same session', async scenario => {
    const env = await setup(scenario, true)
    await expect(env.save()).rejects.toMatchObject({ code: 'EPERM' })
    expect(fault.injected).toBe(true); expect(fault.calls).toBe(1); expect(fault.closed).toBe(1)
    expect(fault.tempMode).toBe(0o600 & ~process.umask())
    expect(env.native ? fault.tempBytes.toString('utf8') : decodeMusicXmlFile(fault.tempBytes, env.selected)).toBe(env.next)
    expect(await io.readFile(env.target)).toEqual(env.original)
    expect((await io.stat(env.target)).mode & 0o777).toBe(0o660)
    expect(await io.readlink(env.selected)).toBe(basename(env.target))
    expect(env.backups).toEqual(env.native ? [] : [env.original])
    if (!env.native) expect(await io.readFile(env.backup)).toEqual(env.original)
    expect((await io.readdir(env.directory)).filter(name => name.endsWith('.tmp'))).toEqual([])
    await env.save()
    expect(fault.calls).toBe(2); expect(fault.closed).toBe(2)
    expect(await env.read()).toBe(env.next)
    expect((await io.stat(env.target)).mode & 0o777).toBe(0o660)
    expect((await io.lstat(env.selected)).isSymbolicLink()).toBe(true)
    expect(await io.readlink(env.selected)).toBe(basename(env.target))
    expect(await io.readFile(env.backup)).toEqual(env.original)
    expect(env.backups).toEqual(env.native ? [env.original] : [env.original, env.original])
    expect(await io.readFile(env.neighbor, 'utf8')).toBe('keep neighbor')
    if (env.source) expect(await io.readFile(env.source)).toEqual(env.original)
    expect((await io.readdir(env.directory)).filter(name => name.endsWith('.tmp'))).toEqual([])
    await env.assertAuthority()
  }
)

it.skipIf(process.platform === 'win32').each(scenarios)(
  'does not restore an absent target mode during new $format $operation', async scenario => {
    const env = await setup(scenario, false)
    await env.save()
    expect(fault.armed).toBe(true); expect(fault.injected).toBe(false)
    expect(fault.calls).toBe(0); expect(fault.closed).toBe(1)
    expect(await env.read()).toBe(env.next)
    expect((await io.stat(env.target)).mode & 0o777).toBe(0o600 & ~process.umask())
    if (env.selected !== env.target) expect(await io.readlink(env.selected)).toBe(basename(env.target))
    expect(env.backups).toEqual([])
    await expect(io.stat(env.backup)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await io.readFile(env.neighbor, 'utf8')).toBe('keep neighbor')
    if (env.source) expect(await io.readFile(env.source)).toEqual(env.original)
    expect((await io.readdir(env.directory)).filter(name => name.endsWith('.tmp'))).toEqual([])
  }
)
