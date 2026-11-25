import { expect, it } from 'vitest'
import { Accidental, GraceNote, GraceNoteGroup, Modifier, Stave, StaveNote, Voice } from 'vexflow'
import { musicXmlOrderFixture } from '../../../testing/musicxml-order-fixture'
import { createStaveNote } from './NotationPreview'
import { formatNotationVoices } from './format-voices'
import { pitchStaffLine } from './system-layout'
import { formatSharedRhythm } from './shared-rhythm-layout'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { serializeMidi } from '../midi/serialize-midi'
import { createDuration, createMeasure, createNote, createRest, createTimePosition, createVoice, TICKS_PER_QUARTER } from '../../../score-core'

it.each([0, 1])('attaches real zero-rhythm grace glyphs on staff %i without changing the source or host duration', index => {
  const score=musicXmlOrderFixture('lower-grace'),measure=score.parts[0].staves[index].measures[0],voice=measure.voices[0]
  if(index===0) voice.events[0]={...score.parts[0].staves[1].measures[0].voices[0].events[0],id:'upper-host'}
  const event=voice.events[0],native=encodeNativeProject(createNativeProject(score)),midi=serializeMidi(score)
  const note=createStaveNote(event,measure,voice,new Set())
  const groups=note.getModifiers().filter((m):m is GraceNoteGroup=>m instanceof GraceNoteGroup)
  expect(groups).toHaveLength(1)
  const grace=groups[0].getGraceNotes()[0] as GraceNote
  expect(grace).toBeInstanceOf(GraceNote)
  expect(grace.getKeys()).toEqual(['d#/3'])
  expect(grace.getDuration()).toBe('8')
  expect(grace.getModifiers().filter(m=>m instanceof Accidental)).toHaveLength(1)
  const ordinary=createStaveNote({...event,graceNotes:undefined} as typeof event,measure,voice,new Set())
  expect(note.getTicks().value()).toBe(ordinary.getTicks().value())
  expect(note.getTicks().value()).toBe(new StaveNote({keys:['c/4'],duration:'w'}).getTicks().value())
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
  expect(serializeMidi(score)).toEqual(midi)
})

it.each([
  { hostAlter: 0 as const, hostMarks: 1 },
  { hostAlter: 1 as const, hostMarks: 0 }
])('spells the host after a sharp grace with $hostMarks host accidental', ({ hostAlter, hostMarks }) => {
  const event = createNote({
    id: 'host',
    pitch: { step: 'F', octave: 4, alter: hostAlter },
    duration: createDuration('whole'),
    graceNotes: [{ pitch: { step: 'F', octave: 4, alter: 1 }, slash: true }]
  })
  const voice = createVoice({ events: [event] })
  const measure = createMeasure({ voices: [voice] })
  const modifiers = createStaveNote(event, measure, voice, new Set()).getModifiers()
  const group = modifiers.find((modifier): modifier is GraceNoteGroup => modifier instanceof GraceNoteGroup)
  expect(group?.getGraceNotes()[0].getModifiers().filter(modifier => modifier instanceof Accidental)).toHaveLength(1)
  expect(modifiers.filter(modifier => modifier instanceof Accidental)).toHaveLength(hostMarks)
})

it('cancels a grace accidental at the next occurrence of its pitch, then suppresses the repeat mark', () => {
  const host = createNote({
    id: 'host',
    pitch: { step: 'C', octave: 4 },
    graceNotes: [{ pitch: { step: 'F', octave: 4, alter: 1 } }]
  })
  const notes = [1, 2].map(beat => createNote({
    id: `later-${beat}`,
    position: createTimePosition(beat * TICKS_PER_QUARTER),
    pitch: { step: 'F', octave: 4 }
  }))
  const voice = createVoice({ events: [host, ...notes] })
  const measure = createMeasure({ voices: [voice] })
  const drawn = notes.map(event => createStaveNote(event, measure, voice, new Set()))
  expect(drawn.map(note => note.getKeys())).toEqual([['f/4'], ['f/4']])
  expect(drawn.map(note => note.getModifiers().filter(modifier => modifier instanceof Accidental).length)).toEqual([1, 0])
})

