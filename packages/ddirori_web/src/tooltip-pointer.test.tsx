import React from 'react'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { Button, Tooltip } from './index'

const show = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
const hide = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidePopover')
let stylesheet: HTMLStyleElement | undefined
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, value(this: HTMLElement) { this.style.display = 'block' } })
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', { configurable: true, value() {} })
})
afterEach(() => { cleanup(); stylesheet?.remove() })
afterAll(() => {
  if (show) Object.defineProperty(HTMLElement.prototype, 'showPopover', show)
  else delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover
  if (hide) Object.defineProperty(HTMLElement.prototype, 'hidePopover', hide)
  else delete (HTMLElement.prototype as Partial<HTMLElement>).hidePopover
})

describe('Tooltip informational pointer routing', () => {
  it.each(['음표 입력 전환', '재생'])('lets pointer input pass %s guidance while preserving hover and keyboard description', label => {
    stylesheet = document.createElement('style')
    // Use actual public rules; resource imports have no bearing on hit routing.
    // Native Electron QA uses the complete built stylesheet and real hit-tests.
    const source = [resolve(process.cwd(), 'packages/ddirori_web/src/styles.css'), resolve(process.cwd(), 'src/styles.css')].find(existsSync)
    if (!source) throw Error('Public component stylesheet not found from root/package test entry')
    stylesheet.textContent = readFileSync(source, 'utf8').replace(/^@import[^\n]+/gm, '')
    document.head.append(stylesheet)
    render(<div className="ddirori"><Tooltip text={`${label} 안내`}><Button onClick={() => {}}>{label}</Button></Tooltip></div>)
    const button = screen.getByRole('button', { name: label })
    act(() => button.focus())
    const tip = screen.getByRole('tooltip')
    expect(button.getAttribute('aria-describedby')).toBe(tip.id)
    expect(getComputedStyle(tip).pointerEvents).toBe('none')
    const host = button.closest<HTMLElement>('.dd-tooltip-wrap')!
    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 100, 32, 32))
    vi.spyOn(tip, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 60, 160, 40))
    fireEvent.mouseEnter(host)
    expect(getComputedStyle(screen.getByRole('tooltip')).pointerEvents).toBe('none')
    fireEvent.mouseLeave(host, { clientX: 60, clientY: 80 })
    fireEvent.mouseMove(document.body, { clientX: 60, clientY: 80 })
    expect(screen.getByRole('tooltip')).toBe(tip)
    fireEvent.mouseMove(document.body, { clientX: 300, clientY: 200 })
    expect(screen.queryByRole('tooltip')).toBeNull()
    act(() => { button.blur(); button.focus() })
    fireEvent.keyDown(button, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(document.activeElement).toBe(button)
  })
})
