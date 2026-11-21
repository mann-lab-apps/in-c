// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { StudioManual } from './StudioManual'
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute('open') } })
})
afterEach(cleanup)
it.each(['Space와 하이픈은 글자 입력', 'Enter는 다음 음표', 'MuseScore의 가사 입력 키와 다릅니다'])('makes the existing lyric key boundary explicit: %s', text => {
  render(<StudioManual theme="light" onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: '표기와 표현' }))
  expect(screen.getByRole('article', { name: '사용설명서 본문' })).toHaveTextContent(text)
})