it('engraves grace chord members together with separate accidental marks and leaves the next grace sequential', () => {
  const host = createNote({
    id: 'host',
    pitch: { step: 'C', octave: 4 },
    graceNotes: [
      { pitch: { step: 'D', octave: 5 }, slash: true },
      { pitch: { step: 'F', octave: 5, alter: 1 }, chord: true },
      { pitch: { step: 'E', octave: 5, alter: -1 } }
    ]
  })
  const voice = createVoice({ events: [host] })
  const measure = createMeasure({ voices: [voice] })
  const note = createStaveNote(host, measure, voice, new Set())
  const graceGroup = note.getModifiers().find(modifier => modifier instanceof GraceNoteGroup)
  const graces = graceGroup?.getGraceNotes()
  expect(graces?.map(grace => grace.getKeys())).toEqual([['d/5', 'f#/5'], ['eb/5']])
  const sharps = graces?.[0].getModifiers().filter(modifier => modifier instanceof Accidental)
  expect(sharps?.map(accidental => [accidental.type, accidental.getIndex()])).toEqual([['#', 1]])
  const hostWithSamePitch = { ...host, pitch: { step: 'F', octave: 5, alter: 1 } as const }
  const withoutRepeatedSharp = createStaveNote(hostWithSamePitch, measure, voice, new Set())
  expect(withoutRepeatedSharp.getModifiers().filter(modifier => modifier instanceof Accidental)).toEqual([])
})

it('engraves a trailing grace to the right without letting its accidental affect the host', () => {
  const host = createNote({
    id: 'host',
    pitch: { step: 'F', octave: 4, alter: 1 },
    graceNotes: [
      { pitch: { step: 'D', octave: 4 } },
      { pitch: { step: 'F', octave: 4, alter: 0 }, after: true }
    ]
  })
  const voice = createVoice({ events: [host] })
  const measure = createMeasure({ voices: [voice] })
  const note = createStaveNote(host, measure, voice, new Set())
  const groups = note.getModifiers().filter((modifier): modifier is GraceNoteGroup => modifier instanceof GraceNoteGroup)
  expect(groups.map(group => group.getPosition())).toEqual([Modifier.Position.LEFT, Modifier.Position.RIGHT])
  expect(groups[0].getGraceNotes()[0].getKeys()).toEqual(['d/4'])
  const trailingNote = groups[1].getGraceNotes()[0]
  expect(trailingNote.getKeys()).toEqual(['f/4'])
  expect(trailingNote.getModifiers().filter(modifier => modifier instanceof Accidental).map(modifier => modifier.type)).toEqual(['n'])
  expect(note.getModifiers().filter(modifier => modifier instanceof Accidental).map(modifier => modifier.type)).toEqual(['#'])
})


it.each([
  { layout: 'single stave', peerGrace: false },
  { layout: 'shared rhythm', peerGrace: false },
  { layout: 'single stave', peerGrace: true },
  { layout: 'shared rhythm', peerGrace: true }
])('places trailing graces after the last beat in $layout (peer grace: $peerGrace)', ({ layout, peerGrace }) => {
  const host = createNote({
    id: 'host', pitch: { step: 'F', octave: 4, alter: 1 }, duration: createDuration('whole'),
    graceNotes: [{ pitch: { step: 'F', octave: 4, alter: 0 }, after: true }]
  })
  const peer = (beat: number) => createNote({
    id: `peer-${beat}`, pitch: { step: beat === 0 ? 'A' : 'F', octave: 4 },
    position: createTimePosition(beat * TICKS_PER_QUARTER), duration: createDuration('half'),
    graceNotes: peerGrace && beat === 2 ? [{ pitch: { step: 'A', octave: 4 }, after: true }] : undefined
  })
  const measure = createMeasure({ keySignature: { fifths: 1 }, voices: [
    createVoice({ events: [host] }), createVoice({ id: 'voice-2', events: [peer(0), peer(2)] })
  ] })
  const before = structuredClone(measure)
  const stave = new Stave(0, 0, 200)
  const voices = measure.voices.map(voice => ({
    events: voice.events,
    notes: voice.events.map(event => createStaveNote(event, measure, voice, new Set()).setStave(stave))
  }))
  if (layout === 'shared rhythm') {
    formatSharedRhythm([{ stave, measure, voices }])
  } else {
    formatNotationVoices(voices.map(({ notes }) =>
      new Voice({ numBeats: 4, beatValue: 4 }).addTickables(notes)
    ), stave)
  }
  const principal = voices[0].notes[0]
  const later = voices[1].notes[1]
  const graces = (peerGrace ? [principal, later] : [principal]).map(owner => {
    const group = owner.getModifiers().find(modifier => modifier instanceof GraceNoteGroup)!
    expect(group.getNote()).toBe(owner)
    const notes = group.getGraceNotes()
    group.alignSubNotesWithNote(notes, owner, Modifier.Position.RIGHT)
    const grace = notes[0], head = grace.getAbsoluteX(), metrics = grace.getTickContext().getMetrics()
    return { left: head - metrics.totalLeftPx, right: head + metrics.notePx + metrics.totalRightPx }
  }).sort((first, second) => first.left - second.left)
  expect(graces[0].left).toBeGreaterThan(later.getNoteHeadEndX())
  if (peerGrace) expect(graces[1].left).toBeGreaterThan(graces[0].right)
  const closingGap = stave.getNoteEndX() - graces.at(-1)!.right
  expect(closingGap).toBeGreaterThan(0)
  expect(closingGap).toBeLessThanOrEqual(Stave.defaultPadding + 8)
  expect(measure).toEqual(before)
})

