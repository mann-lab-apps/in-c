import { expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { decodeMusicXmlFile, encodeMusicXmlFile } from './container'
import { readMusicXmlFile } from '../main/musicxml-files'
import { parseMusicXml, serializeMusicXml } from './index'
import { createExpressionOwnerFixture } from '../testing/expression-owner-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const intended = createExpressionOwnerFixture('grand-staff').xml.replace('표현 글자 보표 소유권', 'Intended root')
const alias = intended.replace('Intended root', 'Raw whitespace alias').replace('<step>C</step>', '<step>G</step>')
const cases = [
  ...(['tab', 'lf', 'cr', 'crlf'] as const).map(id => ({
    id,
    raw: `score${({ tab: '\t', lf: '\n', cr: '\r', crlf: '\r\n' })[id]}part.musicxml`,
    normalized: 'score part.musicxml',
    alias: `score${id === 'tab' ? '\t' : '\n'}part.musicxml`,
    changesLiteralWhitespace: true
  })),
  { id: 'mixed-amp', raw: 'dir\tname/score&amp;part.musicxml', normalized: 'dir name/score&part.musicxml', alias: 'dir\tname/score&part.musicxml', changesLiteralWhitespace: true },
  { id: 'mixed-escaped', raw: 'dir\tname/score&amp;#x9;part.musicxml', normalized: 'dir name/score&#x9;part.musicxml', alias: 'dir\tname/score&#x9;part.musicxml', changesLiteralWhitespace: true },
  { id: 'plain-space', raw: 'score part.musicxml', normalized: 'score part.musicxml', alias: 'other.musicxml', changesLiteralWhitespace: false },
  { id: 'ncr-space', raw: 'score&#x20;part.musicxml', normalized: 'score part.musicxml', alias: 'score&#x20;part.musicxml', changesLiteralWhitespace: false },
  { id: 'escaped-literal', raw: 'score&amp;#x9;part.musicxml', normalized: 'score&#x9;part.musicxml', alias: 'other.musicxml', changesLiteralWhitespace: false }
]

function archive(row: typeof cases[number], missing = false) {
  return zipSync({
    'META-INF/container.xml': strToU8(`<container><rootfiles><rootfile full-path="${row.raw}" media-type="application/vnd.recordare.musicxml+xml"/>${missing ? '<rootfile full-path="later.musicxml"/>' : ''}</rootfiles></container>`),
    ...(!missing ? { [row.normalized]: strToU8(intended) } : { 'later.musicxml': strToU8(intended) }),
    [row.alias]: strToU8(alias)
  })
}

it.each(cases)('reads XML-normalized literal attribute whitespace before references: $id', row => {
  expect(decodeMusicXmlFile(archive(row), 'root.mxl')).toBe(intended)
})

it.each(cases.filter(row => row.changesLiteralWhitespace))('never falls back to a raw whitespace alias or later root: $id', row => {
  expect(() => decodeMusicXmlFile(archive(row, true), 'root.mxl')).toThrow(/root/)
})

it.each([9, 10, 13])('retains the existing explicit character reference %i instead of normalizing its decoded value', code => {
  const row = {
    id: `reference-${code}`,
    raw: `score&#${code};part.musicxml`,
    normalized: `score${String.fromCharCode(code)}part.musicxml`,
    alias: 'score part.musicxml',
    changesLiteralWhitespace: false
  }
  expect(decodeMusicXmlFile(archive(row), 'root.mxl')).toBe(intended)
})

it('preserves actual disk input, full Native, music and canonical MXL output for the intended root', async () => {
  const row = cases[0], directory = await mkdtemp(join(tmpdir(), 'studio-mxl-literal-'))
  try {
    const input = join(directory, 'source.mxl'), bytes = archive(row)
    await writeFile(input, bytes)
    const xml = await readMusicXmlFile(input)
    expect(xml).toBe(intended)
    expect(await readFile(input)).toEqual(Buffer.from(bytes))
    const score = parseMusicXml(xml), expected = parseMusicXml(intended)
    expect(score).toEqual(expected)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score)
      .toEqual(JSON.parse(JSON.stringify(expected)))
    expect(serializeMidi(score)).toEqual(serializeMidi(expected))
    const output = join(directory, 'copy.mxl'), copy = serializeMusicXml(score)
    await writeFile(output, encodeMusicXmlFile(copy, output))
    expect(await readMusicXmlFile(output)).toBe(copy)
    expect(parseMusicXml(copy)).toEqual(parseMusicXml(serializeMusicXml(expected)))
    expect(await readFile(input)).toEqual(Buffer.from(bytes))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
