import { access, open, readFile, rename, rm, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { resolveOutputFileTarget } from './output-file-target'
import { decodeMusicXmlFile, encodeMusicXmlFile, MAX_MUSICXML_BYTES } from '../musicxml/container'
import { assertSaveTargetUnchanged, fileRevision, readSaveTarget } from './file-revision'

const changedOnDisk = 'MusicXML file changed on disk. Reopen it or save to another file.'

export async function readMusicXmlFile(filePath: string): Promise<string> {
  if ((await stat(filePath)).size > MAX_MUSICXML_BYTES) {
    throw new Error('MusicXML 파일은 32 MiB 이하여야 합니다.')
  }
  return decodeMusicXmlFile(await readFile(filePath), filePath)
}

export class MusicXmlFileSession {
  private readonly writablePaths = new Set<string>()
  private readonly revisions = new Map<string, string>()
  private pendingIO: Promise<void> = Promise.resolve()

  constructor(private readonly backup: (filePath: string) => Promise<unknown>) {}

  async open(filePath: string): Promise<string> {
    return this.enqueue(async () => {
      const contents = await readMusicXmlFile(filePath)
      this.revisions.set((await fileIdentity(filePath)).path, fileRevision(contents))
      this.authorizeSave(filePath)
      return contents
    })
  }

  authorizeSave(filePath: string): void {
    this.writablePaths.add(filePath)
  }

  async save(filePath: string, contents: string, expectedRevision?: string): Promise<string> {
    if (!this.writablePaths.has(filePath)) {
      throw new Error('먼저 파일 열기 또는 저장 대화상자에서 파일을 선택해 주세요.')
    }
    const revision = fileRevision(contents)
    await this.enqueue(() => this.replace(filePath, contents, revision, expectedRevision))
    return revision
  }

  async exportCopy(filePath: string, contents: string): Promise<void> {
    return this.enqueue(async () => {
      const target = await fileIdentity(filePath)
      for (const source of this.writablePaths) {
        const original = await fileIdentity(source)
        if (target.path === original.path ||
            (target.inode !== undefined && target.inode === original.inode)) {
          throw new Error('열거나 저장한 원본 악보와 다른 경로로 내보내 주세요.')
        }
      }
      // An interchange copy is not a newly selected primary document.
      await this.replace(filePath, contents)
    })
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pendingIO.then(operation)
    this.pendingIO = result.then(() => {}, () => {})
    return result
  }

  private async replace(filePath: string, contents: string, revision?: string, expectedRevision?: string): Promise<void> {
    const bytes = encodeMusicXmlFile(contents, filePath)
    // Keep the selected link and replace its actual target, like native saves.
    // Encoding still follows the selected name's XML/MXL format.
    const targetPath = await resolveOutputFileTarget(filePath)
    // A valid selected filename may already fill the filesystem component limit.
    const temporaryPath = join(dirname(targetPath), `.studio-musicxml-${randomUUID()}.tmp`)
    const before = await readSaveTarget(targetPath)
    // Atomic replacement must respect the selected file's write permissions.
    if (before) await access(targetPath, constants.W_OK)
    const expected = revision === undefined ? undefined : expectedRevision ?? this.revisions.get(targetPath)
    if (expected !== undefined) {
      let current: string | undefined
      try { current = fileRevision(await readMusicXmlFile(filePath)) } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      if (expected !== current) throw new Error(changedOnDisk)
    }
    await this.backup(targetPath)
    let created = false
    try {
      const handle = await open(temporaryPath, 'wx', 0o600)
      created = true
      try {
        await handle.writeFile(bytes)
        if (before) await handle.chmod(Number(before.mode & 0o777n))
      } finally { await handle.close() }
      if (filePath !== targetPath && await resolveOutputFileTarget(filePath) !== targetPath) throw new Error(changedOnDisk)
      await assertSaveTargetUnchanged(filePath, before, changedOnDisk)
      await rename(temporaryPath, targetPath)
      if (revision !== undefined) this.revisions.set(targetPath, revision)
    } finally {
      if (created) await rm(temporaryPath, { force: true })
    }
  }
}

async function fileIdentity(filePath: string): Promise<{ path: string; inode?: string }> {
  try {
    const info = await stat(filePath)
    return { path: await resolveOutputFileTarget(filePath), inode: `${info.dev}:${info.ino}` }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return { path: await resolveOutputFileTarget(filePath) }
  }
}
