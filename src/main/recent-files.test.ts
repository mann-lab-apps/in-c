import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { RecentFileStore } from './recent-files'

describe('shared native/MusicXML recent index', () => {
  it('reads legacy XML entries and retains native format after restart/removal', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'chromatics-recent-'))
    const path = join(directory, 'recent.json')
    try {
      const legacy = { filePath: '/old.xml', fileName: 'old.xml', openedAt: '2026-09-12' }
      await writeFile(path, JSON.stringify([legacy]))
      const store = new RecentFileStore(() => path)
      await store.add({ filePath: '/new.chromatics', fileName: 'new.chromatics', format: 'native' })
      const reopened = new RecentFileStore(() => path)
      expect(await reopened.list()).toEqual([expect.objectContaining({ format: 'native' }), legacy])
      expect(await reopened.remove('/new.chromatics')).toEqual([legacy])
      expect(await readdir(directory)).toEqual(['recent.json'])
    } finally { await rm(directory, { recursive: true, force: true }) }
  })

  it('serializes concurrent additions with deduplication and a five-entry limit', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'chromatics-recent-order-'))
    const path = join(directory, 'recent.json')
    try {
      const store = new RecentFileStore(() => path)
      const jobs = Array.from({ length: 7 }, (_, index) => store.add({ filePath: `/${index}.xml`, fileName: `${index}.xml` }))
      for (const job of jobs) await job
      expect((await store.list()).map(row => row.fileName)).toEqual(['6.xml', '5.xml', '4.xml', '3.xml', '2.xml'])
      await store.add({ filePath: '/4.xml', fileName: '4.xml' })
      expect((await store.list()).map(row => row.fileName)).toEqual(['4.xml', '6.xml', '5.xml', '3.xml', '2.xml'])
      await writeFile(path, '{bad')
      await expect(store.add({ filePath: '/new', fileName: 'new' })).rejects.toThrow()
      expect(await readFile(path, 'utf8')).toBe('{bad')
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
})
