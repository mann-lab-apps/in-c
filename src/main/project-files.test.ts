import { chmod, copyFile, mkdtemp, readFile, readdir, readlink, rename, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { parseMusicXml } from '../musicxml/parse'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { NativeProjectFileSession, readNativeProjectFile } from './project-files'

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), 'chromatics-native-'))
  const file = join(directory, 'score.chromatics')
  const backupPath = join(directory, 'score.chromatics.bak')
  const project = createNativeProject(parseMusicXml(await readFile('src/musicxml/fixtures/expanded-v1-part-export.musicxml', 'utf8')))
  const backup = async (path: string) => {
    try { await copyFile(path, backupPath) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  }
  return { directory, file, backupPath, project, backup, cleanup: () => rm(directory, { recursive: true, force: true }) }
}

describe('native project disk lifecycle', () => {
  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)('preserves a read-only native project and its save revision until a writable retry', async () => {
    const env = await setup()
    let backups = 0
    const session = new NativeProjectFileSession(async path => { backups++; await env.backup(path) })
    try {
      await writeFile(env.file, encodeNativeProject(env.project))
      await writeFile(join(env.directory, 'neighbor.txt'), 'keep neighbor')
      const original = await readFile(env.file)
      const edited = await session.open(env.file)
      edited.score.title = 'Writable retry'
      await chmod(env.file, 0o444)

      await expect(session.save(env.file, edited)).rejects.toMatchObject({ code: 'EACCES' })
      expect(await readFile(env.file)).toEqual(original)
      expect((await stat(env.file)).mode & 0o777).toBe(0o444)
      expect(backups).toBe(0)
      expect((await readdir(env.directory)).sort()).toEqual(['neighbor.txt', 'score.chromatics'])

      await chmod(env.file, 0o600)
      // Do not reopen before retry: the original session revision must still work.
      await session.save(env.file, edited)
      expect(backups).toBe(1)
      expect(await readFile(env.backupPath)).toEqual(original)
      expect((await readNativeProjectFile(env.file)).score.title).toBe('Writable retry')
      expect((await stat(env.file)).mode & 0o777).toBe(0o600)
      expect(await readFile(join(env.directory, 'neighbor.txt'), 'utf8')).toBe('keep neighbor')
      expect((await readdir(env.directory)).sort()).toEqual(['neighbor.txt', 'score.chromatics', 'score.chromatics.bak'])
    } finally { await env.cleanup() }
  })

  it('writes, backs up, reopens in a fresh session, and recovers an intact backup', async () => {
    const env = await setup()
    try {
      const session = new NativeProjectFileSession(env.backup)
      await expect(session.save(env.file, env.project)).rejects.toThrow(/dialog/)
      session.authorizeSave(env.file)
      await session.save(env.file, env.project)
      env.project.score.title = 'Revised'
      await session.save(env.file, env.project)
      const freshSession = new NativeProjectFileSession(env.backup)
      expect((await freshSession.open(env.file)).score.title).toBe('Revised')
      expect((await readNativeProjectFile(env.backupPath)).score.title).toBe('Expanded Part Export')
      await writeFile(env.file, '{broken')
      await expect(freshSession.open(env.file)).rejects.toThrow(/JSON/)
      expect((await readNativeProjectFile(env.backupPath)).score.parts).toHaveLength(2)
      expect(await readdir(env.directory)).toEqual(expect.arrayContaining(['score.chromatics', 'score.chromatics.bak']))
    } finally { await env.cleanup() }
  })

  it.each(['backup', 'rename'])('preserves original and removes temporary files when %s fails; retry succeeds', async failure => {
    const env = await setup()
    let failing = false
    const session = new NativeProjectFileSession(
      async path => { if (failing && failure === 'backup') throw new Error('backup failed'); await env.backup(path) },
      async (from, to) => { if (failing && failure === 'rename') throw new Error('rename failed'); await rename(from, to) }
    )
    try {
      session.authorizeSave(env.file)
      await session.save(env.file, env.project)
      const original = await readFile(env.file)
      env.project.score.title = 'Retry'
      failing = true
      await expect(session.save(env.file, env.project)).rejects.toThrow(`${failure} failed`)
      expect(await readFile(env.file)).toEqual(original)
      expect((await readdir(env.directory)).filter(name => name.endsWith('.tmp'))).toEqual([])
      failing = false
      await session.save(env.file, env.project)
      expect((await session.open(env.file)).score.title).toBe('Retry')
    } finally { await env.cleanup() }
  })

  it('serializes concurrent writes and snapshots each requested revision', async () => {
    const env = await setup()
    const session = new NativeProjectFileSession(env.backup)
    try {
      session.authorizeSave(env.file)
      const first = session.save(env.file, env.project)
      env.project.score.title = 'Second snapshot'
      const second = session.save(env.file, env.project)
      env.project.score.title = 'Unsaved edit'
      await first
      await second
      expect((await session.open(env.file)).score.title).toBe('Second snapshot')
      expect((await readNativeProjectFile(env.backupPath)).score.title).toBe('Expanded Part Export')
    } finally { await env.cleanup() }
  })

  it('refuses external changes and future-version overwrite without damaging either file', async () => {
    const env = await setup()
    const session = new NativeProjectFileSession(env.backup)
    try {
      session.authorizeSave(env.file)
      await session.save(env.file, env.project)
      const external = { ...env.project, score: { ...env.project.score, title: 'External edit' } }
      await writeFile(env.file, encodeNativeProject(external))
      await expect(session.save(env.file, env.project)).rejects.toThrow(/changed on disk/)
      expect((await readNativeProjectFile(env.file)).score.title).toBe('External edit')
      const future = JSON.stringify({ ...env.project, version: 100 })
      await writeFile(env.file, future)
      await expect(session.save(env.file, env.project)).rejects.toThrow(/Unsupported/)
      expect(await readFile(env.file, 'utf8')).toBe(future)
    } finally { await env.cleanup() }
  })

  it('checks the accepted project revision even after another read observes an external edit', async () => {
    const env = await setup()
    const session = new NativeProjectFileSession(env.backup)
    try {
      await writeFile(env.file, encodeNativeProject(env.project))
      const accepted = await session.open(env.file)
      const expectedRevision = createHash('sha256').update(encodeNativeProject(accepted)).digest('hex')
      const external = { ...accepted, score: { ...accepted.score, title: 'External edit' } }
      const externalContents = encodeNativeProject(external)
      await writeFile(env.file, externalContents)
      expect(await session.open(env.file)).toEqual(external)
      accepted.score.title = 'Pending Studio edit'

      await expect(session.save(env.file, accepted, expectedRevision)).rejects.toThrow(/changed on disk/)
      expect(await readFile(env.file, 'utf8')).toBe(externalContents)
      expect(await readdir(env.directory)).toEqual(['score.chromatics'])

      const copy = join(env.directory, 'new-copy.chromatics')
      session.authorizeSave(copy)
      await session.save(copy, accepted, expectedRevision, env.file)
      expect((await readNativeProjectFile(copy)).score.title).toBe('Pending Studio edit')
      expect(await readFile(env.file, 'utf8')).toBe(externalContents)
    } finally { await env.cleanup() }
  })

  it('keeps the file an external editor replaces while the project backup is being written', async () => {
    const env = await setup()
    const replacement = join(env.directory, 'external.chromatics')
    let replaceDuringBackup = true
    const session = new NativeProjectFileSession(async path => {
      await env.backup(path)
      if (replaceDuringBackup) {
        replaceDuringBackup = false
        await rename(replacement, env.file)
      }
    })
    try {
      const original = encodeNativeProject(env.project)
      const external = structuredClone(env.project)
      external.score.title = 'External replacement'
      const externalContents = encodeNativeProject(external)
      await writeFile(env.file, original)
      await writeFile(replacement, externalContents)
      const edited = await session.open(env.file)
      const revision = createHash('sha256').update(encodeNativeProject(edited)).digest('hex')
      edited.score.title = 'Studio edit'

      await expect(session.save(env.file, edited, revision)).rejects.toThrow(/changed on disk/)
      expect(await readFile(env.file, 'utf8')).toBe(externalContents)
      expect(await readFile(env.backupPath, 'utf8')).toBe(original)
      expect((await readdir(env.directory)).sort()).toEqual(['score.chromatics', 'score.chromatics.bak'])

      expect(await session.open(env.file)).toEqual(external)
      await session.save(env.file, edited)
      expect(await readNativeProjectFile(env.file)).toEqual(edited)
    } finally { await env.cleanup() }
  })

  it.skipIf(process.platform === 'win32')('preserves both projects when the selected link is retargeted during backup', async () => {
    const env = await setup()
    const link = join(env.directory, 'selected.chromatics')
    const alternative = join(env.directory, 'alternative.chromatics')
    const nextLink = join(env.directory, 'next.chromatics')
    const session = new NativeProjectFileSession(async path => {
      await env.backup(path)
      await rename(nextLink, link)
    })
    try {
      const original = encodeNativeProject(env.project)
      const external = structuredClone(env.project)
      external.score.title = 'Other project'
      const externalContents = encodeNativeProject(external)
      await writeFile(env.file, original)
      await writeFile(alternative, externalContents)
      await symlink('score.chromatics', link)
      await symlink('alternative.chromatics', nextLink)
      const edited = await session.open(link)
      edited.score.title = 'Studio edit'

      await expect(session.save(link, edited)).rejects.toThrow(/changed on disk/)
      expect(await readFile(env.file, 'utf8')).toBe(original)
      expect(await readFile(alternative, 'utf8')).toBe(externalContents)
      expect(await readlink(link)).toBe('alternative.chromatics')
      expect((await readdir(env.directory)).filter(name => name.endsWith('.tmp'))).toEqual([])
    } finally { await env.cleanup() }
  })
})
