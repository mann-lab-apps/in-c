import { mkdirSync,writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll,describe,expect,it } from 'vitest'
import { applyScoreCommand,buildTieCommand,collectTiePairs,validateTieRelations } from '../../../score-core'
import { createNativeProject,decodeNativeProject,encodeNativeProject } from '../../../project/schema'
import { parseMusicXml,serializeMusicXml,serializeMusicXmlWithReport } from '../../../musicxml'
import { createReorderedWholeChordTieScore, createUnequalChordTieScore, createWholeChordTieScore } from '../../../testing/chord-tie-fixture'
import { createPlaybackTimeline } from '../playback/timeline'
import { serializeMidi,serializeMidiWithReport } from '../midi/serialize-midi'
beforeAll(()=>{
  const unequalOut = process.env.DDIRORI_UNEQUAL_TIE_QA_DIR
  if (unequalOut) for (const kind of ['changed-member', 'fewer-members', 'changed-alter'] as const) {
    const score = createUnequalChordTieScore(kind), dir = join(unequalOut, kind)
    mkdirSync(dir, { recursive: true })
    const second = score.parts[0].staves[0].measures[1].voices[0].events[0]
    const stops = second.type === 'note' ? second.pitches!.length : 0
    writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
    writeFileSync(join(dir, 'expected.mid'), serializeMidi(createReorderedWholeChordTieScore(false)))
    writeFileSync(join(dir, 'contract.json'), JSON.stringify({ systems: 1, tiePaths: 1, heads: 3 + stops, xmlStart: 3, xmlStop: stops }))
  }
  const out=process.env.DDIRORI_CHORD_TIE_QA_DIR;if(!out)return
  for(const cross of [false,true])for(const chord of [true,false]){
    const score=createWholeChordTieScore(cross,chord),dir=join(out,`${chord?'':'single-'}${cross?'cross':'same'}`);mkdirSync(dir,{recursive:true})
    writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(score)))
    writeFileSync(join(dir,'expected.mid'),serializeMidi(score))
    writeFileSync(join(dir,'contract.json'),JSON.stringify({systems:cross?2:1,tiePaths:(cross?2:1)*(chord?2:1),heads:chord?4:2},null,2))
  }
})
describe.each([false,true])('whole-chord ties cross-system=%s',cross=>{
  it('uses the existing valid whole-event tie with both pitches held,XML/native and exact undo',()=>{
    const score=createWholeChordTieScore(cross),before=structuredClone(score)
    expect(validateTieRelations(score)).toEqual([])
    expect(collectTiePairs(score)).toEqual([{fromEventId:'chord-tie-1',toEventId:'chord-tie-2'}])
    const timeline=createPlaybackTimeline(score);expect(timeline.events).toHaveLength(1)
    expect(timeline.events[0]).toMatchObject({startBeat:0,durationBeats:8,frequencies:[261.6255653005986,329.6275569128699]})
    expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score))
    expect(serializeMidi(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score)).toEqual(serializeMidi(score))
    const command=buildTieCommand(score,'chord-tie-1',false)!;expect(command).toBeDefined()
    const changed=applyScoreCommand(score,command);expect(collectTiePairs(changed.score)).toEqual([])
    expect(applyScoreCommand(changed.score,changed.undo).score).toEqual(before)
    expect(score).toEqual(before)
  })
})

// Regression coverage for the single-note counterpart;the existing product model already supports it.
describe.each([false,true])('single-note tie spacing counterpart cross=%s',cross=>{
  it('retains one held pitch and exact native/XML/undo before any spacing decision',()=>{
    const score=createWholeChordTieScore(cross,false),before=structuredClone(score)
    expect(validateTieRelations(score)).toEqual([])
    expect(createPlaybackTimeline(score).events).toHaveLength(1)
    expect(createPlaybackTimeline(score).events[0]).toMatchObject({startBeat:0,durationBeats:8,frequencies:[261.6255653005986]})
    expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score))
    const result=applyScoreCommand(score,buildTieCommand(score,'chord-tie-1',false)!)
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(before)
    expect(score).toEqual(before)
  })
})

// Same-pitch multiset is the existing whole-event model, not partial-chord ties.
describe.each([false, true])('reordered whole-chord ties cross=%s', cross => {
  it('keeps all three authored pitches, one tie pair and native/XML/MIDI/undo', () => {
    const score = createReorderedWholeChordTieScore(cross), before = structuredClone(score)
    expect(validateTieRelations(score)).toEqual([])
    expect(collectTiePairs(score)).toHaveLength(1)
    const timeline = createPlaybackTimeline(score)
    expect(timeline.events).toHaveLength(1)
    expect(timeline.events[0]).toMatchObject({ startBeat: 0, durationBeats: 8 })
    expect(timeline.events[0].frequencies).toHaveLength(3)
    expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score))
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
    const removed = applyScoreCommand(score, buildTieCommand(score, 'chord-tie-1', false)!)
    expect(applyScoreCommand(removed.score, removed.undo).score).toEqual(before)
    expect(score).toEqual(before)
    const out = process.env.DDIRORI_CHORD_TIE_QA_DIR
    if (out) {
      const dir = join(out, cross ? 'reordered-cross' : 'reordered-same')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
      writeFileSync(join(dir, 'expected.mid'), serializeMidi(score))
      writeFileSync(join(dir, 'contract.json'), JSON.stringify({ systems: cross ? 2 : 1, tiePaths: cross ? 6 : 3, heads: 6 }))
    }
  })
})


