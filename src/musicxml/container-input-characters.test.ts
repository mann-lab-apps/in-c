import { expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { decodeMusicXmlFile, encodeMusicXmlFile } from './container'
import { readMusicXmlFile } from '../main/musicxml-files'
import { createExpressionOwnerFixture } from '../testing/expression-owner-fixture'
import { parseMusicXml, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const scoreXml = createExpressionOwnerFixture('grand-staff').xml
const roots = (path = 'score.musicxml') => `<rootfiles><rootfile full-path="${path}" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles>`
const invalid = [
  ...[0, 1, 11, 31, 0xFFFE].map(code => ({
    id: `literal attribute ${code}`, xml: `<container version="a${String.fromCodePoint(code)}b">${roots()}</container>`
  })),
  { id: 'literal comment', xml: `<container><!--a\u0001b-->${roots()}</container>` },
  ...[0, 1, 0xD800, 0x110000].map(code => ({
    id: `unselected attribute reference ${code}`, xml: `<container version="a&#${code};b">${roots()}</container>`
  })),
  { id: 'unselected text reference', xml: `<container><extra>a&#0;b</extra>${roots()}</container>` },
  { id: 'explicit XML 1.0', xml: `<?xml version="1.0"?><container version="a&#0;b">${roots()}</container>` }
]
function archive(container: string, path = 'score.musicxml') {
  return zipSync({ 'META-INF/container.xml': strToU8(container), [path]: strToU8(scoreXml) })
}

it.each(invalid)('rejects invalid XML 1.0 container characters before opening the score: $id', ({ xml }) => {
  expect(() => decodeMusicXmlFile(archive(xml), 'source.mxl')).toThrow(/XML 1\.0/)
})

const controls = [
  { id: 'Hangul and astral path', xml: `<container version="한글🎵">${roots('한글🎵.musicxml')}</container>`, path: '한글🎵.musicxml' },
  { id: 'discouraged valid scalar', xml: `<container version="a&#xFDD0;b">${roots()}</container>` },
  { id: 'escaped literal', xml: `<container version="a&amp;#0;b">${roots()}</container>` },
  { id: 'CDATA reference-like literal', xml: `<container><![CDATA[a&#0;b]]>${roots()}</container>` },
  { id: 'comment reference-like literal', xml: `<container><!--a&#0;b-->${roots()}</container>` },
  { id: 'literal tab normalization', xml: `<container>${roots('score\tpart.musicxml')}</container>`, path: 'score part.musicxml' },
  { id: 'explicit referenced tab', xml: `<container>${roots('score&#9;part.musicxml')}</container>`, path: 'score\tpart.musicxml' },
  { id: 'existing XML 1.1 behavior', xml: `<?xml version="1.1"?><container version="a&#1;b">${roots()}</container>` }
]
it.each(controls)('preserves valid input and existing non-1.0 scope: $id', ({ xml, path }) => {
  expect(decodeMusicXmlFile(archive(xml, path), 'source.mxl')).toBe(scoreXml)
})

it('rejects an actual malformed disk input without rewriting it or affecting the next valid native/XML/MIDI round trip', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'studio-mxl-character-guard-'))
  try {
    const source = join(directory, 'invalid.mxl'), bytes = archive(invalid[0].xml)
    await writeFile(source, bytes)
    await expect(readMusicXmlFile(source)).rejects.toThrow(/XML 1\.0/)
    expect(await readFile(source)).toEqual(Buffer.from(bytes))
    const valid = join(directory, 'valid.mxl')
    await writeFile(valid, archive(controls[0].xml, controls[0].path))
    const score = parseMusicXml(await readMusicXmlFile(valid)), expected = parseMusicXml(scoreXml)
    expect(score).toEqual(expected)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score)
      .toEqual(JSON.parse(JSON.stringify(expected)))
    const copy = serializeMusicXml(score), copyFile = join(directory, 'copy.mxl')
    await writeFile(copyFile, encodeMusicXmlFile(copy, copyFile))
    expect(await readMusicXmlFile(copyFile)).toBe(copy)
    expect(serializeMidi(score)).toEqual(serializeMidi(expected))
    expect(await readFile(source)).toEqual(Buffer.from(bytes))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
