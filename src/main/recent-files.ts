import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

const entry = z.object({ filePath: z.string().min(1).max(4096), fileName: z.string().min(1).max(1024), openedAt: z.string().max(64), format: z.literal('native').optional() })
export type RecentScoreFile = z.infer<typeof entry>

export class RecentFileStore {
  private pending: Promise<void> = Promise.resolve()
  constructor(private readonly path: () => string) {}
  list(): Promise<RecentScoreFile[]> { return this.enqueue(() => this.read()) }
  add(input: Omit<RecentScoreFile, 'openedAt'>): Promise<RecentScoreFile[]> {
    const next = entry.parse({ ...input, openedAt: new Date().toISOString() })
    return this.enqueue(async () => {
      const rows = [next, ...(await this.read()).filter(row => row.filePath !== next.filePath)].slice(0, 5)
      await this.write(rows)
      return rows
    })
  }
  remove(path: string): Promise<RecentScoreFile[]> {
    return this.enqueue(async () => {
      const rows = (await this.read()).filter(row => row.filePath !== path)
      await this.write(rows)
      return rows
    })
  }
  private async read(): Promise<RecentScoreFile[]> {
    try {
      const text = await readFile(this.path(), 'utf8')
      if (Buffer.byteLength(text) > 128 * 1024) throw new Error('Recent file index exceeds size limit.')
      const parsed: unknown = JSON.parse(text)
      if (!Array.isArray(parsed)) return []
      return parsed.flatMap(value => { const result = entry.safeParse(value); return result.success ? [result.data] : [] }).slice(0, 5)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }
  }
  private async write(rows: RecentScoreFile[]): Promise<void> {
    const path = this.path()
    await mkdir(dirname(path), { recursive: true })
    const temporary = join(dirname(path), `.recent-${randomUUID()}.tmp`)
    try { await writeFile(temporary, JSON.stringify(rows), { flag: 'wx', mode: 0o600 }); await rename(temporary, path) } finally { await rm(temporary, { force: true }) }
  }
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pending.then(operation)
    this.pending = result.then(() => {}, () => {})
    return result
  }
}
