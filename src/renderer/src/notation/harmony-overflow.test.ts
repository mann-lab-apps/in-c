// @vitest-environment jsdom
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createNote, createScore } from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { serializeMidi } from '../midi/serialize-midi'
import { hasClippedNotationText, readHarmonyInk } from './lyric-overlap'

it('preserves a generated overlong imported chord label in native/XML without changing notes or MIDI', () => {
  const score = createScore({ title: 'Generated overlong harmony study' })
  const measure = score.parts[0].staves[0].measures[0]
  measure.voices[0].events = [createNote({ id: 'overlong-note', pitch: { step: 'C', octave: 4 }, duration: { value: 'whole', dots: 0 } })]
  score.harmonies = [{ id: 'overlong-harmony', measureId: measure.id, tick: 0,
    text: 'ImportedAnalysis'.repeat(12), root: { step: 'C' }, kind: 'other' }]
  const before = structuredClone(score), native = encodeNativeProject(createNativeProject(score)), xml = serializeMusicXml(score), midi = serializeMidi(score)
  expect(decodeNativeProject(native).score).toEqual(score)
  const imported = parseMusicXml(xml)
  expect(imported.harmonies?.[0].text).toBe(score.harmonies[0].text)
  expect(serializeMidi(imported)).toEqual(midi)
  expect(score).toEqual(before)
  const out = process.env.DDIRORI_HARMONY_OVERFLOW_QA_DIR
  if (out) {
    mkdirSync(out, { recursive: true })
    writeFileSync(join(out, 'source.chromatics'), native)
    writeFileSync(join(out, 'source.musicxml'), xml)
    writeFileSync(join(out, 'source.mid'), midi)
  }
})

it('reads actual chord text instead of hit surfaces and respects the SVG viewport without changing geometry', () => {
  const root = document.createElement('div')
  root.innerHTML = '<div class="notation-preview"><svg width="750"><rect class="notation-harmony-hit"/><text class="notation-harmony-mark" data-measure-id="m">Original analysis</text></svg></div>'
  const text = root.querySelector('.notation-harmony-mark') as SVGGraphicsElement
  text.getBBox = () => ({ x: 4, y: 10, width: 1773, height: 18 } as DOMRect)
  const ink = readHarmonyInk(root)
  expect(ink).toEqual([{ measureId: 'm', text: 'Original analysis', svg: root.querySelector('svg'), x: 4, y: 10, width: 1773, height: 18 }])
  const frozen = Object.freeze(ink.map(item => Object.freeze(item)))
  expect(hasClippedNotationText(frozen)).toBe(true)
  root.querySelector('svg')!.setAttribute('viewBox', '-10 0 1800 200')
  expect(hasClippedNotationText(frozen)).toBe(false)
  expect(ink[0]).toMatchObject({ x: 4, y: 10, width: 1773, height: 18 })
  expect(root.querySelector('.notation-harmony-hit')).toBeDefined()
})
