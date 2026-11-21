import { chmod, lstat, mkdtemp, readFile, readdir, readlink, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { savePngExport } from './png-export'
import { withPngResolution } from '../image-export/png'

const folders: string[] = []
const bytes = () => new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64'))
afterEach(async () => { for (const p of folders.splice(0)) await rm(p, { recursive: true, force: true }) })
async function folder() { const p = await mkdtemp(join(tmpdir(), 'studio-png-dialog-'));folders.push(p);return p }

it('snapshots bytes before waiting for the single-page dialog and names the real selected page', async () => {
  const dir = await folder(), target = join(dir, 'chosen.png'), data = bytes(), original = new Uint8Array(data)
  const chooseFile = vi.fn(async (name: string) => { expect(name).toBe('score-p0002.png');data.fill(0);return target })
  const chooseFolder = vi.fn()
  expect(await savePngExport({ suggestedName: 'score', pages: [{ pageNumber: 2, bytes: data }] }, { chooseFile, chooseFolder }))
    .toEqual({ filePath: target, fileName: 'chosen.png', pageCount: 1, kind: 'file' })
  expect(new Uint8Array(await readFile(target))).toEqual(original)
  expect(chooseFolder).not.toHaveBeenCalled()
})

it('cancels either dialog without creating output and rejects malformed input before any dialog', async () => {
  const dir = await folder(), dialogs = { chooseFile: vi.fn(async () => null), chooseFolder: vi.fn(async () => null) }
  expect(await savePngExport({ suggestedName: 'score', pages: [{ pageNumber: 1, bytes: bytes() }] }, dialogs)).toBeNull()
  expect(await savePngExport({ suggestedName: 'score', pages: [{ pageNumber: 1, bytes: bytes() }, { pageNumber: 2, bytes: bytes() }] }, dialogs)).toBeNull()
  expect(dialogs.chooseFile).toHaveBeenCalledTimes(1);expect(dialogs.chooseFolder).toHaveBeenCalledTimes(1)
  await expect(savePngExport({ suggestedName: '../wrong', pages: [] }, dialogs)).rejects.toThrow()
  expect(dialogs.chooseFile).toHaveBeenCalledTimes(1);expect(dialogs.chooseFolder).toHaveBeenCalledTimes(1)
  expect(await readdir(dir)).toEqual([])
})

it('uses the chosen parent only and preserves earlier batch exports', async () => {
  const dir = await folder(), dialogs = { chooseFile: vi.fn(), chooseFolder: vi.fn(async () => dir) }
  const input = { suggestedName: 'score', pages: [{ pageNumber: 1, bytes: bytes() }, { pageNumber: 3, bytes: bytes() }] }
  const first = await savePngExport(input, dialogs), second = await savePngExport(input, dialogs)
  expect(first?.kind).toBe('folder');expect(first?.pageCount).toBe(2)
  expect(first?.filePath).toBe(join(dir, 'score-png'));expect(second?.filePath).toBe(join(dir, 'score-png (2)'))
  expect(await readdir(first!.filePath)).toEqual(['score-p0001.png', 'score-p0003.png'])
  expect(dialogs.chooseFile).not.toHaveBeenCalled()
})

it.skipIf(process.platform === 'win32')('preserves the selected PNG file mode on replacement and keeps new files private', async () => {
  const dir = await folder()
  const existing = join(dir, 'existing.png')
  const fresh = join(dir, 'new.png')
  const previous = withPngResolution(bytes(), 150)
  const replacement = withPngResolution(bytes(), 300)
  await writeFile(existing, previous)
  await chmod(existing, 0o664)

  for (const [filePath, mode] of [[existing, 0o664], [fresh, 0o600 & ~process.umask()]] as const) {
    const chooseFile = vi.fn(async () => filePath)
    const chooseFolder = vi.fn()
    await expect(savePngExport({ suggestedName: 'score', pages: [{ pageNumber: 1, bytes: replacement }] }, { chooseFile, chooseFolder }))
      .resolves.toMatchObject({ filePath, pageCount: 1, kind: 'file' })
    expect(await readFile(filePath)).toEqual(Buffer.from(replacement))
    expect((await stat(filePath)).mode & 0o777).toBe(mode)
    expect(chooseFolder).not.toHaveBeenCalled()
  }
  expect((await readdir(dir)).sort()).toEqual(['existing.png', 'new.png'])
})

it.skipIf(process.platform === 'win32').each([true, false])('preserves the selected relative PNG symlink (existing target=%s)', async existing => {
  const dir = await folder()
  const target = join(dir, 'real.png')
  const alias = join(dir, 'alias.png')
  const replacement = bytes()
  if (existing) {
    await writeFile(target, 'previous destination')
    await chmod(target, 0o640)
  }
  await symlink('real.png', alias)
  const link = await lstat(alias)
  const chooseFile = vi.fn(async () => alias)
  const chooseFolder = vi.fn()
  await expect(savePngExport({ suggestedName: 'score', pages: [{ pageNumber: 1, bytes: replacement }] }, { chooseFile, chooseFolder }))
    .resolves.toEqual({ filePath: alias, fileName: 'alias.png', pageCount: 1, kind: 'file' })

  expect((await lstat(alias)).isSymbolicLink()).toBe(true)
  expect((await lstat(alias)).ino).toBe(link.ino)
  expect(await readlink(alias)).toBe('real.png')
  expect(await readFile(target)).toEqual(Buffer.from(replacement))
  expect((await stat(target)).mode & 0o777).toBe(existing ? 0o640 : 0o600 & ~process.umask())
  expect((await readdir(dir)).sort()).toEqual(['alias.png', 'real.png'])
  expect(chooseFolder).not.toHaveBeenCalled()
})