it('uses the other voice’s intervening accidental when engraving a trailing grace', () => {
  const host = createNote({
    id: 'host', pitch: { step: 'F', octave: 4, alter: 1 }, duration: createDuration('whole'),
    graceNotes: [{ pitch: { step: 'F', octave: 4, alter: 1 }, after: true }]
  })
  const peer = createVoice({ id: 'voice-2', events: [createNote({
    id: 'later-natural', pitch: { step: 'F', octave: 4, alter: 0 },
    duration: createDuration('half'), position: createTimePosition(2 * TICKS_PER_QUARTER)
  })] })
  const voice = createVoice({ events: [host] })
  const measure = createMeasure({ keySignature: { fifths: 1 }, voices: [voice, peer] })
  const note = createStaveNote(host, measure, voice, new Set())
  const group = note.getModifiers().find(modifier => modifier instanceof GraceNoteGroup)!
  const graceModifiers = group.getGraceNotes()[0].getModifiers()
  expect(graceModifiers.filter(modifier => modifier instanceof Accidental).map(modifier => modifier.type)).toEqual(['#'])
})

it.each(['F', 'G'] as const)('uses the written order of a trailing natural and an on-beat %s sharp', step => {
  const onset = createTimePosition(2 * TICKS_PER_QUARTER)
  const host = createNote({
    id: 'sustained-sharp', pitch: { step: 'F', octave: 4, alter: 1 }, duration: createDuration('half'),
    graceNotes: [{ pitch: { step: 'F', octave: 4, alter: 0 }, after: true }]
  })
  const sharp = createNote({ id: 'onset-sharp', position: onset, pitch: { step, octave: 4, alter: 1 } })
  const natural = createNote({ id: 'onset-natural', position: onset, pitch: { step: 'F', octave: 4, alter: 0 } })
  const leadingRest = (id: string) => createRest({ id, duration: createDuration('half') })
  const first = createVoice({ id: 'voice-1', events: [leadingRest('first-rest'), sharp] })
  const second = createVoice({ id: 'voice-2', events: [host] })
  const third = createVoice({ id: 'voice-3', events: [leadingRest('third-rest'), natural] })
  const measure = createMeasure({ voices: [first, second, third] })
  const accidentals = (note: Pick<StaveNote, 'getModifiers'>) =>
    note.getModifiers().filter(mark => mark instanceof Accidental).map(mark => mark.type)

  const group = createStaveNote(host, measure, second, new Set()).getModifiers().find(mark => mark instanceof GraceNoteGroup)!
  expect(accidentals(group.getGraceNotes()[0])).toEqual(['n'])
  expect(accidentals(createStaveNote(sharp, measure, first, new Set()))).toEqual(['#'])
  expect(accidentals(createStaveNote(natural, measure, third, new Set()))).toEqual(step === 'F' ? ['n'] : [])
})

it.each([
  { step: 'F', alter: 1, mainMarks: [] },
  { step: 'F', alter: 0, mainMarks: ['n'] },
  { step: 'G', alter: 1, mainMarks: ['#'] }
] as const)('spells the grace before an on-beat $step with alteration $alter', ({ step, alter, mainMarks }) => {
  const principal = createNote({ id: 'principal', pitch: { step, octave: 4, alter } })
  const host = createNote({
    id: 'host', pitch: { step: 'A', octave: 4 },
    graceNotes: [{ pitch: { step: 'F', octave: 4, alter: 1 } }]
  })
  const first = createVoice({ id: 'voice-1', events: [principal] })
  const second = createVoice({ id: 'voice-2', events: [host] })
  const measure = createMeasure({ voices: [first, second] })

  const group = createStaveNote(host, measure, second, new Set()).getModifiers().find(mark => mark instanceof GraceNoteGroup)!
  const grace = group.getGraceNotes()[0]
  expect(grace.getModifiers().filter(mark => mark instanceof Accidental).map(mark => mark.type)).toEqual(['#'])
  expect(createStaveNote(principal, measure, first, new Set()).getModifiers()
    .filter(mark => mark instanceof Accidental).map(mark => mark.type)).toEqual(mainMarks)
})

