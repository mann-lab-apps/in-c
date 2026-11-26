import { appendFileSync } from 'node:fs'

export function createPhaseTrace(channel: string) {
  const output = process.env.STUDIO_CI_PHASE_FILE
  if (!output) return (_name: string) => {}
  const started = process.hrtime.bigint()
  let writable = true
  return (name: string) => {
    if (!writable) return
    const ms = Number(process.hrtime.bigint() - started) / 1e6
    try {
      appendFileSync(output, JSON.stringify({ channel, name, ms }) + '\n')
    } catch (error) {
      writable = false
      process.stderr.write('::warning::Could not record Studio test phases (' + channel + '): ' + String(error) + '\n')
    }
  }
}
