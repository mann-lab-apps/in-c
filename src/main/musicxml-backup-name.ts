import { randomUUID } from 'node:crypto'
import { basename } from 'node:path'

export function musicXmlBackupFileName(filePath: string, date = new Date()): string {
  const timestamp = date.toISOString().replace(/[:.]/g, '-')
  const name = basename(filePath).replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-')
  const original = `${timestamp}-${name}`
  if (Buffer.byteLength(original) <= 255) return original

  // Only internal backup names are shortened; retain the interchange extension.
  // Distinct long sources must not collide after shortening in the same tick.
  const extension = /\.(?:musicxml|xml|mxl)$/i.exec(name)?.[0] ?? ''
  const prefix = `${timestamp}-${randomUUID()}-`
  const source = extension ? name.slice(0, -extension.length) : name
  let remaining = 255 - Buffer.byteLength(prefix) - Buffer.byteLength(extension)
  let stem = ''
  for (const character of source) {
    const bytes = Buffer.byteLength(character)
    if (bytes > remaining) break
    stem += character
    remaining -= bytes
  }
  return `${prefix}${stem}${extension}`
}
