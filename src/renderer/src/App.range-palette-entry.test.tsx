// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
async function open() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { App } = await import('./App'); render(<App />)
  fireEvent.click(within(screen.getByRole('navigation', { name: '앱 메뉴' })).getByRole('button', { name: '추가' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '범위 기호 팔레트' }))
}
it('studio.range-palette-entry names the existing slur hairpin and octave surface by its whole scope', async () => {
  await open(); fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' })); const original = structuredClone(playbackMockState.lastScore)
  const button = screen.getByRole('button', { name: '범위 기호 설정 열기' })
  expect(button).toBeVisible(); fireEvent.click(button)
  const panel = screen.getByRole('region', { name: '범위 기호' })
  for (const name of ['8va', '8vb', '15ma', '15mb', '크레셴도 헤어핀']) expect(within(panel).getByRole('button', { name })).toBeVisible()
  await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))
  expect(playbackMockState.lastScore).toEqual(original); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it.each(['슬러', '헤어핀', '옥타브', '8va', '8vb', '15ma', '15mb'])('studio.range-palette-entry retains the %s search route', async query => {
  await open(); fireEvent.change(screen.getByRole('searchbox', { name: '표기 기호 검색' }), { target: { value: query } })
  const family = document.querySelector<HTMLElement>('.studio-notation-palette__family[data-family="범위 기호"]')
  expect(family).not.toBeNull()
  const button = within(family!).getByRole('button', { name: /설정 열기$/ })
  expect(button).toBeVisible(); fireEvent.click(button)
  expect(within(screen.getByRole('region', { name: '범위 기호' })).getByRole('button', { name: '8va' })).toBeVisible()
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
