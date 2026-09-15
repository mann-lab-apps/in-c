import { copyFile, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
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
})
