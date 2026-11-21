// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Dot, Modifier, Stave, StaveNote, Voice } from 'vexflow'
import { formatNotationVoices } from './format-voices'
import { clearSameStaffRestHeadCollisions } from './voice-rest-clearance'

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ font: '', measureText: (text: string) => ({
    width: 12, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 12,
    actualBoundingBoxAscent: text === '\ue4e5' ? 20 : 5, actualBoundingBoxDescent: text === '\ue4e5' ? 10 : 5
  }) } as unknown as CanvasRenderingContext2D)
})
afterEach(() => vi.restoreAllMocks())

it.each([['f/4', -1], ['g/5', 1]] as const)('moves only the colliding rendered rest away from %s and remains idempotent (rest direction %s)', (pitch, direction) => {
  const stave = new Stave(0, 0, 400).addClef('treble')
  const pitched = new StaveNote({ keys: [pitch], duration: 'q', stemDirection: -direction })
  const rest = new StaveNote({ keys: ['b/4'], duration: 'qr', stemDirection: direction })
  const make = (note: StaveNote) => new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT).addTickables([note])
  // Keep the upper role first, as the actual renderer's voice ordering does.
  const voices = direction < 0 ? [{ voiceId: 'voice-1', notes: [pitched] }, { voiceId: 'voice-2', notes: [rest] }]
    : [{ voiceId: 'voice-1', notes: [rest] }, { voiceId: 'voice-2', notes: [pitched] }]
  formatNotationVoices(voices.map(v => make(v.notes[0])), stave)
  // Normal Voice.draw assigns the stave before resolving absolute head positions.
  // Compare prepared drawing coordinates rather than an unassigned x=0.
  pitched.setStave(stave); rest.setStave(stave)
  rest.setKeyStyle(0, { fillStyle: '#123456' })
  const oldLine = rest.getKeyLine(0), noteLine = pitched.getKeyLine(0), x = pitched.getNoteHeadBeginX(), ticks = rest.getTicks().toString()
  expect(clearSameStaffRestHeadCollisions(voices, stave)).toBe(1)
  expect((rest.getKeyLine(0) - oldLine) * direction).toBeGreaterThan(0)
  expect(pitched.getKeyLine(0)).toBe(noteLine); expect(pitched.getNoteHeadBeginX()).toBe(x); expect(rest.getTicks().toString()).toBe(ticks)
  expect(rest.noteHeads[0].getStyle()).toEqual({ fillStyle: '#123456' })
  expect(clearSameStaffRestHeadCollisions(voices, stave)).toBe(0)
})
it('leaves a single voice and its existing rest position untouched', () => {
  const rest = new StaveNote({ keys: ['b/4'], duration: 'qr' }), stave = new Stave(0, 0, 400)
  const before = rest.getKeyLine(0)
  expect(clearSameStaffRestHeadCollisions([{ voiceId: 'voice-1', notes: [rest] }], stave)).toBe(0)
  expect(rest.getKeyLine(0)).toBe(before)
})
it.each([['f/4', -1], ['g/5', 1]] as const)('keeps the attached duration dot with the displaced %s rest', (pitch, direction) => {
  const stave = new Stave(0, 0, 400).addClef('treble')
  const pitched = new StaveNote({ keys: [pitch], duration: 'qd', stemDirection: -direction })
  const rest = new StaveNote({ keys: ['b/4'], duration: 'qdr', stemDirection: direction })
  Dot.buildAndAttach([pitched, rest])
  const make = (note: StaveNote) => new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT).addTickables([note])
  const voices = direction < 0 ? [{ voiceId: 'voice-1', notes: [pitched] }, { voiceId: 'voice-2', notes: [rest] }]
    : [{ voiceId: 'voice-1', notes: [rest] }, { voiceId: 'voice-2', notes: [pitched] }]
  formatNotationVoices(voices.map(v => make(v.notes[0])), stave)
  pitched.setStave(stave); rest.setStave(stave)
  const oldDotStart = rest.getModifierStartXY(Modifier.Position.RIGHT, 0)
  const oldHeadY = rest.getYs()[0], ticks = rest.getTicks().toString()
  expect(clearSameStaffRestHeadCollisions(voices, stave)).toBe(1)
  const newDotStart = rest.getModifierStartXY(Modifier.Position.RIGHT, 0)
  expect(newDotStart.y - oldDotStart.y).toBeCloseTo(rest.getYs()[0] - oldHeadY, 6)
  expect(newDotStart.x).toBe(oldDotStart.x)
  expect(Dot.getDots(rest)).toHaveLength(1); expect(rest.getTicks().toString()).toBe(ticks)
})
