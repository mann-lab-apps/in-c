import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { MAX_PROJECT_BYTES, nativeProjectSchema, validateNativeProject } from '../project/schema'

const snapshotSchema = z.strictObject({
  score: z.unknown(),
  project: z.preprocess(value => value === undefined ? undefined : validateNativeProject(value), nativeProjectSchema.optional()),
  metadata: z.strictObject({ title: z.string().max(8192), updatedAt: z.string().max(64), version: z.string().max(64) })
})
export type AutosaveSnapshot = z.infer<typeof snapshotSchema>
const limit = MAX_PROJECT_BYTES * 2 + 65536

export class AutosaveFileStore {
  private pending: Promise<void> = Promise.resolve()
  constructor(private readonly path: () => string) {}

  read(): Promise<AutosaveSnapshot | null> {
    return this.enqueue(() => this.readSnapshot(this.path()))
  }

  write(snapshot: AutosaveSnapshot): Promise<AutosaveSnapshot['metadata']> {
    const validated = this.validate(snapshot)
    const contents = JSON.stringify(validated)
    if (Buffer.byteLength(contents) > limit) throw new Error('Autosave exceeds size limit.')
    return this.enqueue(async () => {
      const path = this.path()
      // An unreadable recovery file must survive new edits and save cleanup.
      await this.readSnapshot(path)
      await mkdir(dirname(path), { recursive: true })
      const temporary = join(dirname(path), `.autosave-${randomUUID()}.tmp`)
      try {
        await writeFile(temporary, contents, { flag: 'wx', mode: 0o600 })
        await rename(temporary, path)
      } finally { await rm(temporary, { force: true }) }
      return validated.metadata
    })
  }

  clear(): Promise<void> {
    return this.enqueue(async () => {
      const path = this.path()
      await this.readSnapshot(path)
      await rm(path, { force: true })
    })
  }

  private async readSnapshot(path: string): Promise<AutosaveSnapshot | null> {
    try {
      if ((await stat(path)).size > limit) throw new Error('Autosave exceeds size limit.')
      const contents = await readFile(path, 'utf8')
      if (Buffer.byteLength(contents) > limit) throw new Error('Autosave exceeds size limit.')
      return this.validate(JSON.parse(contents))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }

  private validate(input: unknown): AutosaveSnapshot {
    const snapshot = snapshotSchema.parse(input)
    if (snapshot.project) {
      snapshot.score = snapshot.project.score
      snapshot.metadata.title = snapshot.project.score.title
    }
    return snapshot
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pending.then(operation)
    this.pending = result.then(() => {}, () => {})
    return result
  }
}
