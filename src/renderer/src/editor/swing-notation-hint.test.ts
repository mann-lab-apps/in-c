import { expect, it } from 'vitest'
import { getSwingNotationHint } from './swing-notation-hint'

it.each(['eighth', '16th'] as const)('does not invent a conflict for a matching %s default cue and 2:1 playback', unit => {
  expect(getSwingNotationHint({ unit }, { unit, ratio: '2:1' })).toBeUndefined()
})
it('keeps the empty default and custom-text semantics aligned with the real notation renderer', () => {
  expect(getSwingNotationHint(undefined, undefined)).toBeUndefined()
  expect(getSwingNotationHint({ unit: 'eighth', text: '' }, undefined)).toContain('8분 · 2:1')
  expect(getSwingNotationHint({ unit: 'eighth', text: 'Swing' }, undefined)).toBe('리듬 해석 문구를 사용 중이지만 실제 스윙 재생은 꺼져 있습니다.')
  const custom = getSwingNotationHint({ unit: 'eighth', text: 'Swing' }, { unit: 'eighth', ratio: '3:2' })!
  expect(custom).toContain('3:2'); expect(custom).not.toContain('2:1')
})
it('describes an unavailable setting as stored rather than applied, even with a matching cue', () => {
  for (const notation of [undefined, { unit: 'eighth' as const }, { unit: 'eighth' as const, text: 'Swing' }]) {
    const hint = getSwingNotationHint(notation, { unit: 'eighth', ratio: '3:2' }, true)!
    expect(hint).toBe('저장된 스윙 재생 설정은 8분 · 3:2입니다. 현재 악보에서는 적용되지 않으며 표기는 그대로 유지됩니다.')
    expect(hint).not.toContain('실제 스윙 재생은')
  }
  expect(getSwingNotationHint(undefined, undefined, true)).toBeUndefined()
})
