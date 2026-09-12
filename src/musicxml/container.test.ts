import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { strToU8, unzipSync, zipSync } from 'fflate'
import { decodeMusicXmlFile, encodeMusicXmlFile, MAX_MUSICXML_BYTES } from './container'
import { readMusicXmlFile } from '../main/musicxml-files'
import { parseMusicXml } from './parse'

const container = (path: string) => strToU8(`<container><rootfiles><rootfile full-path="${path}"/></rootfiles></container>`)

describe('compressed MusicXML file lifecycle', () => {
  it('saves and reopens plain and compressed files through the same disk reader', async () => {
    const xml = await readFile('src/musicxml/fixtures/release-qa.musicxml', 'utf8')
    const directory = await mkdtemp(join(tmpdir(), 'chromatics-mxl-'))
    try {
      for (const extension of ['musicxml', 'mxl', 'MXL']) {
        const file = join(directory, `score.${extension}`)
        await writeFile(file, encodeMusicXmlFile(xml, file))
        expect(await readMusicXmlFile(file)).toBe(xml)
        expect(parseMusicXml(await readMusicXmlFile(file))).toEqual(parseMusicXml(xml))
      }
      const archive = encodeMusicXmlFile(xml, 'score.mxl')
      expect(Array.from(archive.slice(0, 4))).toEqual([80, 75, 3, 4])
      expect(archive[8]).toBe(0)
      expect(new TextDecoder().decode(archive.slice(30, 38))).toBe('mimetype')
      expect(new TextDecoder().decode(unzipSync(archive).mimetype)).toBe('application/vnd.recordare.musicxml')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('follows the container root path, including UTF-8 subdirectories and old containers without mimetype', () => {
    const xml = '<score-partwise><work><work-title>연습곡</work-title></work></score-partwise>'
    const bytes = zipSync({ 'META-INF/container.xml': container('parts/연습곡.xml'), 'parts/연습곡.xml': strToU8(xml), 'preview.pdf': new Uint8Array(100) })
    expect(decodeMusicXmlFile(bytes, 'score.xml')).toBe(xml)
  })

  it.each(['../outside.xml', '/absolute.xml', 'C:\\score.xml'])('rejects unsafe container path %s', (name) => {
    expect(() => decodeMusicXmlFile(zipSync({ 'META-INF/container.xml': container(name), [name]: strToU8('<score-partwise/>') }), 'score.mxl')).toThrow(/경로/)
  })

  it('rejects missing containers, missing roots and truncated archives', () => {
    expect(() => decodeMusicXmlFile(zipSync({ 'score.xml': strToU8('<score-partwise/>') }), 'score.mxl')).toThrow(/container/)
    expect(() => decodeMusicXmlFile(zipSync({ 'META-INF/container.xml': container('missing.xml') }), 'score.mxl')).toThrow(/root/)
    expect(() => decodeMusicXmlFile(new Uint8Array([80, 75, 3, 4]), 'score.mxl')).toThrow()
  })

  it('bounds both input and inflated score size before parsing', () => {
    expect(() => decodeMusicXmlFile(new Uint8Array(MAX_MUSICXML_BYTES + 1), 'score.xml')).toThrow(/32 MiB/)
    const oversized = zipSync({ 'META-INF/container.xml': container('score.xml'), 'score.xml': new Uint8Array(MAX_MUSICXML_BYTES + 1) })
    expect(() => decodeMusicXmlFile(oversized, 'score.mxl')).toThrow(/32 MiB/)
  })
})
