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

function nativeOperationClock(completesAt: number, completion: string, initialStatus = '프로젝트를 저장하는 중입니다.') {
  let elapsed = 0
  const document = {
    visibilityState: 'visible',
    querySelector(selector: string) {
      if (selector === '.studio-document__state') {
        return { textContent: elapsed < completesAt ? '저장 중' : '변경 없음' }
      }
      if (selector.startsWith('.editor-status')) {
        return { textContent: elapsed < completesAt ? initialStatus : completion }
      }
      return null
    }
  }
  const wait = makeWait({ now: () => elapsed }, (wake: () => void, delay: number) => {
    elapsed += delay
    wake()
  }, document) as WaitForCondition

  return {
    elapsed: () => elapsed,
    run(message: string): Promise<void> {
      const call = source.split('\n').find(line => line.includes(`'${message}'`))?.trim()
      if (!call?.startsWith('await ')) throw new Error(`Packaged smoke operation not found: ${message}`)
      const helper = source.match(/const waitForNativeFileStatus = [\s\S]*?(?=\n          const labels)/)?.[0] ?? ''
      return new Function('waitForCondition', 'document', `${helper}\nreturn ${call.slice(6)}`)(wait, document)
    }
  }
}

describe('packaged Native file operation waits', () => {
  it.each([
    ['Native UI save did not complete', 'fixture.chromatics에 저장했습니다.'],
    ['Native UI reopen did not complete', 'fixture.chromatics을 열었습니다.'],
    ['Native backup UI recovery did not complete', '백업을 복구했습니다. 새 프로젝트 파일로 저장해 주세요.']
  ])('observes completion even when %s would have fired after one second', async (message, completion) => {
    const clock = nativeOperationClock(9100, completion)

    await expect(clock.run(message)).resolves.toBeUndefined()
    expect(clock.elapsed()).toBe(9100)
  })

  it('waits for the current save when the previous success message is still visible', async () => {
    const completion = 'fixture.chromatics에 저장했습니다.'
    const clock = nativeOperationClock(9100, completion, completion)

    await expect(clock.run('Native UI save did not complete')).resolves.toBeUndefined()
    expect(clock.elapsed()).toBe(9100)
  })

  it('retains a bounded failure with renderer diagnostics when a save stays pending', async () => {
    const clock = nativeOperationClock(Infinity, '')

    await expect(clock.run('Native UI save did not complete')).rejects.toThrow(
      'Native UI save did not complete: 프로젝트를 저장하는 중입니다.; visibility=visible; printing=false'
    )
    expect(clock.elapsed()).toBe(15_000)
  })
})
