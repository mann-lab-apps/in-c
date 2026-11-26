import { expect, it } from 'vitest'
import { createPhaseTrace } from './metadata-ci-phase-probe'

it('records the completed case before the intentional timeout', () => {
  expect(1 + 1).toBe(2)
})

it('records the last phase of an intentional 15-second timeout', async () => {
  const phase = createPhaseTrace('intentional-timeout')
  phase('fixture started')
  phase('awaiting synthetic timeout')
  await new Promise<never>(() => {})
}, 15_000)
