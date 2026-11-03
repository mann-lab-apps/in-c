import { createRequire } from 'node:module'
import { expect, it } from 'vitest'
const { parseNotationSnapshotOptions: parse } = createRequire(import.meta.url)('./notation-snapshot-options.cjs')

it.each([
  ['--profile=studio-r3', '--profile=unknown'],
  ['--profile=studio-r3', '--profile=studio-r3'],
  ['--profile', 'studio-r3', '--update'],
  ['--profil=studio-r3', '--update'],
  ['--profile=studio-r3', '--capture-profil'],
  ['--update', '--update']
])('rejects ambiguous/unknown snapshot arguments before any baseline write: %j', (...args) => {
  expect(() => parse(args)).toThrow(/argument|option|profile|duplicate/i)
})
it.each([
  ['--profile=unknown'], ['--capture-profile'],
  ['--profile=studio-r3', '--update'], ['--profile=studio-r3', '--fixed-canvas'],
  ['--fixed-canvas', '--update']
])('rejects incompatible snapshot modes: %j', (...args) => {
  expect(() => parse(args)).toThrow()
})
it('keeps legacy verification/update, fixed engraving and candidate capture distinct', () => {
  expect(parse([])).toMatchObject({shouldUpdate:false,fixedCanvas:false,studioProfile:false,captureProfile:false})
  expect(parse(['--update'])).toMatchObject({shouldUpdate:true,studioProfile:false})
  expect(parse(['--fixed-canvas'])).toMatchObject({fixedCanvas:true,shouldUpdate:false})
  expect(parse(['--profile=studio-r3'])).toMatchObject({studioProfile:true,captureProfile:false})
  expect(parse(['--profile=studio-r3','--capture-profile'])).toMatchObject({studioProfile:true,captureProfile:true,shouldUpdate:false})
})
