import { expect, it } from 'vitest'
import { validatePngExport, withPngResolution } from './png'
const png = () => new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64'))
it('writes one physical-resolution chunk while preserving image data and replacing earlier DPI', () => {
  const source = png(), original = new Uint8Array(source)
  const result = withPngResolution(source, 300)
  expect(source).toEqual(original)
  expect(result.slice(33,41)).toEqual(new Uint8Array([0,0,0,9,112,72,89,115]))
  expect(new DataView(result.buffer).getUint32(41)).toBe(11811)
  expect(new DataView(result.buffer).getUint32(45)).toBe(11811)
  expect(result[49]).toBe(1)
  expect(result.slice(54)).toEqual(source.slice(33))
  const replaced = withPngResolution(result, 150)
  expect(replaced.length).toBe(result.length)
  expect(new DataView(replaced.buffer).getUint32(41)).toBe(5906)
  expect(replaced.slice(54)).toEqual(source.slice(33))
})
it('snapshots PNG bytes and ordered page numbers before any asynchronous dialog', () => {
  const bytes = png(), input = { suggestedName: '악보', pages: [{ pageNumber: 3, bytes }] }
  const snapshot = validatePngExport(input)
  bytes[0] = 0
  expect(snapshot.pages[0].bytes[0]).toBe(137)
  expect(snapshot.pages[0].pageNumber).toBe(3)
})
it('rejects path injection, invalid pages, truncation and excessive dimensions', () => {
  const valid = { suggestedName: 'score', pages: [{ pageNumber: 1, bytes: png() }] }
  expect(() => validatePngExport({ ...valid, suggestedName: '../other' })).toThrow()
  expect(() => validatePngExport({ ...valid, pages: [] })).toThrow()
  expect(() => validatePngExport({ ...valid, pages: [valid.pages[0], valid.pages[0]] })).toThrow()
  expect(() => validatePngExport({ ...valid, pages: [{ pageNumber: 0, bytes: png() }] })).toThrow()
  expect(() => validatePngExport({ ...valid, pages: [{ pageNumber: 1, bytes: png().slice(0, -1) }] })).toThrow()
  const huge = png();huge.set([127,255,255,255], 16)
  expect(() => validatePngExport({ ...valid, pages: [{ pageNumber: 1, bytes: huge }] })).toThrow()
})
