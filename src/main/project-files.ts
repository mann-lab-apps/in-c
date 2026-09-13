import { open, readFile, realpath, rename, rm, stat } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { basename, dirname, join, resolve } from 'node:path'
import { decodeNativeProject, encodeNativeProject, MAX_PROJECT_BYTES, type NativeProject } from '../project/schema'

export async function readNativeProjectFile(filePath: string): Promise<NativeProject> {
  if ((await stat(filePath)).size > MAX_PROJECT_BYTES) throw new Error('Chromatics project exceeds the 16 MiB limit.')
  return decodeNativeProject(await readFile(filePath, 'utf8'))
}

export class NativeProjectFileSession {
  private readonly writable = new Set<string>()
  private readonly revisions = new Map<string, string>()
  private pendingIO: Promise<void> = Promise.resolve()

  constructor(
    private readonly backup: (filePath: string) => Promise<unknown>,
    private readonly replaceFile: typeof rename = rename
  ) {}

  async open(filePath: string): Promise<NativeProject> {
    return this.enqueue(async () => {
      const path = await canonicalPath(filePath)
      const project = await readNativeProjectFile(path)
      this.revisions.set(path, encodeNativeProject(project))
      this.authorizeSave(filePath)
      return project
    })
  }

  authorizeSave(filePath: string): void {
    this.writable.add(filePath)
  }

  async save(filePath: string, project: NativeProject): Promise<void> {
    if (!this.writable.has(filePath)) throw new Error('Select a native project in the file dialog before saving.')
    // Snapshot before any asynchronous disk operation, including queued writes.
    const contents = encodeNativeProject(project)
    return this.enqueue(async () => this.replace(await canonicalPath(filePath), contents))
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pendingIO.then(operation)
    this.pendingIO = result.then(() => {}, () => {})
    return result
  }

  private async replace(path: string, contents: string): Promise<void> {
    let existing: string | undefined
    let mode = 0o600
    try {
      existing = encodeNativeProject(await readNativeProjectFile(path))
      mode = (await stat(path)).mode & 0o777
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    const expected = this.revisions.get(path)
    if (expected !== undefined && expected !== existing) throw new Error('Native project changed on disk. Reopen it or save to another file.')
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`)
    try {
      const handle = await open(temporary, 'wx', mode)
      try { await handle.writeFile(contents, 'utf8'); await handle.sync() } finally { await handle.close() }
      await this.backup(path)
      await this.replaceFile(temporary, path)
      this.revisions.set(path, contents)
    } finally {
      await rm(temporary, { force: true })
    }
  }
}

async function canonicalPath(filePath: string): Promise<string> {
  try { return await realpath(filePath) } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return resolve(await realpath(dirname(filePath)), basename(filePath))
  }
}
