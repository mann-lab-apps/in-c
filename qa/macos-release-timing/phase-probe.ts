import { appendFileSync } from 'node:fs'

export function createPhaseTrace(channel: string) {
  const output = process.env.STUDIO_CI_PHASE_FILE
  if (!output) throw new Error('A phase trace output path is required')
  const started = process.hrtime.bigint()
  return (name: string) => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6
    appendFileSync(output, JSON.stringify({ channel, name, ms }) + '\n')
  }
}
