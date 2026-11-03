import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { implicitChordFixture } from '../../../testing/implicit-chord-fixture'
import { createPlaybackTimeline } from '../playback/timeline'
import { serializeMidi } from '../midi/serialize-midi'
import { createStaveNote } from './NotationPreview'

beforeAll(() => {
  const out = process.env.DDIRORI_IMPLICIT_CHORD_QA_DIR
  if (!out) return
  for (const kind of ['key','preceding'] as const) {
    const fixture = implicitChordFixture(kind), dir = join(out,kind)
    mkdirSync(dir,{recursive:true})
    writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(fixture.source)))
    writeFileSync(join(dir,'expected.mid'),serializeMidi(fixture.explicit))
    writeFileSync(join(dir,'contract.json'),JSON.stringify({title:fixture.source.title,xmlNotes:fixture.xmlNotes,signs:fixture.signs,letter:fixture.letter,notesByBeat:fixture.notesByBeat},null,2))
  }
})
describe.each(['key','preceding'] as const)('implicit.chord $0', kind => {
  it('resolves every authoritative chord member for playback and full MIDI', () => {
    const {source,explicit} = implicitChordFixture(kind), before = structuredClone(source)
    expect(createPlaybackTimeline(source)).toEqual(createPlaybackTimeline(explicit))
    expect(serializeMidi(source)).toEqual(serializeMidi(explicit))
    expect(source).toEqual(before)
  })
  it('serializes key/preceding accidentals into XML with unchanged audible pitches', () => {
    const {source,explicit} = implicitChordFixture(kind), before = structuredClone(source)
    const parsed = parseMusicXml(serializeMusicXml(source))
    expect(serializeMidi(parsed)).toEqual(serializeMidi(explicit))
    expect(source).toEqual(before)
  })
  it('uses the same resolved VexFlow keys for single notes and implicit chord members', () => {
    const {source,keys} = implicitChordFixture(kind), measure = source.parts[0]!.staves[0]!.measures[0]!, voice = measure.voices[0]!
    expect(voice.events.map(event => createStaveNote(event,measure,voice,new Set()).getKeys())).toEqual(keys)
  })
})
