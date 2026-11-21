import { afterEach, expect, it, vi } from 'vitest'
import * as io from 'node:fs/promises'
import { basename, join } from 'node:path'
import { tmpdir } from 'node:os'
import { MusicXmlFileSession } from './musicxml-files'
import { decodeMusicXmlFile, encodeMusicXmlFile } from '../musicxml/container'

const fault = vi.hoisted(() => ({ stage: '' as '' | 'write' | 'rename', injected: false }))
vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    writeFile: vi.fn(async (...args: Parameters<typeof actual.writeFile>) => {
      if (fault.stage === 'write' && String(args[0]).includes('/.studio-musicxml-')) {
        fault.stage = ''; fault.injected = true
        await actual.writeFile(args[0], Buffer.from(args[1] as Uint8Array).subarray(0, 3), args[2])
        throw Object.assign(new Error('owned XML partial-write ENOSPC'), { code: 'ENOSPC' })
      }
      return actual.writeFile(...args)
    }),
    open: vi.fn(async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args), write = handle.writeFile.bind(handle)
      handle.writeFile = async (...values: Parameters<typeof handle.writeFile>) => {
        if (fault.stage === 'write' && String(args[0]).includes('/.studio-musicxml-')) {
          fault.stage = ''; fault.injected = true
          await write(Buffer.from(values[0] as Uint8Array).subarray(0, 3))
          throw Object.assign(new Error('owned XML partial-write ENOSPC'), { code: 'ENOSPC' })
        }
        return write(...values)
      }
      return handle
    }),
    rename: vi.fn(async (...args: Parameters<typeof actual.rename>) => {
      if (fault.stage === 'rename' && String(args[0]).includes('/.studio-musicxml-')) {
        fault.stage = ''; fault.injected = true
        throw Object.assign(new Error('owned XML commit EACCES'), { code: 'EACCES' })
      }
      return actual.rename(...args)
    })
  }
})

const directories: string[] = []
afterEach(async () => {
  fault.stage = ''; fault.injected = false
  for (const directory of directories.splice(0)) await io.rm(directory, { recursive: true, force: true })
})

const first = '<score-partwise><work><work-title>Before</work-title></work></score-partwise>'
const next = first.replace('Before', 'After')
const cases = ['musicxml', 'mxl'].flatMap(ext =>
  (['save', 'exportCopy'] as const).flatMap(operation =>
    [true, false].flatMap(existing => (['write', 'rename'] as const).map(stage => ({ ext, operation, existing, stage })))
  )
)

it.skipIf(process.platform === 'win32').each(cases)(
  'preserves a $ext symbolic target (existing=$existing) after $operation $stage failure and retries',
  async ({ ext, operation, existing, stage }) => {
    const directory = await io.mkdtemp(join(tmpdir(), 'studio-xml-link-failure-'))
    directories.push(directory)
    const selected = join(directory, `selected.${ext}`), target = join(directory, `actual.${ext}`)
    const source = join(directory, `source.${ext}`), backup = join(directory, 'previous-copy')
    const original = Buffer.from(encodeMusicXmlFile(first, selected)), backups: Buffer[] = []
    if (existing) { await io.writeFile(target, original); await io.chmod(target, 0o640) }
    await io.symlink(basename(target), selected)
    await io.writeFile(join(directory, 'neighbor'), 'keep neighbor')
    const session = new MusicXmlFileSession(async path => {
      try {
        const bytes = await io.readFile(path)
        backups.push(bytes); await io.writeFile(backup, bytes)
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    })
    if (operation === 'save') session.authorizeSave(selected)
    else { await io.writeFile(source, original); await session.open(source) }

    fault.stage = stage
    await expect(session[operation](selected, next)).rejects.toMatchObject({ code: stage === 'write' ? 'ENOSPC' : 'EACCES' })
    expect(fault.injected).toBe(true)
    expect(fault.stage).toBe('')
    expect((await io.lstat(selected)).isSymbolicLink()).toBe(true)
    expect(await io.readlink(selected)).toBe(basename(target))
    if (existing) {
      expect(await io.readFile(target)).toEqual(original)
      expect((await io.stat(target)).mode & 0o777).toBe(0o640)
      expect(backups).toEqual([original])
      expect(await io.readFile(backup)).toEqual(original)
    } else {
      await expect(io.stat(target)).rejects.toMatchObject({ code: 'ENOENT' })
      expect(backups).toHaveLength(0)
    }
    const expectedEntries = ['neighbor', basename(selected), ...(existing ? [basename(target), basename(backup)] : []), ...(operation === 'exportCopy' ? [basename(source)] : [])].sort()
    expect((await io.readdir(directory)).sort()).toEqual(expectedEntries)

    await session[operation](selected, next)
    expect((await io.lstat(selected)).isSymbolicLink()).toBe(true)
    expect(await io.readlink(selected)).toBe(basename(target))
    const saved = await io.readFile(target)
    expect(decodeMusicXmlFile(saved, selected)).toBe(next)
    expect(await io.readFile(selected)).toEqual(saved)
    expect((await io.stat(target)).mode & 0o777).toBe(existing ? 0o640 : 0o600 & ~process.umask())
    expect(await io.readFile(join(directory, 'neighbor'), 'utf8')).toBe('keep neighbor')
    expect(backups).toEqual(existing ? [original, original] : [])
    expect((await io.readdir(directory)).sort()).toEqual([...new Set([...expectedEntries, basename(target)])].sort())
    if (operation === 'exportCopy') {
      expect(await io.readFile(source)).toEqual(original)
      await expect(session.save(selected, first)).rejects.toThrow(/대화상자/)
      await expect(session.exportCopy(source, next)).rejects.toThrow(/원본/)
    } else await expect(session.exportCopy(target, first)).rejects.toThrow(/원본/)
    expect(await new MusicXmlFileSession(async () => {}).open(selected)).toBe(next)
  }
)
