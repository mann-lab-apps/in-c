import { lstat, readlink, realpath } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'

// Shared only by main-process file writers; selected-path/byte APIs stay unchanged.
export async function resolveOutputFileTarget(filePath: string, links = 0): Promise<string> {
  if (links >= 40) throw Object.assign(new Error('출력 파일의 연결 경로를 확인해 주세요.'), { code: 'ELOOP' })
  try {
    return await realpath(filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  // writeFile followed even a dangling symlink. Keep that selected-path behavior.
  try {
    if ((await lstat(filePath)).isSymbolicLink()) {
      return resolveOutputFileTarget(resolve(dirname(filePath), await readlink(filePath)), links + 1)
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  return join(await realpath(dirname(filePath)), basename(filePath))
}
