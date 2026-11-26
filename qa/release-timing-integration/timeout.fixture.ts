import { chmodSync } from 'node:fs'
import { expect, it } from 'vitest'
import { createPhaseTrace } from './metadata-ci-phase-probe'

it('studio.metadata-save-feedback keeps blocked copy fixture editable', () => {
  const phase = createPhaseTrace('copy')
  phase('begin')
  expect(1 + 1).toBe(2)
  phase('complete')
})

it('studio.metadata-save-feedback keeps blocked save fixture awaiting intentional timeout', async () => {
  const phase = createPhaseTrace('save')
  phase('begin')
  phase('fixture ready')
  if (process.env.STUDIO_QA_FREEZE_PHASES === '1') {
    chmodSync(process.env.STUDIO_CI_PHASE_FILE!, 0o444)
  }
  phase('awaiting synthetic timeout')
  await new Promise<never>(() => {})
}, 15_000)
