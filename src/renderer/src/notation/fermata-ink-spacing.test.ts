import { describe, expect, it } from 'vitest'
import { resolveFermataInkOffset } from './fermata-ink-spacing'

describe('automatic fermata actual notehead clearance', () => {
  const fermata = { x: 107.18259716033936, y: 110.3564453125, width: 12.681012153625488, height: 8.765625 }
  it('clears the reproduced ledger chord while preserving the input bounds', () => {
    const notes = [{ x: 109.6, y: 115, width: 17, height: 10 }, { x: 109.6, y: 125, width: 17, height: 10 }], before = structuredClone({fermata, notes})
    const offset = resolveFermataInkOffset(fermata, notes)
    expect(offset).toBe(-12.13)
    expect(fermata.y + fermata.height + offset).toBeLessThanOrEqual(115 - 8)
    expect({fermata, notes}).toEqual(before)
  })
  it('keeps an already clear ordinary-register baseline', () => {
    expect(resolveFermataInkOffset({...fermata, y: 75.3564453125}, [{x:109.6,y:115,width:17,height:10}])).toBe(0)
  })
  it('uses every chord member and ignores nonoverlapping horizontal ink', () => {
    const higher = {x:109.6,y:90,width:17,height:10}
    expect(resolveFermataInkOffset(fermata, [{...higher,x:300}])).toBe(0)
    expect(resolveFermataInkOffset(fermata, [higher])).toBe(-37.13)
  })
  it('preserves exact clearance and empty or unavailable measurements', () => {
    expect(resolveFermataInkOffset(fermata, [])).toBe(0)
    expect(resolveFermataInkOffset(fermata, [{x:109.6,y:fermata.y+fermata.height+8,width:17,height:10}])).toBe(0)
    expect(resolveFermataInkOffset({...fermata,width:0}, [{x:109,y:0,width:17,height:10}])).toBe(0)
    expect(resolveFermataInkOffset(fermata, [{x:109,y:NaN,width:17,height:10}])).toBe(0)
  })
  it('associates the reproduced ordinary mark with actual staff ink instead of Stave origin', () => {
    const mark = { x: 221.8225965499878, y: 37.3564453125, width: 12.681012153625488, height: 8.765625 }
    const before = structuredClone(mark)
    const offset = resolveFermataInkOffset(mark, [], 112)
    expect(offset).toBe(57.87)
    expect(112 - (mark.y + mark.height + offset)).toBeGreaterThanOrEqual(8)
    expect(112 - (mark.y + mark.height + offset)).toBeLessThan(8.01)
    expect(mark).toEqual(before)
  })
  it('uses the lower staff and actual ledger-note obstacle without changing glyph size', () => {
    const lower = { x: 260.3825788497925, y: 185.00643920898438, width: 12.681012153625488, height: 8.765625 }
    const offset = resolveFermataInkOffset(lower, [{ x: 262.84, y: 279.65, width: 11.8, height: 10 }], 259.65)
    expect(259.65 - (lower.y + lower.height + offset)).toBeGreaterThanOrEqual(8)
    expect(259.65 - (lower.y + lower.height + offset)).toBeLessThan(8.01)
    const high = { ...lower, y: 95.3564453125 }
    const highOffset = resolveFermataInkOffset(high, [{ x: 262.84, y: 125, width: 11.8, height: 10 }], 170)
    expect(125 - (high.y + high.height + highOffset)).toBeGreaterThanOrEqual(8)
    expect(125 - (high.y + high.height + highOffset)).toBeLessThan(8.01)
  })
  it('keeps real stem and beam edges clear while ignoring horizontally unrelated ink', () => {
    const mark = { x: 100, y: 35, width: 13, height: 9 }
    const ink = [{ x: 108, y: 92, width: 1.5, height: 35 }, { x: 108, y: 86, width: 50, height: 5 }, { x: 300, y: 20, width: 20, height: 10 }]
    const before = structuredClone(ink)
    expect(resolveFermataInkOffset(mark, ink, 112)).toBe(34)
    expect(mark.y + mark.height + 34).toBe(86 - 8)
    expect(ink).toEqual(before)
  })
  it('keeps the fermata outside its owned staccato without moving the articulation', () => {
    const mark = { x: 221.8225965499878, y: 37.3564453125, width: 12.681012153625488, height: 8.765625 }
    const dot = { x: 225.1799774169922, y: 56.900001525878906, width: 6.199999809265137, height: 6.199999809265137 }
    const before = structuredClone(dot)
    const offset = resolveFermataInkOffset(mark, [dot], 112)
    expect(offset).toBe(2.77)
    expect(dot.y - (mark.y + mark.height + offset)).toBeGreaterThanOrEqual(8)
    expect(dot.y - (mark.y + mark.height + offset)).toBeLessThan(8.01)
    expect(dot).toEqual(before)
  })
})
