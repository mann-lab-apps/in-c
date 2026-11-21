import { copyFile, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { expect, it } from 'vitest'
import { musicXmlBackupFileName } from './musicxml-backup-name'
import { encodeMusicXmlFile } from '../musicxml/container'
import { readMusicXmlFile } from './musicxml-files'

const date = new Date('2026-11-11T06:52:00.000Z')
it.each(['score.musicxml', '한글 악보.mxl', 'Score.XML'])('retains the current short backup name for %s', name => {
  expect(musicXmlBackupFileName(name, date)).toBe(`2026-11-11T06-52-00-000Z-${name}`)
})

it.each((['x', '가'] as const).flatMap(character => (['musicxml', 'mxl'] as const).map(extension => ({ character, extension }))))(
  'backs up a maximum-length $character $extension source intact without truncating its selected name', async ({ character, extension }) => {
    const root = await mkdtemp(join(tmpdir(), 'studio-long-xml-backup-'))
    try {
      const suffix = `.${extension}`, bytes = 255 - Buffer.byteLength(suffix)
      const name = character.repeat(Math.floor(bytes / Buffer.byteLength(character))) + 'x'.repeat(bytes % Buffer.byteLength(character)) + suffix
      const source = join(root, name), xml = '<score-partwise><work><work-title>Keep original title</work-title></work></score-partwise>'
      const contents = encodeMusicXmlFile(xml, source)
      await writeFile(source, contents)
      const first = musicXmlBackupFileName(source, date), second = musicXmlBackupFileName(source, date)
      expect(first).not.toBe(second)
      expect(Buffer.byteLength(first)).toBeLessThanOrEqual(255)
      expect(Buffer.byteLength(second)).toBeLessThanOrEqual(255)
      expect(first.endsWith(suffix)).toBe(true)
      expect(second.endsWith(suffix)).toBe(true)
      await copyFile(source, join(root, first))
      await copyFile(source, join(root, second))
      expect(new Uint8Array(await readFile(source))).toEqual(contents)
      expect(await readFile(join(root, first))).toEqual(await readFile(source))
      expect(await readMusicXmlFile(join(root, first))).toBe(xml)
      expect(await readMusicXmlFile(join(root, second))).toBe(xml)
      expect((await readdir(root)).sort()).toEqual([name, first, second].sort())
    } finally { await rm(root, { recursive: true, force: true }) }
  }
)
