import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { savePngExport } from './png-export'

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
