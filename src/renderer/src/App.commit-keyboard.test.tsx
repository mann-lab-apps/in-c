// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { Profiler } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import sourceXml from '../../musicxml/fixtures/single-part-treble.musicxml?raw'
import { parseMusicXml } from '../../musicxml'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

describe('committed document keyboard lifetime', () => {
  registerAppTestHooks()

  it.each(['welcome', 'replacement'] as const)('uses the imported document for the first %s commit key, with exactly one undo', async entry => {
    if (entry === 'replacement') window.history.replaceState({}, '', '/?fixture=demo')
    const xml = sourceXml.replace('<type>quarter</type>', '<type>quarter</type><notations><technical><up-bow/></technical></notations>')
    const imported = parseMusicXml(xml)
    vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/committed.musicxml', fileName: 'committed.musicxml', contents: xml })
    let dispatched = false, handled = false
    const { App } = await import('./App')
    render(<Profiler id="document-commit" onRender={() => {
      if (dispatched || !document.querySelector('.studio-document') ||
        !document.querySelector('[aria-label="MusicXML 경고 상세"]')?.textContent?.includes('committed.musicxml')) return
      dispatched = true
      // Deliberately exercise commit-before-passive-effects, not a sleep or
      // waitFor retry of the command. No test-only controls enter the product.
      const key = new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', altKey: true, bubbles: true, cancelable: true })
      window.dispatchEvent(key); handled = key.defaultPrevented
    }}><App /></Profiler>)
    if (entry === 'replacement') openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
    await waitFor(() => expect(dispatched).toBe(true))
    expect(handled).toBe(true)
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(playbackMockState.lastScore?.id).toBe(imported.id)
    const edited = structuredClone(playbackMockState.lastScore)
    expect(edited).not.toEqual(imported)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(playbackMockState.lastScore).toEqual(imported)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(playbackMockState.lastScore).toEqual(imported)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(playbackMockState.lastScore).toEqual(edited)
  })
})
