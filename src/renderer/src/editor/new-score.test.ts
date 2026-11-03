import { describe, expect, it } from 'vitest'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { toVexFlowKeySignature } from '../notation/vexflow-adapter'

import { createNewScore, keySignaturePresets, resolveKeySignaturePreset, resolveKeySignaturePresetId } from './new-score'

const commonOptions = {
  title: 'New Work',
  composer: 'Composer',
  keySignature: { fifths: 0, mode: 'major' as const },
  timeSignature: { beats: 4, beatType: 4 },
  measureCount: 4,
  tempo: 96
}

describe('new score setup', () => {
  it('score-setup.create-grand-staff-score creates a piano part with treble and bass staves', () => {
    const score = createNewScore({
      ...commonOptions,
      templateId: 'piano-grand-staff'
    })

    expect(score.parts).toHaveLength(1)
    expect(score.parts[0]).toMatchObject({
      id: 'part-1',
      name: 'Piano',
      abbreviation: 'Pno.'
    })
    expect(score.parts[0].staves).toHaveLength(2)
    expect(
      score.parts[0].staves.map((staff) => staff.measures[0].clef)
    ).toEqual([
      { sign: 'G', line: 2 },
      { sign: 'F', line: 4 }
    ])
    expect(score.parts[0].staves[1].measures[0].id).toBe(
      'part-1-staff-2-measure-1'
    )
  })

  it('score-setup.create-ensemble-score creates a four-part string quartet skeleton', () => {
    const score = createNewScore({
      ...commonOptions,
      templateId: 'string-quartet'
    })

    expect(score.parts.map((part) => part.name)).toEqual([
      'Violin I',
      'Violin II',
      'Viola',
      'Cello'
    ])
    expect(score.parts.map((part) => part.staves.length)).toEqual([1, 1, 1, 1])
    expect(
      score.parts.map((part) => part.staves[0].measures[0].clef)
    ).toEqual([
      { sign: 'G', line: 2 },
      { sign: 'G', line: 2 },
      { sign: 'C', line: 3 },
      { sign: 'F', line: 4 }
    ])
    expect(
      score.parts.flatMap((part) =>
        part.staves.flatMap((staff) =>
          staff.measures.map((measure) => measure.id)
        )
      )
    ).toHaveLength(new Set(
      score.parts.flatMap((part) =>
        part.staves.flatMap((staff) =>
          staff.measures.map((measure) => measure.id)
        )
      )
    ).size)
  })
})


describe('score-setup.full-key-signature-inventory', () => {
  it('offers every supported fifths/mode pair without moving the existing defaults or IDs', () => {
    expect(keySignaturePresets.map(preset => preset.id).slice(0,14)).toEqual([
      'c-major','a-minor','g-major','e-minor','d-major','b-minor','a-major',
      'f-sharp-minor','f-major','d-minor','bb-major','g-minor','eb-major','c-minor'
    ])
    expect(keySignaturePresets).toHaveLength(30)
    expect(new Set(keySignaturePresets.map(preset => preset.id)).size).toBe(30)
    for(let fifths=-7;fifths<=7;fifths++)for(const mode of ['major','minor'] as const){
      const matching=keySignaturePresets.filter(preset => preset.value.fifths===fifths&&preset.value.mode===mode)
      expect(matching,`${fifths} ${mode}`).toHaveLength(1)
      const preset=matching[0]!
      expect(resolveKeySignaturePresetId({fifths,mode})).toBe(preset.id)
      expect(resolveKeySignaturePreset(preset.id).value).toEqual({fifths,mode})
      const score=createNewScore({...commonOptions,templateId:'piano-grand-staff',keySignature:preset.value})
      for(const staff of score.parts[0].staves)for(const measure of staff.measures)expect(measure.keySignature).toEqual({fifths,mode})
    }
    expect(resolveKeySignaturePreset('not-supported').id).toBe('c-major')
  })
  it('round-trips all supported choices through native/MusicXML and maps them to real engraving keys', () => {
    const major=['Cb','Gb','Db','Ab','Eb','Bb','F','C','G','D','A','E','B','F#','C#']
    const minor=['Abm','Ebm','Bbm','Fm','Cm','Gm','Dm','Am','Em','Bm','F#m','C#m','G#m','D#m','A#m']
    for(let fifths=-7;fifths<=7;fifths++)for(const mode of ['major','minor'] as const){
      const preset=resolveKeySignaturePreset(resolveKeySignaturePresetId({fifths,mode}))
      expect(preset.value).toEqual({fifths,mode})
      const source=createNewScore({...commonOptions,keySignature:preset.value})
      expect(decodeNativeProject(encodeNativeProject(createNativeProject(source))).score).toEqual(source)
      const parsed=parseMusicXml(serializeMusicXml(source))
      for(const part of parsed.parts)for(const staff of part.staves)for(const measure of staff.measures)expect(measure.keySignature).toEqual({fifths,mode})
      expect(toVexFlowKeySignature(preset.value)).toBe((mode==='major'?major:minor)[fifths+7])
    }
  })
  it('keeps omitted mode distinct from an explicit major or minor without guessing a preset', () => {
    for(const fifths of [-7,0,4]){
      const keySignature={fifths}
      expect(resolveKeySignaturePresetId(keySignature)).toBe('unspecified-mode')
      expect(keySignature).toEqual({fifths})
      expect(resolveKeySignaturePresetId({...keySignature,mode:'major'})).not.toBe('unspecified-mode')
      expect(resolveKeySignaturePresetId({...keySignature,mode:'minor'})).not.toBe('unspecified-mode')
    }
  })
  it('distinguishes E major, its relative minor and enharmonic seven-signature extremes', () => {
    for(const [id,fifths,mode,label] of [
      ['e-major',4,'major','마장조 (♯ 4개)'],['c-sharp-minor',4,'minor','올림다단조 (♯ 4개)'],
      ['c-sharp-major',7,'major','올림다장조 (♯ 7개)'],['a-sharp-minor',7,'minor','올림가단조 (♯ 7개)'],
      ['cb-major',-7,'major','내림다장조 (♭ 7개)'],['ab-minor',-7,'minor','내림가단조 (♭ 7개)']
    ] as const)expect(resolveKeySignaturePreset(id)).toEqual({id,label,value:{fifths,mode}})
  })
})
