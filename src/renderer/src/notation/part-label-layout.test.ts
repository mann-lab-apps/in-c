import { expect, it } from 'vitest'
import { resolvePartLabel } from './part-label-layout'

it('uses the real part name first and the explicit short name thereafter without rewriting source text', () => {
  const target=Object.freeze({partName:'  그랜드 피아노  ',partAbbreviation:' Pno. ',staffIndex:0})
  expect(resolvePartLabel(target,0)).toBe('  그랜드 피아노  ')
  expect(resolvePartLabel(target,1)).toBe(' Pno. ')
  expect(resolvePartLabel(target,4)).toBe(' Pno. ')
  expect(target).toEqual({partName:'  그랜드 피아노  ',partAbbreviation:' Pno. ',staffIndex:0})
})

it('omits absent short names and generic additional-staff labels, including the first system', () => {
  for(const partAbbreviation of [undefined,'','   ']){
    const target={partName:'Piano',partAbbreviation,staffIndex:0}
    expect(resolvePartLabel(target,0)).toBe('Piano')
    expect(resolvePartLabel(target,1)).toBeUndefined()
  }
  for(const staffIndex of [1,2])for(const systemIndex of [0,1,3])
    expect(resolvePartLabel({partName:'Piano',partAbbreviation:'Pno.',staffIndex},systemIndex)).toBeUndefined()
})
