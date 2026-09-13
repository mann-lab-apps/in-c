import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { createScore } from '../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { NativeProjectBackupStore } from './project-backups'

describe('native backup discovery', () => {
  it('discovers previous saves, flags corrupt files and recovers without changing the source', async () => {
    const root = await mkdtemp(join(tmpdir(), 'chromatics-backups-'))
    try {
      const directory = join(root, 'backups')
      const store = new NativeProjectBackupStore(() => directory)
      expect(await store.list()).toEqual([])
      const source = join(root, 'score.chromatics')
      const contents = encodeNativeProject(createNativeProject(createScore({ title: 'Backup title' })))
      await writeFile(source, contents)
      await store.create(source)
      await writeFile(source, 'damaged original')
      await writeFile(join(directory, 'broken.chromatics'), '{broken')
      await writeFile(join(directory, 'partial.chromatics.tmp'), contents)
      const entries = await store.list()
      expect(entries).toHaveLength(2)
      expect(entries.find(entry => entry.id === 'broken.chromatics')?.error).toBeTruthy()
      const backup = entries.find(entry => entry.title === 'Backup title')!
      expect(decodeNativeProject(await store.read(backup.id)).score.title).toBe('Backup title')
      expect(await readFile(source, 'utf8')).toBe('damaged original')
      await expect(store.read('broken.chromatics')).rejects.toThrow()
      await expect(store.read('../score.chromatics')).rejects.toThrow('listed')
      await expect(new NativeProjectBackupStore(() => directory).read(backup.id)).rejects.toThrow('listed')
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('revalidates selection after listing and refuses symlink substitution', async () => {
    const root = await mkdtemp(join(tmpdir(), 'chromatics-backups-'))
    try {
      const file = join(root, 'backup.chromatics')
      await writeFile(file, encodeNativeProject(createNativeProject(createScore())))
      const store = new NativeProjectBackupStore(() => root)
      await store.list()
      await writeFile(file, JSON.stringify({ format: 'chromatics-project', version: 100 }))
      await expect(store.read('backup.chromatics')).rejects.toThrow(/Unsupported/)
      await rm(file)
      await symlink(join(root, 'outside'), file)
      await expect(store.read('backup.chromatics')).rejects.toThrow()
      expect(await store.list()).toEqual([])
    } finally { await rm(root, { recursive: true, force: true }) }
  })
})
