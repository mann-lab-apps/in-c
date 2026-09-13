import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { createNewScore } from '../renderer/src/editor/new-score'
import { createNativeProject } from '../project/schema'
import { AutosaveFileStore } from './autosave-files'

describe('atomic native/legacy autosave store', () => {
  it('retains native envelope and reopens it after process-local state is gone', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'chromatics-recovery-'))
    const path = join(directory, 'autosave.json')
    try {
      const project = createNativeProject(createNewScore({ title: 'Recovery', templateId: 'string-quartet', keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 }, measureCount: 4 }))
      project.view = { mode: 'part', partId: 'cello' }
      project.partLayouts = [{ partId: 'cello', title: 'Cello part', layout: { pageSetup: { staffSizePercent: 90 } } }]
      const store = new AutosaveFileStore(() => path)
      await store.write({ score: project.score, project, metadata: { title: 'Recovery', updatedAt: '2026-09-13', version: 'test' } })
      const fresh = await new AutosaveFileStore(() => path).read()
      expect(fresh?.project).toEqual(JSON.parse(JSON.stringify(project)))
      expect(fresh?.score).toEqual(fresh?.project?.score)
      expect(await readdir(directory)).toEqual(['autosave.json'])
      const good = await readFile(path)
      expect(() => store.write({ ...fresh!, project: { ...project, version: 999 } as never })).toThrow()
      expect(await readFile(path)).toEqual(good)
      await writeFile(path, '{broken')
      await expect(store.read()).rejects.toThrow()
    } finally { await rm(directory, { recursive: true, force: true }) }
  })

  it('orders write/clear/read operations and still accepts legacy score-only recovery', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'chromatics-recovery-order-'))
    const path = join(directory, 'autosave.json')
    try {
      const store = new AutosaveFileStore(() => path)
      const snapshot = { score: { title: 'Legacy' }, metadata: { title: 'Legacy', updatedAt: '2026-09-13', version: 'test' } }
      const writing = store.write(snapshot)
      const clearing = store.clear()
      const reading = store.read()
      await writing
      await clearing
      expect(await reading).toBeNull()
      await store.write(snapshot)
      expect(await store.read()).toEqual(snapshot)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
})
