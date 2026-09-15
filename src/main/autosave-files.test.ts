import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { createNewScore } from '../renderer/src/editor/new-score'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { AutosaveFileStore } from './autosave-files'

describe('atomic native/legacy autosave store', () => {
  it.each([1, 2, 3])('migrates a v%s disk snapshot without rewriting it and resaves the portable state as v4', async version => {
    const directory = await mkdtemp(join(tmpdir(), 'chromatics-v1-recovery-'))
    const path = join(directory, 'autosave.json')
    try {
      const project = createNativeProject(createNewScore({ title: 'Legacy quartet', templateId: 'string-quartet', keySignature: { fifths: 2 }, timeSignature: { beats: 4, beatType: 4 }, measureCount: 4 }))
      const measures = project.score.parts.find(part => part.id === 'cello')!.staves[0]!.measures
      project.score.dynamics = [{ id: 'legacy-dynamic', measureId: measures[0]!.id, value: 'pp' }]
      project.score.hairpins = [{ id: 'legacy-hairpin', startEventId: measures[0]!.voices[0]!.events[0]!.id, endEventId: measures[1]!.voices[0]!.events[0]!.id, type: 'crescendo' }]
      if (version >= 2) project.score.hairpins[0]!.engraving = { offsetY: 2, height: 3 }
      project.view = { mode: 'part', partId: 'cello' }
      project.partLayouts = [{ partId: 'cello', title: 'Cello rehearsal', layout: { pageBreakBeforeMeasureIds: [measures[1]!.id], pageSetup: { staffSizePercent: 90 } } }]
      if (version === 3) project.partLayouts[0]!.spanEngravings = [{ kind: 'hairpin', spanId: 'legacy-hairpin', engraving: { offsetY: -1 } }]
      const metadata = { title: 'Stale metadata', updatedAt: '2026-09-13T00:00:00Z', version: 'alpha' }
      const contents = JSON.stringify({ score: { title: 'Stale duplicate' }, project: { ...project, version }, metadata })
      await writeFile(path, contents)
      const recovered = await new AutosaveFileStore(() => path).read()
      expect(recovered?.project).toEqual(JSON.parse(encodeNativeProject(project)))
      expect(recovered?.score).toEqual(recovered?.project?.score)
      expect(recovered?.metadata).toEqual({ ...metadata, title: project.score.title })
      expect(await readFile(path, 'utf8')).toBe(contents)
      const savedPath = join(directory, 'recovered.chromatics')
      await writeFile(savedPath, encodeNativeProject(recovered!.project!))
      expect(decodeNativeProject(await readFile(savedPath, 'utf8'))).toEqual(recovered!.project)
      await new AutosaveFileStore(() => path).write(recovered!)
      expect((await new AutosaveFileStore(() => path).read())?.project?.version).toBe(4)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })

  it.each(['broken-json', 'future-version', 'invalid-project'] as const)('preserves %s recovery across failed reads, writes and cleanup until a valid retry', async kind => {
    const directory = await mkdtemp(join(tmpdir(), 'chromatics-protected-recovery-'))
    const path = join(directory, 'autosave.json')
    try {
      const project = createNativeProject(createNewScore({ title: 'Protected', templateId: 'string-quartet', keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 }, measureCount: 4 }))
      const snapshot = { score: project.score, project, metadata: { title: 'Protected', updatedAt: '2026-09-13', version: 'test' } }
      const contents = kind === 'broken-json' ? '{broken' : JSON.stringify({ ...snapshot, project: { ...project, ...(kind === 'future-version' ? { version: 999 } : { view: { mode: 'part', partId: 'missing' } }) } })
      await writeFile(path, contents)
      const store = new AutosaveFileStore(() => path)
      await expect(store.read()).rejects.toThrow()
      await expect(store.write(snapshot)).rejects.toThrow()
      await expect(store.clear()).rejects.toThrow()
      expect(await readFile(path, 'utf8')).toBe(contents)
      expect(await readdir(directory)).toEqual(['autosave.json'])
      await writeFile(path, JSON.stringify(snapshot))
      await expect(store.read()).resolves.toMatchObject({ project: { version: 4 } })
      await store.write(snapshot)
      await store.clear()
      expect(await store.read()).toBeNull()
    } finally { await rm(directory, { recursive: true, force: true }) }
  })

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
