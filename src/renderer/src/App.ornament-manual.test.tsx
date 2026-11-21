// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it('explains each ornament performance scope in the actual Help handbook without a score command', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { App } = await import('./App'); render(<App />)
  const before = structuredClone(playbackMockState.lastScore)
  fireEvent.click(screen.getByRole('button', { name: '도움말' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '사용설명서' }))
  const dialog = await screen.findByRole('dialog', { name: '띠로리 Studio 사용설명서' })
  fireEvent.change(within(dialog).getByRole('searchbox', { name: '사용설명서 검색' }), { target: { value: '모르덴트' } })
  fireEvent.click(within(dialog).getByRole('button', { name: /트릴·모르덴트·턴과 트레몰로$/ }))
  const article = within(dialog).getByRole('article', { name: '사용설명서 본문' })
  for (const label of ['모르덴트', '프랄트릴러', '턴']) {
    const row = within(article).getByRole('row', { name: new RegExp('^' + label + ' ') })
    expect(row).toHaveTextContent('별도 음열 없음·본음 유지')
    expect(row).toHaveTextContent('표기·저장 지원')
  }
  expect(within(article).getByRole('row', { name: /^트릴 / })).toHaveTextContent('보조음과 교대')
  const midiHelp = within(article).getByRole('link', { name: 'MIDI 손실 안내' })
  expect(midiHelp).toHaveAttribute('href', '#manual-files-midi')
  fireEvent.click(midiHelp)
  expect(article.querySelector('[data-manual-anchor="midi"]')).toBeInTheDocument()
  fireEvent.keyDown(dialog, { key: 'Escape' })
  expect(playbackMockState.lastScore).toEqual(before)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(screen.getByRole('button', { name: '도움말' })).toHaveFocus()
})
