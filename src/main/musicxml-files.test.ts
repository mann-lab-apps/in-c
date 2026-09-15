import { copyFile, link, mkdtemp, readFile, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { MusicXmlFileSession } from './musicxml-files'

describe('MusicXML save session', () => {
  it('exports a copy without overwriting opened/saved originals or filesystem aliases', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'chromatics-part-export-'))
    const source = join(directory, 'full.musicxml')
    const target = join(directory, 'part.mxl')
    const session = new MusicXmlFileSession(async () => {})
    const full = '<score-partwise><work><work-title>Full</work-title></work></score-partwise>'
    const part = full.replace('Full', 'Part')
    try {
      session.authorizeSave(source)
      await session.save(source, full)
      await symlink(source, join(directory, 'alias.musicxml'))
      await link(source, join(directory, 'hard.musicxml'))
      for (const path of [source, join(directory, '.', 'full.musicxml'), join(directory, 'alias.musicxml'), join(directory, 'hard.musicxml')]) {
        await expect(session.exportCopy(path, part)).rejects.toThrow(/원본/)
      }
      expect(await readFile(source, 'utf8')).toBe(full)
      await session.exportCopy(target, part)
      await session.exportCopy(target, part.replace('Part', 'Revised'))
      expect(await session.open(target)).toContain('Revised')
      expect(await session.open(source)).toBe(full)
      await expect(session.exportCopy(target, part)).rejects.toThrow(/원본/)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('preserves the original file when backup fails and permits a later retry', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'chromatics-save-failure-'))
    const filePath = join(directory, 'score.musicxml')
    let failBackup = false
    const session = new MusicXmlFileSession(async () => {
      if (failBackup) throw new Error('backup unavailable')
    })
    try {
      session.authorizeSave(filePath)
      await session.save(filePath, '<score-partwise version="3.1"/>')
      const original = await readFile(filePath)
      failBackup = true
      await expect(session.save(filePath, '<score-partwise version="4.0"/>')).rejects.toThrow('backup unavailable')
      expect(await readFile(filePath)).toEqual(original)
      failBackup = false
      await session.save(filePath, '<score-partwise version="4.0"/>')
      expect(await session.open(filePath)).toContain('4.0')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it.each(['musicxml', 'mxl'])('supports first save, overwrite, backup, reopen and another save (%s)', async (extension) => {
    const directory = await mkdtemp(join(tmpdir(), 'chromatics-save-'))
    const filePath = join(directory, `score.${extension}`)
    const backupPath = join(directory, 'backup')
    const first = '<score-partwise><work><work-title>First</work-title></work></score-partwise>'
    const second = first.replace('First', 'Second')
    const backup = async (path: string) => {
      try { await copyFile(path, backupPath) } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
    }
    try {
      const session = new MusicXmlFileSession(backup)
      await expect(session.save(filePath, first)).rejects.toThrow(/대화상자/)
      session.authorizeSave(filePath)
      await session.save(filePath, first)
      const originalBytes = await readFile(filePath)
      await session.save(filePath, second)
      expect(await readFile(backupPath)).toEqual(originalBytes)
      const reopened = new MusicXmlFileSession(backup)
      expect(await reopened.open(filePath)).toBe(second)
      await reopened.save(filePath, first)
      expect(await reopened.open(filePath)).toBe(first)
      await expect(reopened.save(join(directory, 'unselected.xml'), first)).rejects.toThrow(/대화상자/)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
