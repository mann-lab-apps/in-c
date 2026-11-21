import { access, open, rename, rm, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { resolveOutputFileTarget } from './output-file-target'

export async function saveBinaryExport(filePath: string, bytes: Uint8Array): Promise<void> {
  const snapshot = Buffer.from(bytes)
  const target = await resolveOutputFileTarget(filePath)
  let mode = 0o666 & ~process.umask()
  try {
    const existing = await stat(target)
    if (!existing.isFile()) throw Object.assign(new Error('출력 위치에 일반 파일을 선택해 주세요.'), { code: 'EISDIR' })
    await access(target, constants.W_OK)
    mode = existing.mode & 0o777
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  // Keep partial bytes private, in the destination filesystem, until complete.
  // A fixed-length temporary name also supports maximum-length selected names.
  const temporary = join(dirname(target), `.studio-export-${randomUUID()}.tmp`)
  let created = false
  try {
    const handle = await open(temporary, 'wx', 0o600)
    created = true
    try {
      await handle.writeFile(snapshot)
      await handle.chmod(mode)
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(temporary, target)
  } catch (error) {
    // Never delete an unrelated file if exclusive creation itself failed.
    // Preserve the original write/commit error if cleanup also fails.
    if (created) await rm(temporary, { force: true }).catch(() => undefined)
    throw error
  }
}
