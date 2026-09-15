import { readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { basename, dirname, join, resolve } from 'node:path'
import { decodeMusicXmlFile, encodeMusicXmlFile, MAX_MUSICXML_BYTES } from '../musicxml/container'

export async function readMusicXmlFile(filePath: string): Promise<string> {
  if ((await stat(filePath)).size > MAX_MUSICXML_BYTES) {
    throw new Error('MusicXML 파일은 32 MiB 이하여야 합니다.')
  }
  return decodeMusicXmlFile(await readFile(filePath), filePath)
}

export class MusicXmlFileSession {
  private readonly writablePaths = new Set<string>()

  constructor(private readonly backup: (filePath: string) => Promise<unknown>) {}

  async open(filePath: string): Promise<string> {
    const contents = await readMusicXmlFile(filePath)
    this.authorizeSave(filePath)
    return contents
  }

  authorizeSave(filePath: string): void {
    this.writablePaths.add(filePath)
  }

  async save(filePath: string, contents: string): Promise<void> {
    if (!this.writablePaths.has(filePath)) {
      throw new Error('먼저 파일 열기 또는 저장 대화상자에서 파일을 선택해 주세요.')
    }
    await this.replace(filePath, contents)
  }

  async exportCopy(filePath: string, contents: string): Promise<void> {
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
  }

  private async replace(filePath: string, contents: string): Promise<void> {
    const bytes = encodeMusicXmlFile(contents, filePath)
    await this.backup(filePath)
    const temporaryPath = join(dirname(filePath), `.${basename(filePath)}.${randomUUID()}.tmp`)
    let mode = 0o600
    try {
      mode = (await stat(filePath)).mode & 0o777
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    try {
      await writeFile(temporaryPath, bytes, { flag: 'wx', mode })
      await rename(temporaryPath, filePath)
    } finally {
      await rm(temporaryPath, { force: true })
    }
  }
}

async function fileIdentity(filePath: string): Promise<{ path: string; inode?: string }> {
  try {
    const info = await stat(filePath)
    return { path: await realpath(filePath), inode: `${info.dev}:${info.ino}` }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return { path: resolve(await realpath(dirname(filePath)), basename(filePath)) }
  }
}
