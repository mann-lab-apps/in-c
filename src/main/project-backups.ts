import { constants } from 'node:fs'
import { mkdir, open, readdir, rename, rm, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { decodeNativeProject, encodeNativeProject, MAX_PROJECT_BYTES } from '../project/schema'
import type { NativeBackupEntry } from '../project/backups'
import { readNativeProjectFile } from './project-files'

export class NativeProjectBackupStore {
  private listedIds = new Set<string>()

  constructor(private readonly directory: () => string) {}

  async create(filePath: string): Promise<void> {
    let contents: string
    try { contents = encodeNativeProject(await readNativeProjectFile(filePath)) } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }
    await mkdir(this.directory(), { recursive: true })
    const destination = join(this.directory(), `${Date.now()}-${randomUUID()}-${basename(filePath)}`)
    const temporary = `${destination}.tmp`
    try {
      const handle = await open(temporary, 'wx', 0o600)
      try { await handle.writeFile(contents, 'utf8'); await handle.sync() } finally { await handle.close() }
      await rename(temporary, destination)
    } finally { await rm(temporary, { force: true }) }
  }

  async list(): Promise<NativeBackupEntry[]> {
    let files
    try { files = await readdir(this.directory(), { withFileTypes: true }) } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }
    const entries: NativeBackupEntry[] = []
    for (const file of files.filter(file => file.isFile() && file.name.endsWith('.chromatics'))) {
      const entry: NativeBackupEntry = { id: file.name, fileName: file.name, updatedAt: '' }
      try {
        entry.updatedAt = (await stat(join(this.directory(), file.name))).mtime.toISOString()
        entry.title = decodeNativeProject(await this.readContents(file.name)).score.title
      } catch (error) { entry.error = error instanceof Error ? error.message : 'Cannot read backup' }
      entries.push(entry)
    }
    entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id))
    this.listedIds = new Set(entries.map(entry => entry.id))
    return entries
  }

  async read(id: string): Promise<string> {
    if (typeof id !== 'string' || !this.listedIds.has(id) || basename(id) !== id) throw new Error('Choose a listed native backup.')
    const contents = await this.readContents(id)
    return encodeNativeProject(decodeNativeProject(contents))
  }

  private async readContents(id: string): Promise<string> {
    const handle = await open(join(this.directory(), id), constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
      const info = await handle.stat()
      if (!info.isFile() || info.size > MAX_PROJECT_BYTES) throw new Error('Invalid native backup file or size.')
      return await handle.readFile('utf8')
    } finally { await handle.close() }
  }
}
