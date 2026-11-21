import { copyFile, mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { expect, it } from 'vitest'
import { toFileName } from '../renderer/src/editor/file-lifecycle'
import { MusicXmlFileSession, readMusicXmlFile } from './musicxml-files'

const cases = (['x', '가'] as const).flatMap(character =>
  (['musicxml', 'mxl'] as const).flatMap(extension =>
    (['suggested', 'component-limit'] as const).flatMap(length =>
      (['save', 'exportCopy'] as const).map(operation => ({ character, extension, length, operation })))))

it.each(cases)('saves, backs up and reopens $length $character $extension names with $operation', async ({ character, extension, length, operation }) => {
  const root = await mkdtemp(join(tmpdir(), 'studio-long-xml-'))
  const suffix = `.${extension}`, stemBytes = 255 - Buffer.byteLength(suffix)
  const stem = length === 'suggested' ? toFileName(character.repeat(1000))
    : character.repeat(Math.floor(stemBytes / Buffer.byteLength(character))) + 'x'.repeat(stemBytes % Buffer.byteLength(character))
  const name = stem + suffix, target = join(root, name), backup = join(root, 'previous-copy')
  const original = '<score-partwise><work><work-title>Original title stays intact</work-title></work></score-partwise>'
  const edited = original.replace('Original', 'Revised')
  const session = new MusicXmlFileSession(async path => {
    try { await copyFile(path, backup) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  })
  try {
    expect(Buffer.byteLength(name)).toBe(length === 'component-limit' ? 255 : 240 + Buffer.byteLength(suffix))
    if (operation === 'save') session.authorizeSave(target)
    await session[operation](target, original)
    expect(await readMusicXmlFile(target)).toBe(original)
    const oldBytes = await readFile(target)
    expect(await readdir(root)).toEqual([name])
    await session[operation](target, edited)
    expect(await readFile(backup)).toEqual(oldBytes)
    expect(await readMusicXmlFile(target)).toBe(edited)
    expect(await new MusicXmlFileSession(async () => {}).open(target)).toBe(edited)
    expect((await readdir(root)).sort()).toEqual([name, 'previous-copy'].sort())
  } finally { await rm(root, { recursive: true, force: true }) }
})
