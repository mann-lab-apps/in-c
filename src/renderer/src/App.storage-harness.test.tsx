// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { installLocalStorageStub } from './App.test-harness'

const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
afterEach(() => {
  if (original) Object.defineProperty(window, 'localStorage', original)
  else Reflect.deleteProperty(window, 'localStorage')
})

function provide(value: unknown) {
  Object.defineProperty(window, 'localStorage', { configurable: true, value })
}

function expectMemoryStorage() {
  const storage = window.localStorage
  expect(storage.length).toBe(0)
  storage.setItem('first', 'one')
  storage.setItem('second', 2 as unknown as string)
  expect(storage.length).toBe(2)
  expect(storage.key(0)).toBe('first')
  expect(storage.key(1)).toBe('second')
  expect(storage.key(2)).toBeNull()
  expect(storage.getItem('second')).toBe('2')
  storage.setItem('first', 'updated')
  expect(storage.length).toBe(2)
  expect(storage.key(0)).toBe('first')
  expect(storage.getItem('first')).toBe('updated')
  storage.removeItem('first')
  expect(storage.getItem('first')).toBeNull()
  expect(storage.key(0)).toBe('second')
  storage.clear()
  expect(storage.length).toBe(0)
  expect(storage.getItem('second')).toBeNull()
}

it.each([
  { name: 'truthy empty object', value: {} },
  { name: 'partial callable API', value: { clear: vi.fn(), length: 0 } },
  { name: 'non-callable API', value: { clear: 'not a method', length: 0 } }
])('test-storage replaces $name instead of failing App setup before the test body', ({ value }) => {
  provide(value)
  installLocalStorageStub()
  expect(window.localStorage).not.toBe(value)
  expectMemoryStorage()
})

it('test-storage retains the existing unavailable-storage fallback', () => {
  provide(undefined)
  installLocalStorageStub()
  expectMemoryStorage()
})

it('test-storage handles an opaque-origin getter without accessing persistent storage', () => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get: () => { throw new DOMException('Opaque origin', 'SecurityError') }
  })
  installLocalStorageStub()
  expectMemoryStorage()
})

it('test-storage keeps a complete existing API and its values by identity', () => {
  provide(undefined)
  installLocalStorageStub()
  const available = window.localStorage
  available.setItem('existing', 'keep')
  installLocalStorageStub()
  expect(window.localStorage).toBe(available)
  expect(window.localStorage.getItem('existing')).toBe('keep')
})
