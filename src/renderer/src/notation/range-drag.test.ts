import { expect, it } from 'vitest'
import { createNotationRangeDrag } from './range-drag'

const address = { partId: 'p', staffId: 's', measureId: 'm1', voiceId: 'v' }
const first = { eventId: 'a', address }
const next = { eventId: 'b', address: { ...address, measureId: 'm2' } }

it('keeps the original pointer start across selection redraws without re-entering the same target', () => {
  const drag = createNotationRangeDrag(), score = {}
  drag.start(score, first)
  expect(drag.continue(score, { ...first })).toBeUndefined()
  expect(drag.continue(score, next)).toEqual(first)
  // A fresh node/listener for the same end is not another selection command.
  expect(drag.continue(score, { ...next })).toBeUndefined()
  expect(drag.continue(score, first)).toEqual(first)
  expect(drag.continue(score, next)).toEqual(first)
})
it('ignores foreign lanes without losing the original lane or collapsing address identity', () => {
  const drag = createNotationRangeDrag(), score = {}
  drag.start(score, first)
  for (const foreign of [{ ...address, partId: 'other' }, { ...address, staffId: 'lower' }, { ...address, voiceId: 'v2' }])
    expect(drag.continue(score, { eventId: 'b', address: foreign })).toBeUndefined()
  expect(drag.continue(score, next)).toEqual(first)
  expect(drag.continue(score, { ...next, address: { ...next.address, measureId: 'm3' } })).toEqual(first)
})
it('a cancelled gesture cannot be revived by a later held-button enter, while a fresh press starts a new gesture', () => {
  const drag = createNotationRangeDrag(), score = {}
  drag.start(score, first); drag.clear(score)
  expect(drag.continue(score, next)).toBeUndefined()
  drag.start(score, next)
  expect(drag.continue(score, first)).toEqual(next)
})
it('a replaced document/view cannot continue its predecessor and old cleanup cannot cancel a newer gesture', () => {
  const drag = createNotationRangeDrag(), oldScore = {}, newScore = {}
  drag.start(oldScore, first)
  expect(drag.continue(newScore, next)).toBeUndefined()
  drag.start(newScore, next); drag.clear(oldScore)
  expect(drag.continue(newScore, first)).toEqual(next)
  drag.clear()
  expect(drag.continue(newScore, next)).toBeUndefined()
})
