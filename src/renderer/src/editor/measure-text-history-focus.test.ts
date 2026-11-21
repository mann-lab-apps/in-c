// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { restoreMeasureTextHistoryRequest } from './measure-text-history-focus'
const request = () => ({ family: 'harmonies', id: 'h1', generation: 1, viewKey: 'score', focus: true, sequence: 1,
  baseSelection: { type: 'measure', measureId: 'm1' }, returnSelection: { type: 'event', eventId: 'n1' } })
function note(inCanvas = true, connected = true) {
  const canvas = document.createElement('div'); if (inCanvas) canvas.className = 'score-canvas'
  const node = document.createElement('button'); node.className = 'notation-event'
  for (const key of ['event', 'part', 'staff', 'measure', 'voice']) node.setAttribute(`data-${key}-id`, key + '-one')
  canvas.append(node); if (connected) document.body.append(canvas)
  return node
}
afterEach(() => document.body.replaceChildren())
it.each(['harmonies', 'staffTexts', 'systemTexts', 'expressionTexts', 'rehearsalMarks', 'dynamics'])('suppresses only the obsolete %s field request while preserving selection references', family => {
  const restored = Object.freeze({ ...request(), family }), current = { ...restored, focus: false, sequence: 2 }
  const result = restoreMeasureTextHistoryRequest(restored, current, note())!
  expect(result).toEqual({ ...restored, focus: false })
  expect(result).not.toBe(restored); expect(result.baseSelection).toBe(restored.baseSelection)
  expect(result.returnSelection).toBe(restored.returnSelection); expect(result.sequence).toBe(1)
  expect(restored.focus).toBe(true); expect(current.focus).toBe(false)
})
it.each([{ id: 'other' }, { family: 'dynamics' }, { generation: 2 }, { viewKey: 'part:p2' }])('keeps the existing changed-owner policy for %j', change => {
  const restored = request(); expect(restoreMeasureTextHistoryRequest(restored, { ...restored, ...change }, note())).toBe(restored)
})
it('keeps selection restoration and an already passive request unchanged', () => {
  const restored = request(), origin = note(), passive = { ...restored, focus: false }
  expect(restoreMeasureTextHistoryRequest(undefined, restored, origin)).toBeUndefined()
  expect(restoreMeasureTextHistoryRequest(restored, undefined, origin)).toBe(restored)
  expect(restoreMeasureTextHistoryRequest(passive, passive, origin)).toBe(passive)
})
it.each(['field', 'span', 'preview', 'outside-canvas', 'detached', 'null'])('does not change history started from %s', kind => {
  const restored = request()
  const origin = kind === 'null' ? null : kind === 'field' ? document.body.appendChild(document.createElement('input')) : note(kind !== 'outside-canvas', kind !== 'detached')
  if (kind === 'span') origin!.className = 'notation-span-target'
  if (kind === 'preview') origin!.classList.add('is-preview')
  expect(restoreMeasureTextHistoryRequest(restored, restored, origin)).toBe(restored)
})
it.each(['event', 'part', 'staff', 'measure', 'voice'])('requires the native note %s owner', key => {
  const restored = request(), origin = note(); origin.removeAttribute(`data-${key}-id`)
  expect(restoreMeasureTextHistoryRequest(restored, restored, origin)).toBe(restored)
})

it.each(['staffTexts', 'systemTexts', 'expressionTexts', 'rehearsalMarks'])('handles the actual implicit %s field-entry request without changing its owner references', family => {
  const { focus: _focus, ...restored } = request()
  const implicit = { ...restored, family }, current = { ...implicit, sequence: 2 }
  expect(implicit).not.toHaveProperty('focus')
  const result = restoreMeasureTextHistoryRequest(implicit, current, note())!
  expect(result).toEqual({ ...implicit, focus: false })
  expect(result.baseSelection).toBe(implicit.baseSelection)
  expect(result.returnSelection).toBe(implicit.returnSelection)
  expect(implicit).not.toHaveProperty('focus')
})
