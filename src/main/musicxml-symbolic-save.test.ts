import { chmod, copyFile, lstat, mkdtemp, readFile, readdir, readlink, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { expect, it } from 'vitest'
import { MusicXmlFileSession } from './musicxml-files'
import { decodeMusicXmlFile, encodeMusicXmlFile } from '../musicxml/container'

const first = '<score-partwise><work><work-title>Before</work-title></work></score-partwise>'
const next = first.replace('Before', 'After')

it.skipIf(process.platform === 'win32').each(
  ['musicxml', 'mxl'].flatMap(ext => (['save', 'exportCopy'] as const).map(operation => ({ ext, operation })))
)('creates a dangling $ext target during $operation without replacing the selected link', async ({ ext, operation }) => {
  const folder = await mkdtemp(join(tmpdir(), 'studio-xml-dangling-link-'))
  const target = join(folder, `future.${ext}`), selected = join(folder, `selected.${ext}`)
  const backedUp: string[] = []
  const session = new MusicXmlFileSession(async path => {
    try { await readFile(path); backedUp.push(path) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  })
  try {
    await symlink(`future.${ext}`, selected)
    await writeFile(join(folder, 'neighbor'), 'keep neighbor')
    if (operation === 'save') session.authorizeSave(selected)
    await session[operation](selected, next)
    expect((await lstat(selected)).isSymbolicLink()).toBe(true)
    expect(await readlink(selected)).toBe(`future.${ext}`)
    expect(decodeMusicXmlFile(await readFile(target), selected)).toBe(next)
    expect(await readFile(selected)).toEqual(await readFile(target))
    expect(backedUp).toHaveLength(0)
    expect(await readFile(join(folder, 'neighbor'), 'utf8')).toBe('keep neighbor')
    expect((await readdir(folder)).sort()).toEqual(['neighbor', `future.${ext}`, `selected.${ext}`].sort())
    if (operation === 'exportCopy') await expect(session.save(selected, first)).rejects.toThrow(/대화상자/)
    else await expect(session.exportCopy(target, first)).rejects.toThrow(/원본/)
  } finally { await rm(folder, { recursive: true, force: true }) }
})

it.skipIf(process.platform === 'win32').each(['save', 'exportCopy'] as const)(
  'rejects a cyclic selected link during %s without touching either link or neighbors', async operation => {
    const folder = await mkdtemp(join(tmpdir(), 'studio-xml-cyclic-link-'))
    const a = join(folder, 'a.musicxml'), b = join(folder, 'b.musicxml')
    const backedUp: string[] = []
    const session = new MusicXmlFileSession(async path => { backedUp.push(path) })
    try {
      await symlink('b.musicxml', a)
      await symlink('a.musicxml', b)
      await writeFile(join(folder, 'neighbor'), 'keep neighbor')
      if (operation === 'save') session.authorizeSave(a)
      await expect(session[operation](a, next)).rejects.toMatchObject({ code: 'ELOOP' })
      expect(await readlink(a)).toBe('b.musicxml')
      expect(await readlink(b)).toBe('a.musicxml')
      expect(backedUp).toHaveLength(0)
      expect(await readFile(join(folder, 'neighbor'), 'utf8')).toBe('keep neighbor')
      expect((await readdir(folder)).sort()).toEqual(['a.musicxml', 'b.musicxml', 'neighbor'])
    } finally { await rm(folder, { recursive: true, force: true }) }
  }
)

it.skipIf(process.platform === 'win32').each(['musicxml', 'mxl'])(
  'saves through an opened %s symbolic link while preserving the link, target permissions and original-copy protection', async ext => {
    const folder = await mkdtemp(join(tmpdir(), 'studio-xml-selected-link-'))
    const target = join(folder, `original.${ext}`), selected = join(folder, `selected.${ext}`), backup = join(folder, 'previous')
    const backups: string[] = []
    const session = new MusicXmlFileSession(async path => { backups.push(path); await copyFile(path, backup) })
    try {
      await writeFile(target, encodeMusicXmlFile(first, target))
      await chmod(target, 0o640)
      const original = await readFile(target)
      await writeFile(join(folder, 'neighbor'), 'keep neighbor')
      await symlink(`original.${ext}`, selected)
      expect(await session.open(selected)).toBe(first)
      await session.save(selected, next)
      expect((await lstat(selected)).isSymbolicLink()).toBe(true)
      expect(await readlink(selected)).toBe(`original.${ext}`)
      expect(await session.open(target)).toBe(next)
      expect(await session.open(selected)).toBe(next)
      expect((await stat(target)).mode & 0o777).toBe(0o640)
      expect(backups).toEqual([await realpath(target)])
      expect(await readFile(backup)).toEqual(original)
      for (const path of [target, selected]) await expect(session.exportCopy(path, first)).rejects.toThrow(/원본/)
      expect(await readFile(join(folder, 'neighbor'), 'utf8')).toBe('keep neighbor')
      expect((await readdir(folder)).sort()).toEqual(['neighbor', `original.${ext}`, 'previous', `selected.${ext}`].sort())
    } finally { await rm(folder, { recursive: true, force: true }) }
  }
)

it.skipIf(process.platform === 'win32').each(['musicxml', 'mxl'])(
  'keeps the selected %s encoding when the symbolic target has an unrelated filename', async ext => {
    const folder = await mkdtemp(join(tmpdir(), 'studio-xml-link-format-'))
    const target = join(folder, 'actual-score.data'), selected = join(folder, `selected.${ext}`)
    const session = new MusicXmlFileSession(async () => {})
    try {
      await writeFile(target, encodeMusicXmlFile(first, selected))
      await symlink('actual-score.data', selected)
      expect(await session.open(selected)).toBe(first)
      await session.save(selected, next)
      expect((await lstat(selected)).isSymbolicLink()).toBe(true)
      const bytes = await readFile(target)
      expect(bytes.subarray(0, 2).toString()).toBe(ext === 'mxl' ? 'PK' : next.slice(0, 2))
      expect(decodeMusicXmlFile(bytes, selected)).toBe(next)
      expect(await session.open(selected)).toBe(next)
    } finally { await rm(folder, { recursive: true, force: true }) }
  }
)

it.skipIf(process.platform === 'win32' || process.getuid?.() === 0).each(['musicxml', 'mxl'])(
  'keeps a read-only %s target and symbolic link on failure, then retries through the same selected path', async ext => {
    const folder = await mkdtemp(join(tmpdir(), 'studio-xml-readonly-link-'))
    const target = join(folder, `original.${ext}`), selected = join(folder, `selected.${ext}`)
    const backups: Buffer[] = []
    const session = new MusicXmlFileSession(async path => { backups.push(await readFile(path)) })
    try {
      await writeFile(target, encodeMusicXmlFile(first, target))
      const original = await readFile(target)
      await symlink(`original.${ext}`, selected)
      await session.open(selected)
      await chmod(target, 0o444)
      await expect(session.save(selected, next)).rejects.toMatchObject({ code: 'EACCES' })
      expect(await readFile(target)).toEqual(original)
      expect((await lstat(selected)).isSymbolicLink()).toBe(true)
      expect((await stat(target)).mode & 0o777).toBe(0o444)
      expect(backups).toHaveLength(0)
      await chmod(target, 0o600)
      await session.save(selected, next)
      expect((await lstat(selected)).isSymbolicLink()).toBe(true)
      expect(await readlink(selected)).toBe(`original.${ext}`)
      expect(await session.open(target)).toBe(next)
      expect(backups).toEqual([original])
      expect((await stat(target)).mode & 0o777).toBe(0o600)
      expect((await readdir(folder)).sort()).toEqual([`original.${ext}`, `selected.${ext}`].sort())
    } finally { await rm(folder, { recursive: true, force: true }) }
  }
)

it.skipIf(process.platform === 'win32').each(['musicxml', 'mxl'])(
  'updates an unrelated %s copy destination through its symbolic link without authorizing it as a primary document', async ext => {
    const folder = await mkdtemp(join(tmpdir(), 'studio-xml-copy-link-'))
    const source = join(folder, `source.${ext}`), target = join(folder, `copy.${ext}`), selected = join(folder, `chosen.${ext}`)
    const session = new MusicXmlFileSession(async () => {})
    try {
      await writeFile(source, encodeMusicXmlFile(first, source))
      await writeFile(target, encodeMusicXmlFile(first, target))
      const original = await readFile(source)
      await symlink(`copy.${ext}`, selected)
      await session.open(source)
      await session.exportCopy(selected, next)
      expect((await lstat(selected)).isSymbolicLink()).toBe(true)
      expect(await readlink(selected)).toBe(`copy.${ext}`)
      expect(decodeMusicXmlFile(await readFile(target), target)).toBe(next)
      expect(await readFile(source)).toEqual(original)
      await expect(session.save(selected, first)).rejects.toThrow(/대화상자/)
      await expect(session.exportCopy(source, next)).rejects.toThrow(/원본/)
    } finally { await rm(folder, { recursive: true, force: true }) }
  }
)
