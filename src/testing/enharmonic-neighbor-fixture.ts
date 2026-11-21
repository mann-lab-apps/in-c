import { createScore, createPart, createStaff, createMeasure, createVoice, createNote, createRest, createDuration, TICKS_PER_QUARTER as Q, type Pitch, type Score } from '../score-core'

export type EnharmonicNeighborKind = 'sharp' | 'flat' | 'natural' | 'key' | 'chord' | 'explicit'

export function createEnharmonicNeighborFixture(kind: EnharmonicNeighborKind): { score: Score; expectedLeading: Pitch; expectedPins: Record<string, Pitch['alter']> } {
  const sharp: Pitch = { step: 'C', octave: 4, alter: 1 }, c: Pitch = { step: 'C', octave: 4 }, d: Pitch = { step: 'D', octave: 4 }
  const pitches: Pitch[] = kind === 'flat' ? [{ step: 'D', octave: 4, alter: -1 }, d, c, { step: 'D', octave: 4, alter: 0 }]
    : kind === 'natural' ? [{ step: 'C', octave: 4, alter: 0 }, c, { step: 'B', octave: 3 }, { step: 'B', octave: 3, alter: -1 }]
    : kind === 'key' ? [{ step: 'F', octave: 4 }, { step: 'F', octave: 4 }, { step: 'G', octave: 4 }, { step: 'F', octave: 4, alter: 0 }]
    : kind === 'explicit' ? [sharp, { ...c, alter: 1 }, { ...d, alter: 0 }, { ...c, alter: 0 }]
    : [sharp, c, d, { ...c, alter: 0 }]
  const events = pitches.map((pitch, index) => createNote({ id: index === 0 ? 'qa-leading' : `qa-neighbor-${index}`, pitch: { ...pitch }, position: { tick: index * Q }, duration: createDuration('quarter') }))
  events[0].lyrics = [{ number: 1, text: '표기', syllabic: 'single' }]
  events[1].articulations = ['staccato']
  if (kind === 'chord') {
    const upper: Pitch[] = [{ step: 'E', octave: 4, alter: 1 }, { step: 'E', octave: 4 }, { step: 'F', octave: 4 }, { step: 'E', octave: 4, alter: 0 }]
    events.forEach((note, index) => { note.pitches = [note.pitch, upper[index]] })
  }
  const measure = createMeasure({ id: 'qa-measure-1', number: 1, keySignature: { fifths: kind === 'key' ? 1 : 0 }, voices: [
    createVoice({ id: 'voice-1', events }),
    createVoice({ id: 'voice-2', events: [createRest({ id: 'qa-other-voice', duration: createDuration('whole') })] })
  ] })
  const following = createMeasure({ id: 'qa-measure-2', number: 2, voices: [createVoice({ id: 'voice-1', events: [createNote({ id: 'qa-next-measure', pitch: { step: 'C', octave: 4 }, duration: createDuration('whole') })] })] })
  const score = createScore({ id: 'qa-enharmonic-neighbor', title: '이명동음 이웃음 보존', parts: [createPart({ id: 'qa-part', name: 'Piano', staves: [createStaff({ id: 'qa-staff', measures: [measure, following] })] })], slurs: [{ id: 'qa-manual-slur', startEventId: events[0].id, endEventId: events[3].id, engraving: { offsetY: 0, height: 4 } }] })
  const expectedLeading: Pitch = kind === 'flat' ? sharp : kind === 'natural' ? { step: 'B', octave: 3, alter: 1 } : kind === 'key' ? { step: 'G', octave: 4, alter: -1 } : { step: 'D', octave: 4, alter: -1 }
  const expectedPins: Record<string, Pitch['alter']> = kind === 'flat' ? { 'qa-neighbor-1': -1, 'qa-neighbor-2': 0 } : kind === 'natural' ? { 'qa-neighbor-2': 0 } : kind === 'key' ? { 'qa-neighbor-2': 0 } : kind === 'explicit' ? {} : { 'qa-neighbor-1': 1, 'qa-neighbor-2': 0 }
  return { score, expectedLeading, expectedPins }
}
