import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { decodeMusicXmlFile, encodeMusicXmlFile } from './container'
import { readMusicXmlFile } from '../main/musicxml-files'
import { parseMusicXml, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const score = '<score-partwise><work><work-title>intended</work-title></work></score-partwise>'
const alias = '<score-partwise><work><work-title>wrong raw alias</work-title></work></score-partwise>'
const mime = 'application/vnd.recordare.musicxml+xml'

function archive(path: string, files: Record<string, string>, options: { mime?: string; doctype?: string; laterRoot?: string } = {}) {
  const media = options.mime === undefined ? '' : ` media-type="${options.mime}"`
  const container = `${options.doctype ?? ''}<container><rootfiles><rootfile full-path="${path}"${media}/>${options.laterRoot ?? ''}</rootfiles></container>`
  return zipSync(Object.fromEntries(Object.entries({ 'META-INF/container.xml': container, ...files }).map(([name, xml]) => [name, strToU8(xml)])))
}

const paths = [
  { id: 'decimal', source: '&#115;core.musicxml', decoded: 'score.musicxml' },
  { id: 'hex', source: '&#x73;core.musicxml', decoded: 'score.musicxml' },
  { id: 'outer whitespace reference', source: '&#32;score.musicxml&#32;', decoded: 'score.musicxml' },
  { id: 'predefined amp', source: 'score&amp;part.musicxml', decoded: 'score&part.musicxml' },
  { id: 'angle names', source: '&lt;score&gt;&apos;.musicxml', decoded: "<score>'.musicxml" },
  { id: 'astral scalar', source: 'score&#x1D11E;.musicxml', decoded: 'score𝄞.musicxml' },
  { id: 'Unicode subdirectory', source: '&#54620;&#44544;/score.musicxml', decoded: '한글/score.musicxml' },
  { id: 'escaped numeric literal', source: 'score&amp;#115;.musicxml', decoded: 'score&#115;.musicxml' },
  { id: 'escaped invalid-looking literal', source: 'score&amp;#0;.musicxml', decoded: 'score&#0;.musicxml' },
  { id: 'escaped unsafe-looking literal', source: '&amp;#x2e;&amp;#x2e;/score.musicxml', decoded: '&#x2e;&#x2e;/score.musicxml' },
  { id: 'escaped unknown literal', source: 'score&amp;unknown;.musicxml', decoded: 'score&unknown;.musicxml' },
  { id: 'apostrophe and quotes', source: `a'b&quot;c&amp;d.musicxml`, decoded: `a'b"c&d.musicxml` },
  { id: 'literal double quote in single-quoted source', source: 'a"b&amp;c.musicxml', decoded: 'a"b&c.musicxml' }
]

describe('MXL rootfile XML attribute characters', () => {
  it.each(paths)('selects $id by XML value, never by raw spelling', ({ source, decoded, id }) => {
    // A literal quote is legal in a single-quoted XML attribute.
    let bytes = archive(source, { [decoded]: score, [source]: alias })
    if (id === 'literal double quote in single-quoted source') {
      bytes = zipSync({
        'META-INF/container.xml': strToU8(`<container><rootfiles><rootfile full-path='${source}'/></rootfiles></container>`),
        [decoded]: strToU8(score), [source]: strToU8(alias)
      })
    }
    expect(decodeMusicXmlFile(bytes, 'test.mxl')).toBe(score)
  })

  it('does not fall back to raw spelling when the decoded file is missing', () => {
    expect(() => decodeMusicXmlFile(archive('&#115;core.musicxml', { '&#115;core.musicxml': alias }), 'test.mxl')).toThrow(/root/)
  })

  it('decodes MIME references while preserving omitted and unknown MIME policies', () => {
    expect(decodeMusicXmlFile(archive('score.musicxml', { 'score.musicxml': score }, { mime: mime.replace('+', '&#43;') }), 'test.mxl')).toBe(score)
    expect(decodeMusicXmlFile(archive('score.musicxml', { 'score.musicxml': score }), 'test.mxl')).toBe(score)
    expect(() => decodeMusicXmlFile(archive('score.musicxml', { 'score.musicxml': score }, { mime: 'application/pdf' }), 'test.mxl')).toThrow(/MusicXML/)
    expect(() => decodeMusicXmlFile(archive('score.musicxml', { 'score.musicxml': score }, { mime: mime.replace('+', '&amp;#43;') }), 'test.mxl')).toThrow(/MusicXML/)
  })

  it.each([
    '&#x2e;&#x2e;/outside.musicxml', '&#47;absolute.musicxml', 'a&#92;b.musicxml', 'a&#58;b.musicxml',
    's&#0;core.musicxml', 's&#xD800;core.musicxml', 's&#1114112;core.musicxml', 's&#1;core.musicxml',
    's&unknown;core.musicxml', 's&nbsp;core.musicxml'
  ])('rejects unsafe or unresolved reference %s even with a matching raw alias', source => {
    expect(() => decodeMusicXmlFile(archive(source, { [source]: alias, 'score.musicxml': score }), 'test.mxl')).toThrow(/MXL/)
  })

  it('never resolves a DTD entity or treats its raw spelling as a filename', () => {
    const doctype = '<!DOCTYPE container [<!ENTITY root "score.musicxml">]>'
    expect(() => decodeMusicXmlFile(archive('&root;', { 'score.musicxml': score, '&root;': alias }, { doctype }), 'test.mxl')).toThrow(/MXL/)
    expect(decodeMusicXmlFile(archive('score.musicxml', { 'score.musicxml': score }, { doctype }), 'test.mxl')).toBe(score)
  })

  it('preserves the first-root rule without falling back to a later valid score', () => {
    const bytes = archive('missing.musicxml', { 'score.musicxml': score }, { laterRoot: '<rootfile full-path="score.musicxml"/>' })
    expect(() => decodeMusicXmlFile(bytes, 'test.mxl')).toThrow(/root/)
  })

  it('preserves actual disk read, native, XML and MIDI through an encoded root path', async () => {
    const xml = await readFile('src/musicxml/fixtures/release-qa.musicxml', 'utf8')
    const directory = await mkdtemp(join(tmpdir(), 'studio-mxl-character-'))
    try {
      const file = join(directory, 'encoded.mxl')
      await writeFile(file, archive('&#54620;&#44544;/score&amp;part.musicxml', { '한글/score&part.musicxml': xml }))
      const decoded = await readMusicXmlFile(file)
      expect(decoded).toBe(xml)
      const model = parseMusicXml(decoded), control = parseMusicXml(xml)
      expect(model).toEqual(control)
      expect(decodeNativeProject(encodeNativeProject(createNativeProject(model))).score).toEqual(control)
      expect(serializeMidi(model)).toEqual(serializeMidi(control))
      const copy = serializeMusicXml(model)
      expect(copy).toBe(serializeMusicXml(control))
      const saved = join(directory, 'saved.mxl')
      await writeFile(saved, encodeMusicXmlFile(copy, saved))
      expect(parseMusicXml(await readMusicXmlFile(saved))).toEqual(parseMusicXml(copy))
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
