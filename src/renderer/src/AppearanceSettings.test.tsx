// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppearanceSettings, appearanceStorageKey, readAppearance } from './AppearanceSettings'

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value) })
  })
  document.documentElement.className = ''
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('product appearance', () => {
  it('uses validated defaults for corrupt and unknown stored values', () => {
    for (const value of ['{', 'null', '[]', '{"theme":"purple","density":"tiny"}']) {
      localStorage.setItem(appearanceStorageKey, value)
      expect(readAppearance()).toEqual({ theme: 'light', density: 'compact' })
    }
  })
  it('restores and persists only appearance without touching score storage', () => {
    localStorage.setItem('score', 'untouched')
    localStorage.setItem(appearanceStorageKey, '{"theme":"dark","density":"comfortable"}')
    render(<AppearanceSettings />)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).toHaveAttribute('data-density', 'comfortable')
    fireEvent.change(screen.getByLabelText('화면 테마'), { target: { value: 'light' } })
    expect(readAppearance().theme).toBe('light')
    expect(localStorage.getItem('score')).toBe('untouched')
  })
  it('applies settings in memory if storage fails and reports the failure', () => {
    render(<AppearanceSettings />)
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw Error('quota') })
    fireEvent.change(screen.getByLabelText('도구 간격'), { target: { value: 'comfortable' } })
    expect(document.documentElement).toHaveAttribute('data-density', 'comfortable')
    expect(screen.getByRole('status')).toHaveTextContent('저장하지 못했습니다')
  })
  it('survives unavailable storage on initial load', () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => { throw Error('blocked') })
    render(<AppearanceSettings />)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })
  it('does not propagate editor shortcuts and Escape restores trigger focus', () => {
    const key = vi.fn()
    render(<div onKeyDown={key}><AppearanceSettings /></div>)
    const trigger = screen.getByLabelText('화면 설정')
    const details = trigger.closest('details')!
    details.open = true
    screen.getByLabelText('화면 테마').focus()
    fireEvent.keyDown(screen.getByLabelText('화면 테마'), { key: 'n' })
    expect(key).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByLabelText('화면 테마'), { key: 'Escape' })
    expect(details.open).toBe(false)
    expect(trigger).toHaveFocus()
  })
  it('restores the host attributes when unmounted', () => {
    document.documentElement.dataset.theme = 'old'
    const { unmount } = render(<AppearanceSettings />)
    unmount()
    expect(document.documentElement).not.toHaveClass('ddirori')
    expect(document.documentElement).toHaveAttribute('data-theme', 'old')
  })
})
