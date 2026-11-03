export const PNG_LIMITS = { pages: 256, pixels: 16 * 1024 * 1024, pageBytes: 16 * 1024 * 1024, totalBytes: 128 * 1024 * 1024 } as const
export interface PngPage { pageNumber: number; bytes: Uint8Array }
export interface PngExportInput { suggestedName: string; pages: PngPage[] }
export interface PngExportResult { fileName: string; filePath: string; pageCount: number; kind: 'file' | 'folder' }

// Canvas encoders normally record 96 dpi regardless of the requested pixel size.
// Replace only pHYs; retain every compressed image byte and all other chunks.
export function withPngResolution(bytes: Uint8Array, dpi: 150 | 300): Uint8Array {
  pngDimensions(bytes)
  if (dpi !== 150 && dpi !== 300) throw new Error('PNG 해상도가 올바르지 않습니다.')
  const chunk = new Uint8Array(21), metadata = new DataView(chunk.buffer)
  metadata.setUint32(0, 9);chunk.set([112,72,89,115],4)
  metadata.setUint32(8, Math.round(dpi / .0254));metadata.setUint32(12, Math.round(dpi / .0254));chunk[16] = 1
  let crc = 0xffffffff
  for (const value of chunk.subarray(4,17)) {
    crc ^= value
    for (let bit=0;bit<8;bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  metadata.setUint32(17, (crc ^ 0xffffffff) >>> 0)
  const parts = [bytes.subarray(0,33), chunk], view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
  for (let offset=33;offset<bytes.length;) {
    const length = view.getUint32(offset) + 12
    if (![112,72,89,115].every((value,i)=>bytes[offset+4+i]===value)) parts.push(bytes.subarray(offset,offset+length))
    offset += length
  }
  const size = parts.reduce((sum, part)=>sum+part.length,0)
  if (size > PNG_LIMITS.pageBytes) throw new Error('PNG 파일이 너무 큽니다.')
  const result = new Uint8Array(size);let offset=0
  for (const part of parts) { result.set(part,offset);offset+=part.length }
  return result
}

// File envelope and capacity validation,not a replacement for a PNG decoder.
export function pngDimensions(bytes: Uint8Array): { width: number; height: number } {
  const invalid = () => new Error('PNG 파일 형식이나 크기가 올바르지 않습니다.')
  if (!(bytes instanceof Uint8Array) || bytes.length < 45 || bytes.length > PNG_LIMITS.pageBytes) throw invalid()
  if (![137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) throw invalid()
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 8, width = 0, height = 0, imageData = false, ended = false
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset), type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    if (length > bytes.length - offset - 12) throw invalid()
    if (offset === 8) {
      if (type !== 'IHDR' || length !== 13) throw invalid()
      width = view.getUint32(16); height = view.getUint32(20)
      if (!width || !height || width * height > PNG_LIMITS.pixels) throw invalid()
    } else if (type === 'IHDR') throw invalid()
    if (type === 'IDAT' && length) imageData = true
    offset += length + 12
    if (type === 'IEND') { if (length || offset !== bytes.length) throw invalid();ended = true;break }
  }
  if (!imageData || !ended) throw invalid()
  return { width, height }
}

export function validatePngExport(value: unknown): PngExportInput {
  const input = value as Partial<PngExportInput> | null
  if (!input || typeof input.suggestedName !== 'string' || !input.suggestedName ||
    !/^[\p{L}\p{N}-]+$/u.test(input.suggestedName) || new TextEncoder().encode(input.suggestedName).length > 240 ||
    !Array.isArray(input.pages) || !input.pages.length || input.pages.length > PNG_LIMITS.pages) throw new Error('PNG 내보내기 요청이 올바르지 않습니다.')
  let previous = 0, total = 0
  const pages = input.pages.map(page => {
    if (!page || !Number.isSafeInteger(page.pageNumber) || page.pageNumber <= previous || page.pageNumber > 10000) throw new Error('PNG 페이지 순서가 올바르지 않습니다.')
    previous = page.pageNumber
    pngDimensions(page.bytes)
    total += page.bytes.length
    if (total > PNG_LIMITS.totalBytes) throw new Error('PNG 출력이 너무 큽니다. 페이지를 나누어 저장해 주세요.')
    return { pageNumber: page.pageNumber, bytes: new Uint8Array(page.bytes) }
  })
  return { suggestedName: input.suggestedName, pages }
}