it.each([
  { shared: false, kind: 'single' },
  { shared: true, kind: 'single' },
  { shared: false, kind: 'sequence' },
  { shared: true, kind: 'sequence' },
  { shared: false, kind: 'chord' },
  { shared: true, kind: 'chord' }
])('separates final chromatic grace heads ($kind, shared: $shared)', ({ shared, kind }) => {
  const host = (id: string, step: 'A' | 'C', octave: number, alter: -1 | 1) => {
    const pitchBefore = step === 'A' ? { step: 'D', octave: 5 } as const : { step: 'B', octave: 4 } as const
    return createNote({
      id, pitch: { step, octave }, duration: createDuration('whole'),
      graceNotes: [
        ...(kind === 'sequence' ? [{ pitch: pitchBefore }] : []),
        { pitch: { step: 'F', octave: 4, alter } },
        ...(kind === 'chord' && step === 'A' ? [{ pitch: { step: 'C', octave: 5 }, chord: true } as const] : [])
      ]
    })
  }
  const stave = new Stave(8, 0, 420)
  const first = createVoice({ id: 'voice-1', events: [host('higher-grace', 'A', 4, 1)] })
  const second = createVoice({ id: 'voice-2', events: [host('lower-grace', 'C', 5, -1)] })
  const measure = createMeasure({ voices: [first, second] })
  const voices = measure.voices.map(voice => ({
    events: voice.events, notes: voice.events.map(event => createStaveNote(event, measure, voice, new Set()).setStave(stave))
  }))
  if (shared) formatSharedRhythm([{ stave, measure, voices }])
  else formatNotationVoices(voices.map(({ notes }) => new Voice({ numBeats: 4, beatValue: 4 }).addTickables(notes)), stave)
  const [upper, lower] = voices.map(({ notes: [principal] }) => {
    const group = principal.getModifiers().find(modifier => modifier instanceof GraceNoteGroup)!
    const graces = group.getGraceNotes()
    group.alignSubNotesWithNote(graces, principal, Modifier.Position.LEFT)
    const grace = graces.at(-1) as GraceNote
    return { x: grace.getAbsoluteX(), width: grace.getGlyphWidth(), host: principal.getTickContext() }
  })
  expect(upper.x + upper.width).toBeLessThan(lower.x)
  expect(upper.host).toBe(lower.host)
})


it.each([
  { sign: 'G' as const, line: 2, octaveChange: -1 },
  { sign: 'F' as const, line: 4, octaveChange: 1 },
  { sign: 'C' as const, line: 4, octaveChange: -1 },
  { sign: 'G' as const, line: 2, octaveChange: 2 },
  { sign: 'F' as const, line: 4, octaveChange: -2 }
])('uses the shifted $sign$line clef for pitches and graces without moving rests ($octaveChange)', clef => {
  const fixture = (octave: number, octaveChange: number) => {
    const event = createNote({
      id: 'chord',
      pitch: { step: 'C', octave },
      pitches: [{ step: 'C', octave }, { step: 'G', octave }],
      graceNotes: [{ pitch: { step: 'D', octave } }]
    })
    const voice = createVoice({ events: [event] })
    const measure = createMeasure({ clef: { ...clef, octaveChange }, voices: [voice] })
    const note = createStaveNote(event, measure, voice, new Set())
    const group = note.getModifiers().find(modifier => modifier instanceof GraceNoteGroup)!
    const rest = createMeasure().voices[0].events[0]
    return {
      chord: note.getKeyProps().map(({ line }) => line),
      grace: group.getGraceNotes()[0].getKeyProps().map(({ line }) => line),
      estimate: pitchStaffLine(event.pitch, measure.clef),
      rest: createStaveNote(rest, measure, voice, new Set()).getKeyProps().map(({ line }) => line)
    }
  }
  expect(fixture(4 + clef.octaveChange, clef.octaveChange)).toEqual(fixture(4, 0))
})
