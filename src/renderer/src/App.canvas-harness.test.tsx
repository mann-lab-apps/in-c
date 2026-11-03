// @vitest-environment jsdom
import { afterAll, describe, expect, it, vi } from 'vitest'
import type { EventEmitter } from 'node:events'
import { registerAppTestHooks } from './App.test-harness'

const originalContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext')

describe('App integration no-Canvas fixture boundary', () => {
  registerAppTestHooks()

  afterAll(() => {
    expect(Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext')).toEqual(originalContext)
  })

  it('keeps the null 2D fallback while retaining other context diagnostics', () => {
    const canvas = document.createElement('canvas')
    // Vitest's jsdom forwards to its host console, not the worker console.
    // Observe the public VirtualConsole without muting existing listeners.
    const virtualConsole = (globalThis as unknown as { jsdom: { virtualConsole: EventEmitter } }).jsdom.virtualConsole
    const diagnostic = vi.fn()
    virtualConsole.on('jsdomError', diagnostic)
    try {
      expect(canvas.getContext('2d')).toBeNull()
      expect(canvas.getContext('2d')).toBeNull()
      expect(diagnostic).not.toHaveBeenCalled()

      // This fixture is not a generic jsdom-error or Canvas-error filter.
      expect(canvas.getContext('webgl')).toBeNull()
      expect(diagnostic).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          type: 'not-implemented',
          message: expect.stringContaining("HTMLCanvasElement's getContext() method")
        })
      )
    } finally {
      virtualConsole.off('jsdomError', diagnostic)
    }
  })
})
