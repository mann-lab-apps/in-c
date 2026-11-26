import { access, open, readFile, realpath, rename, rm, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { basename, dirname, join, resolve } from 'node:path'
import { decodeNativeProject, encodeNativeProject, MAX_PROJECT_BYTES, type NativeProject } from '../project/schema'
import { assertSaveTargetUnchanged, fileRevision, readSaveTarget } from './file-revision'

const changedOnDisk = 'Native project changed on disk. Reopen it or save to another file.'

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
      this.revisions.set(path, fileRevision(encodeNativeProject(project)))
      this.authorizeSave(filePath)
      return project
    })
  }

  authorizeSave(filePath: string): void {
    this.writable.add(filePath)
  }

  async save(filePath: string, project: NativeProject, expectedRevision?: string, revisionPath = filePath): Promise<string> {
    if (!this.writable.has(filePath)) throw new Error('Select a native project in the file dialog before saving.')
    // Snapshot before any asynchronous disk operation, including queued writes.
    const contents = encodeNativeProject(project)
    return this.enqueue(async () => {
      const target = await canonicalPath(filePath)
      const sameFile = revisionPath === filePath ||
        (expectedRevision !== undefined && await realpath(revisionPath).catch(() => undefined) === target)
      return this.replace(filePath, target, contents, sameFile ? expectedRevision : undefined)
    })
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pendingIO.then(operation)
    this.pendingIO = result.then(() => {}, () => {})
    return result
  }

  private async replace(filePath: string, path: string, contents: string, expectedRevision?: string): Promise<string> {
    const before = await readSaveTarget(path)
    const existing = before ? fileRevision(encodeNativeProject(await readNativeProjectFile(path))) : undefined
    // A read that was ignored by the editor may have updated the path cache.
    const expected = expectedRevision ?? this.revisions.get(path)
    if (expected !== undefined && expected !== existing) throw new Error(changedOnDisk)
    // Keep the revision check and original bytes when replacement is not writable.
    if (existing !== undefined) await access(path, constants.W_OK)
    // The selected filename can already fill the filesystem's component limit.
    // Keep the atomic temporary file in the same directory without appending to it.
    const temporary = join(dirname(path), `.chromatics-${randomUUID()}.tmp`)
    let created = false
    try {
      const handle = await open(temporary, 'wx', 0o600)
      created = true
      try {
        await handle.writeFile(contents, 'utf8')
        if (before) await handle.chmod(Number(before.mode & 0o777n))
        await handle.sync()
      } finally { await handle.close() }
      await this.backup(path)
      if (filePath !== path && await canonicalPath(filePath) !== path) throw new Error(changedOnDisk)
      await assertSaveTargetUnchanged(filePath, before, changedOnDisk)
      await this.replaceFile(temporary, path)
      const revision = fileRevision(contents)
      this.revisions.set(path, revision)
      return revision
    } finally {
      if (created) await rm(temporary, { force: true })
    }
  }
}

async function canonicalPath(filePath: string): Promise<string> {
  try { return await realpath(filePath) } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return resolve(await realpath(dirname(filePath)), basename(filePath))
  }
}
