// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { parseMusicXml } from '../../musicxml'
import fixture from '../../musicxml/fixtures/rest-hairpin-input.musicxml?raw'
import { SpanProperties } from './SpanProperties'
afterEach(cleanup)
it('no selection has no editable geometry and uses the scoped shared host', () => {
  render(<SpanProperties score={parseMusicXml(fixture)} onSelect={vi.fn()} onDelete={vi.fn()} onEndpointChange={vi.fn()} onEngravingChange={vi.fn()}/>);
  expect(screen.getByRole('region', {name:'범위 표기 속성'})).toHaveClass('ddirori');
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
})
function setup() {
  const score = parseMusicXml(fixture)
  const events = score.parts[0].staves[0].measures[0].voices[1].events
  score.hairpins = [{ id: 'h', type: 'crescendo', startEventId: events[0].id, endEventId: events[3].id }]
  const commit = vi.fn(), globalKey = vi.fn()
  const props = { score, selected: {kind: 'hairpin' as const, id: 'h'}, onSelect: vi.fn(), onDelete: vi.fn(), onEndpointChange: vi.fn(), onEngravingChange: commit }
  const view = render(<div onKeyDown={globalKey}><SpanProperties {...props}/></div>)
  fireEvent.click(screen.getByText('배치 · 형상'))
  const input = screen.getByLabelText('표기 높이') as HTMLInputElement
  expect(input.closest('.dd-field')).not.toBeNull()
  input.focus()
  return { input, commit, globalKey, view, props }
}
it('composition Enter keeps focus and does not commit or reach editor shortcuts', () => {
  const { input, commit, globalKey } = setup()
  fireEvent.change(input, {target:{value:'2'}})
  fireEvent.compositionStart(input)
  fireEvent.keyDown(input, {key:'Enter', isComposing:true, keyCode:229})
  expect(input).toHaveFocus()
  expect(commit).not.toHaveBeenCalled()
  expect(globalKey).not.toHaveBeenCalled()
  fireEvent.compositionEnd(input)
  fireEvent.keyDown(input, {key:'Enter'})
  expect(commit).toHaveBeenCalledExactlyOnceWith({height:2})
})

it('T04 composition cancellation followed by invalid blur preserves automatic value and selection', () => {
  const {input,commit,globalKey,props} = setup()
  fireEvent.change(input,{target:{value:'3'}})
  fireEvent.compositionStart(input,{data:'한'})
  fireEvent.keyDown(input,{key:'Enter',isComposing:true,keyCode:229})
  fireEvent.compositionEnd(input,{data:'한'})
  fireEvent.keyDown(input,{key:'Escape'})
  expect(input).toHaveValue(null)
  input.focus()
  fireEvent.change(input,{target:{value:'99'}})
  fireEvent.blur(input)
  expect(input).toHaveValue(null)
  expect(input).toHaveAttribute('aria-invalid','true')
  expect(input).toHaveAccessibleDescription(/0.5~8 sp/)
  expect(commit).not.toHaveBeenCalled()
  expect(props.onSelect).not.toHaveBeenCalled()
  expect(globalKey).not.toHaveBeenCalled()
})
it('Escape cancels only the field; invalid values and untouched automatic values do not commit', () => {
  const {input,commit,globalKey} = setup()
  fireEvent.change(input,{target:{value:'3'}})
  fireEvent.keyDown(input,{key:'Escape'})
  expect(input.value).toBe('')
  expect(commit).not.toHaveBeenCalled()
  expect(globalKey).not.toHaveBeenCalled()
  input.focus(); fireEvent.change(input,{target:{value:'9'}}); fireEvent.blur(input)
  expect(commit).not.toHaveBeenCalled()
  expect(input.value).toBe('')
})
it('one edit commits once before the host echoes; external value and clearing preserve undefined', () => {
  const {input,commit,view,props} = setup()
  fireEvent.change(input,{target:{value:'2'}}); fireEvent.keyDown(input,{key:'Enter'}); fireEvent.blur(input)
  expect(commit).toHaveBeenCalledTimes(1)
  const score=structuredClone(props.score);score.hairpins![0].engraving={height:4}
  view.rerender(<div><SpanProperties {...props} score={score}/></div>)
  expect(input.value).toBe('4')
  fireEvent.change(input,{target:{value:''}});fireEvent.blur(input)
  expect(commit).toHaveBeenLastCalledWith({height:undefined})
  expect(commit).toHaveBeenCalledTimes(2)
})

it('r1 distinguishes automatic offsets from explicit zero and reports rejected geometry', () => {
  const {input, commit} = setup()
  expect(screen.getByLabelText('표기 가로 이동')).toHaveAttribute('placeholder', '자동')
  fireEvent.change(input, {target: {value: '9'}})
  fireEvent.blur(input)
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByText(/0.5.*8.*sp/)).toBeVisible()
  expect(commit).not.toHaveBeenCalled()
  input.focus()
  fireEvent.change(input, {target: {value: '2'}})
  fireEvent.keyDown(input, {key: 'Escape'})
  expect(input).toHaveAttribute('aria-invalid', 'false')
  const offset = screen.getByLabelText('표기 가로 이동')
  fireEvent.change(offset, {target: {value: '0'}})
  fireEvent.blur(offset)
  expect(commit).toHaveBeenCalledExactlyOnceWith({offsetX: 0})
})

it('r1 discards the previous selection draft instead of committing to a new span', () => {
  const {input, commit, view, props} = setup()
  fireEvent.change(input, {target: {value: '3'}})
  const score = structuredClone(props.score)
  score.hairpins!.push({...score.hairpins![0], id: 'other', engraving: {height: 1}})
  view.rerender(<SpanProperties {...props} score={score} selected={{kind: 'hairpin', id: 'other'}} />)
  fireEvent.blur(screen.getByLabelText('표기 높이'))
  expect(screen.getByLabelText('표기 높이')).toHaveValue(1)
  expect(commit).not.toHaveBeenCalled()
})
