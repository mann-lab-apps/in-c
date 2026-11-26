import { createHash } from 'node:crypto'
import type { BigIntStats } from 'node:fs'
import { stat } from 'node:fs/promises'

export function fileRevision(contents: string): string {
  return createHash('sha256').update(contents).digest('hex')
}

export async function readSaveTarget(filePath: string): Promise<BigIntStats | undefined> {
  try {
    return await stat(filePath, { bigint: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return undefined
  }
}

export async function assertSaveTargetUnchanged(
  filePath: string, before: BigIntStats | undefined, conflictMessage: string
): Promise<void> {
  const current = await readSaveTarget(filePath)
  if (current?.dev !== before?.dev || current?.ino !== before?.ino ||
      current?.size !== before?.size || current?.mtimeNs !== before?.mtimeNs ||
      current?.ctimeNs !== before?.ctimeNs) {
    throw new Error(conflictMessage)
  }
}
