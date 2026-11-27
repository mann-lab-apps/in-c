import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

type WaitForCondition = (predicate: () => boolean, message: string, timeoutMs?: number) => Promise<void>

// Run the same JavaScript that the packaged app injects into its renderer.
const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')
const waitBody = source.match(/const waitForConditionSource = `([\s\S]*?)`/)?.[1]
if (!waitBody) throw new Error('Packaged smoke wait function is missing')
const makeWait = new Function('performance', 'setTimeout', 'document', `return ${waitBody}`)

function smokeClock(wakeAfterMs: number, statusAfterWake: string) {
  let now = 0
  let status = '저장 중'
  const requestedDelays: number[] = []
  const document = {
    visibilityState: 'visible',
    querySelector: (selector: string) => (selector === '.editor-status' ? { textContent: status } : null)
  }
  const wait = makeWait({ now: () => now }, (wake: () => void, delay: number) => {
    requestedDelays.push(delay)
    now += wakeAfterMs
    status = statusAfterWake
    wake()
  }, document) as WaitForCondition

  return {
    wait,
    saved: () => status.endsWith('.chromatics에 저장했습니다.'),
    requestedDelays
  }
}

describe('packaged smoke wait', () => {
  it('accepts a condition already visible without scheduling a poll', async () => {
    const clock = smokeClock(50, 'fixture.chromatics에 저장했습니다.')

    await expect(clock.wait(() => true, 'Native UI save did not complete')).resolves.toBeUndefined()
    expect(clock.requestedDelays).toEqual([])
  })

  it.each([50, 1000, 1050])('recognizes a completed save when the poll wakes at %d ms', async wakeAfterMs => {
    const clock = smokeClock(wakeAfterMs, 'fixture.chromatics에 저장했습니다.')

    await expect(clock.wait(clock.saved, 'Native UI save did not complete')).resolves.toBeUndefined()
    expect(clock.requestedDelays).toEqual([50])
  })

  it('reports an incomplete save at the deadline with the current renderer diagnostics', async () => {
    const clock = smokeClock(1050, '저장 중')

    await expect(clock.wait(clock.saved, 'Native UI save did not complete')).rejects.toThrow(
      'Native UI save did not complete: 저장 중; visibility=visible; printing=false'
    )
    expect(clock.requestedDelays).toEqual([50])
  })
})