describe.each([false, true])('reordered primary whole-chord ties cross=%s', cross => {
  it('creates one whole-event tie and retains all pitches through playback/XML/native', () => {
    const score = createReorderedWholeChordTieScore(cross, true)
    for (const m of score.parts[0].staves[0].measures) {
      const note = m.voices[0].events[0]
      if (note.type !== 'note') throw Error('Expected note fixture')
      delete note.ties
    }
    const before = structuredClone(score), command = buildTieCommand(score, 'chord-tie-1', true)
    expect(command).toBeDefined()
    const applied = applyScoreCommand(score, command!)
    expect(validateTieRelations(applied.score)).toEqual([])
    expect(collectTiePairs(applied.score)).toHaveLength(1)
    expect(applyScoreCommand(applied.score, applied.undo).score).toEqual(before)
    expect(score).toEqual(before)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(applied.score))).score).toEqual(applied.score)
    expect(serializeMidi(parseMusicXml(serializeMusicXml(applied.score))))
      .toEqual(serializeMidi(createReorderedWholeChordTieScore(cross)))
  })

  it('sustains the same pitch multiset when the first stored member changes', () => {
    const score = createReorderedWholeChordTieScore(cross, true), before = structuredClone(score)
    const timeline = createPlaybackTimeline(score)
    expect(timeline.events).toHaveLength(1)
    expect(timeline.events[0]).toMatchObject({ durationBeats: 8, tiedEvents: [{ eventId: 'chord-tie-2', measureId: 'chord-tie-measure-2' }] })
    expect(serializeMidi(score)).toEqual(serializeMidi(createReorderedWholeChordTieScore(cross)))
    expect(score).toEqual(before)
    const out = process.env.DDIRORI_CHORD_TIE_QA_DIR
    if (out) {
      const dir = join(out, cross ? 'primary-cross' : 'primary-same'); mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
      writeFileSync(join(dir, 'expected.mid'), serializeMidi(createReorderedWholeChordTieScore(cross)))
      writeFileSync(join(dir, 'contract.json'), JSON.stringify({ systems: cross ? 2 : 1, tiePaths: cross ? 6 : 3, heads: 6 }))
    }
  })
})


describe.each(['changed-member', 'fewer-members', 'changed-alter'] as const)('unequal chord policy %s', kind => {
  it('rejects new ties while keeping legacy native ties removable with one undo', () => {
    const score = createUnequalChordTieScore(kind), before = structuredClone(score)
    expect(validateTieRelations(score)).toEqual([]) // Preserve existing native compatibility.
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(before)
    const removed = applyScoreCommand(score, buildTieCommand(score, 'chord-tie-1', false)!)
    expect(buildTieCommand(removed.score, 'chord-tie-1', true)).toBeUndefined()
    expect(buildTieCommand(removed.score, 'chord-tie-2', true)).toBeUndefined()
    expect(applyScoreCommand(removed.score, removed.undo).score).toEqual(before)
    expect(score).toEqual(before)
  })

  it('reports legacy loss without changing MIDI/XML bytes or source data', () => {
    const score = createUnequalChordTieScore(kind), before = structuredClone(score)
    const xml = serializeMusicXmlWithReport(score), midi = serializeMidiWithReport(score)
    const expected = { code: 'unsupported-chord-tie', measureId: 'chord-tie-measure-1', measureNumber: 1 }
    expect(xml.report.warnings).toEqual([expect.objectContaining(expected)])
    expect(midi.warnings).toEqual([expect.objectContaining(expected)])
    expect(xml.contents).toBe(serializeMusicXml(score))
    // Preserve the legacy byte stream, but no longer silently imply correctness.
    expect(midi.bytes).toEqual(serializeMidi(createReorderedWholeChordTieScore(false)))
    expect(score).toEqual(before)
  })
})


it('unequal chord policy skips an incompatible previous chord for a valid following chord', () => {
  const score = createUnequalChordTieScore('changed-member')
  const measures = score.parts[0].staves[0].measures
  const next = structuredClone(measures[1]); next.id = 'next-valid'; next.number = 3
  next.voices[0].events[0].id = 'next-valid-note'; measures.push(next)
  for (const m of measures) { const n = m.voices[0].events[0]; if (n.type === 'note') delete n.ties }
  const before = structuredClone(score), command = buildTieCommand(score, 'chord-tie-2', true)
  expect(command).toBeDefined()
  const applied = applyScoreCommand(score, command!)
  expect(collectTiePairs(applied.score)).toEqual([{ fromEventId: 'chord-tie-2', toEventId: 'next-valid-note' }])
  expect(applyScoreCommand(applied.score, applied.undo).score).toEqual(before)
})
