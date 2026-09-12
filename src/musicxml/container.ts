import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { strToU8, unzipSync, zipSync } from 'fflate'

export const MAX_MUSICXML_BYTES = 32 * 1024 * 1024
const MAX_CONTAINER_BYTES = 256 * 1024
const CONTAINER_PATH = 'META-INF/container.xml'
const MUSICXML_MIME = 'application/vnd.recordare.musicxml+xml'
const decoder = new TextDecoder('utf-8', { fatal: true })

function safeArchivePath(name: string): boolean {
  return name.length > 0 && !name.startsWith('/') && !/[\\:\u0000]/.test(name) &&
    !name.split('/').some((segment) => segment === '..' || segment === '.')
}

export function decodeMusicXmlFile(bytes: Uint8Array, fileName: string): string {
  if (bytes.byteLength > MAX_MUSICXML_BYTES) throw new Error('MusicXML 파일은 32 MiB 이하여야 합니다.')
  const compressed = /\.mxl$/i.test(fileName) || (bytes[0] === 0x50 && bytes[1] === 0x4b)
  if (!compressed) return decoder.decode(bytes)

  const names = new Set<string>()
  const metadata = unzipSync(bytes, { filter: (entry) => {
    if (!safeArchivePath(entry.name) || names.has(entry.name)) throw new Error('MXL 파일 경로가 올바르지 않습니다.')
    names.add(entry.name)
    if (names.size > 1024) throw new Error('MXL 파일 항목이 너무 많습니다.')
    if (entry.name !== CONTAINER_PATH) return false
    if (entry.originalSize > MAX_CONTAINER_BYTES) throw new Error('MXL container가 너무 큽니다.')
    return true
  } })
  const containerBytes = metadata[CONTAINER_PATH]
  if (!containerBytes) throw new Error('MXL META-INF/container.xml이 없습니다.')
  const containerXml = decoder.decode(containerBytes)
  if (XMLValidator.validate(containerXml) !== true) throw new Error('MXL container XML이 올바르지 않습니다.')
  const document = new XMLParser({ ignoreAttributes: false, processEntities: false }).parse(containerXml)
  const roots = document?.container?.rootfiles?.rootfile
  const root = Array.isArray(roots) ? roots[0] : roots
  const name = root?.['@_full-path']
  if (typeof name !== 'string' || !safeArchivePath(name) || !names.has(name)) {
    throw new Error('MXL root MusicXML 파일이 없거나 경로가 올바르지 않습니다.')
  }
  if (root['@_media-type'] && root['@_media-type'] !== MUSICXML_MIME) {
    throw new Error('MXL 첫 rootfile이 MusicXML이 아닙니다.')
  }
  const files = unzipSync(bytes, { filter: (entry) => {
    if (entry.name !== name) return false
    if (entry.originalSize > MAX_MUSICXML_BYTES) throw new Error('압축 해제한 MusicXML은 32 MiB 이하여야 합니다.')
    return true
  } })
  return decoder.decode(files[name])
}

export function encodeMusicXmlFile(xml: string, fileName: string): Uint8Array {
  const data = strToU8(xml)
  if (data.byteLength > MAX_MUSICXML_BYTES) throw new Error('MusicXML 파일은 32 MiB 이하여야 합니다.')
  if (!/\.mxl$/i.test(fileName)) return data
  return zipSync({
    mimetype: [strToU8('application/vnd.recordare.musicxml'), { level: 0 }],
    [CONTAINER_PATH]: strToU8(`<?xml version="1.0" encoding="UTF-8"?><container><rootfiles><rootfile full-path="score.musicxml" media-type="${MUSICXML_MIME}"/></rootfiles></container>`),
    'score.musicxml': data
  })
}
