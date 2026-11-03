// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { StudioPartLabels } from './StudioPartLabels'
import { partLabelSaveDraftFixture, partLabelSaveDraftKinds } from '../../testing/part-label-save-draft-fixture'

afterEach(cleanup)
const guidance = 'Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'
const modifiers = [{ ctrlKey: true }, { metaKey: true }, { ctrlKey: true, shiftKey: true }, { metaKey: true, shiftKey: true }]
it.each(partLabelSaveDraftKinds.flatMap(kind => modifiers.map(modifier => ({ kind, modifier }))))('studio.part-label-save-draft $kind with $modifier keeps trimming/fallback and one commit', ({ kind, modifier }) => {
  const data = partLabelSaveDraftFixture(kind), command = vi.fn(), save = vi.fn()
  function Host() {
    const [part, setPart] = useState(data.project.score.parts[0]!)
    return <div onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') save() }}>
      <StudioPartLabels enabled name={part.name} abbreviation={part.abbreviation} onCommit={(field, text) => {
        command(field, text); setPart(p => ({ ...p, [field]: field === 'name' ? text.trim() || p.name : text.trim() || undefined }))
      }}/>
    </div>
  }
  render(<Host />)
  const field = screen.getByRole('textbox', { name: data.label }); field.focus(); fireEvent.change(field, { target: { value: data.draft } })
  fireEvent.keyDown(field, { key: 's', code: 'KeyS', ...modifier })
  expect(command).not.toHaveBeenCalled(); expect(field).toHaveFocus()
  if (data.blocked) {
    expect(save).not.toHaveBeenCalled(); expect(field).toHaveAccessibleDescription(guidance)
    fireEvent.keyDown(field, { key: data.confirm ? 'Enter' : 'Escape' }); fireEvent.blur(field)
    expect(command).toHaveBeenCalledTimes(data.confirm ? 1 : 0)
    if (data.confirm) expect(command).toHaveBeenCalledWith(data.field, data.draft)
    expect(field).toHaveValue(data.expected.score.parts[0]![data.field] ?? '')
    expect(field).not.toHaveAccessibleDescription(guidance); expect(save).not.toHaveBeenCalled()
    field.focus(); fireEvent.keyDown(field, { key: 's', code: 'KeyS', ...modifier })
  }
  expect(save).toHaveBeenCalledOnce()
})
it('studio.part-label-save-draft isolates composition and the next part owner', () => {
  const commit = vi.fn(), save = vi.fn()
  const host = (id: string, name: string) => <div onKeyDown={save}><StudioPartLabels key={id} name={name} enabled onCommit={commit}/></div>
  const { rerender } = render(host('first', 'Piano'))
  const field = screen.getByRole('textbox', { name: '현재 파트 이름' }); field.focus(); fireEvent.change(field, { target: { value: '새 이름' } })
  fireEvent.compositionStart(field); fireEvent.keyDown(field, { key: 's', code: 'KeyS', ctrlKey: true }); fireEvent.keyDown(field, { key: 'Enter', isComposing: true, keyCode: 229 }); fireEvent.blur(field)
  expect(commit).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled(); expect(field).not.toHaveAccessibleDescription(guidance)
  fireEvent.compositionEnd(field); field.focus(); fireEvent.keyDown(field, { key: 's', code: 'KeyS', ctrlKey: true }); expect(field).toHaveAccessibleDescription(guidance)
  rerender(host('second', 'Flute')); fireEvent.blur(field)
  expect(screen.getByRole('textbox', { name: '현재 파트 이름' })).toHaveValue('Flute'); expect(screen.queryByText(guidance)).not.toBeInTheDocument(); expect(commit).not.toHaveBeenCalled()
})
