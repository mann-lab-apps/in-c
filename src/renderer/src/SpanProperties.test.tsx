// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { parseMusicXml } from '../../musicxml'
import fixture from '../../musicxml/fixtures/rest-hairpin-input.musicxml?raw'
import { SpanProperties } from './SpanProperties'
import { spanEndpointOptions } from './editor/span-editing'
afterEach(cleanup)
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype,'showPopover',{configurable:true,value(this:HTMLElement){this.style.display='block'}})
  Object.defineProperty(HTMLElement.prototype,'hidePopover',{configurable:true,value(){}})
})
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
it.each(['startEventId','endEventId']as const)('endpoint ordering disables engine-invalid %s choices and skips them on native navigation',endpoint=>{
 const{props}=setup(),span=props.score.hairpins![0],options=spanEndpointOptions(props.score,props.selected),start=options.find(o=>o.id===span.startEventId)!,end=options.find(o=>o.id===span.endEventId)!,before=structuredClone(props.score)
 const ordered=(a:typeof start,b:typeof end)=>a.measureIndex<b.measureIndex||(a.measureIndex===b.measureIndex&&a.tick<b.tick)
 const allowed=options.filter(option=>endpoint==='startEventId'?ordered(option,end):ordered(start,option)),invalid=options.filter(option=>!allowed.includes(option))
 expect(allowed.length).toBeGreaterThan(0);expect(invalid.length).toBeGreaterThan(0)
 const field=screen.getByRole('combobox',{name:endpoint==='startEventId'?'표기 시작점':'표기 끝점'});fireEvent.click(field)
 for(const option of invalid)expect(screen.getByRole('option',{name:option.label})).toHaveAttribute('aria-disabled','true')
 fireEvent.keyDown(field,{key:'Home'});const active=document.getElementById(field.getAttribute('aria-activedescendant')!);expect(active).toHaveTextContent(allowed[0].label)
 expect(props.onEndpointChange).not.toHaveBeenCalled();fireEvent.keyDown(field,{key:'Escape'});expect(props.onEndpointChange).not.toHaveBeenCalled();expect(props.score).toEqual(before)
})
it.each(['equal','reversed']as const)('explains an existing %s endpoint range without changing its data and leaves valid repairs available',kind=>{
 const{props,view}=setup(),score=structuredClone(props.score),events=score.parts[0].staves[0].measures[0].voices[1].events
 score.hairpins![0].startEventId=events[kind==='equal'?0:2].id;score.hairpins![0].endEventId=events[kind==='equal'?0:1].id
 const before=structuredClone(score);view.rerender(<SpanProperties {...props} score={score}/>)
 for(const label of ['표기 시작점','표기 끝점'])expect(screen.getByRole('combobox',{name:label})).toHaveAttribute('aria-invalid','true')
 const field=screen.getByRole('combobox',{name:'표기 끝점'});fireEvent.click(field);fireEvent.keyDown(field,{key:'Home'});const active=document.getElementById(field.getAttribute('aria-activedescendant')!)
 expect(active).not.toHaveAttribute('aria-disabled','true');expect(props.onEndpointChange).not.toHaveBeenCalled();expect(score).toEqual(before)
 fireEvent.keyDown(field,{key:'Enter'});expect(props.onEndpointChange).toHaveBeenCalledTimes(1);expect(score).toEqual(before)
})
it.each([
 ['선택 표기 삭제','Enter'],['선택 표기 삭제',' '],
 ['표기 선택 해제','Enter'],['표기 선택 해제',' ']
])('keeps native %s activation with %j out of editor shortcuts',(label,key)=>{
 const{globalKey,props}=setup(),before=structuredClone(props.score),button=screen.getByRole('button',{name:label})
 button.focus();expect(fireEvent.keyDown(button,{key})).toBe(true)
 expect(globalKey).not.toHaveBeenCalled();expect(props.onDelete).not.toHaveBeenCalled();expect(props.onSelect).not.toHaveBeenCalled();expect(props.score).toEqual(before)
})
it.each(['delete','clear']as const)('returns focus to the surviving object picker before %s removes the action',action=>{
 const{props,view}=setup(),before=structuredClone(props.score),next=structuredClone(props.score)
 if(action==='delete')delete next.hairpins
 const callback=vi.fn(()=>view.rerender(<SpanProperties {...props} score={next} selected={undefined}/>))
 view.rerender(<SpanProperties {...props} onDelete={action==='delete'?callback:props.onDelete} onSelect={action==='clear'?callback:props.onSelect}/> )
 const button=screen.getByRole('button',{name:action==='delete'?'선택 표기 삭제':'표기 선택 해제'});button.focus();fireEvent.click(button)
 expect(callback).toHaveBeenCalledTimes(1);expect(screen.getByRole('combobox',{name:'표기 객체 선택'})).toHaveFocus();expect(props.score).toEqual(before);expect(props.onEngravingChange).not.toHaveBeenCalled()
})
it.each(['Escape','Delete','Backspace'])('preserves the existing %s command on a span button and returns focus before removal',key=>{
 const{props,view,globalKey}=setup(),next=structuredClone(props.score),before=structuredClone(props.score)
 if(key!=='Escape')delete next.hairpins
 const callback=vi.fn(()=>view.rerender(<div onKeyDown={globalKey}><SpanProperties {...props} score={next} selected={undefined}/></div>))
 view.rerender(<div onKeyDown={globalKey}><SpanProperties {...props} onDelete={key==='Escape'?props.onDelete:callback} onSelect={key==='Escape'?callback:props.onSelect}/></div>)
 const button=screen.getByRole('button',{name:key==='Escape'?'표기 선택 해제':'선택 표기 삭제'});button.focus()
 if(key==='Escape'){
  fireEvent.focus(button);expect(screen.getByRole('tooltip')).toHaveTextContent('표기 선택 해제')
  fireEvent.keyDown(button,{key});expect(callback).not.toHaveBeenCalled();expect(globalKey).not.toHaveBeenCalled();expect(button).toHaveFocus();expect(props.score).toEqual(before);expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
 }
 expect(fireEvent.keyDown(button,{key})).toBe(false);expect(callback).toHaveBeenCalledTimes(1);expect(globalKey).not.toHaveBeenCalled();expect(screen.getByRole('combobox',{name:'표기 객체 선택'})).toHaveFocus();expect(props.score).toEqual(before);expect(props.onEngravingChange).not.toHaveBeenCalled()
})
it('does not reinterpret composition or modified Delete as a local span removal',()=>{
 const{props,globalKey}=setup(),button=screen.getByRole('button',{name:'선택 표기 삭제'}),before=structuredClone(props.score)
 button.focus()
 for(const modifiers of [{isComposing:true},{keyCode:229},{ctrlKey:true},{metaKey:true},{altKey:true}])expect(fireEvent.keyDown(button,{key:'Delete',...modifiers})).toBe(true)
 expect(props.onDelete).not.toHaveBeenCalled();expect(props.onSelect).not.toHaveBeenCalled();expect(props.score).toEqual(before);expect(button).toHaveFocus();expect(globalKey).toHaveBeenCalledTimes(5)
})
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

it.each([{isComposing:true},{keyCode:229}])('placement Select keeps pending geometry uncommitted during composition: %j',composition=>{
  const {commit,globalKey,props}=setup()
  const source=structuredClone(props.score)
  const placement=screen.getByRole('combobox',{name:'표기 배치'})
  placement.focus();fireEvent.click(placement);fireEvent.keyDown(placement,{key:'End'})
  const pending=placement.getAttribute('aria-activedescendant')
  for(const key of ['Home','Enter','Escape']){
    fireEvent.keyDown(placement,{key,...composition})
    expect(placement).toHaveAttribute('aria-expanded','true')
    expect(placement).toHaveAttribute('aria-activedescendant',pending)
    expect(placement).toHaveFocus()
    expect(commit).not.toHaveBeenCalled()
  }
  expect(globalKey).not.toHaveBeenCalled()
  expect(props.score).toEqual(source)
  fireEvent.keyDown(placement,{key:'Enter'})
  expect(commit).toHaveBeenCalledExactlyOnceWith({placement:'below'})
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

it('system inspector uses common selectors and keeps endpoint navigation separate from commit', () => {
  const { props, commit, globalKey } = setup()
  const endpoint = screen.getByRole('combobox', { name:'표기 끝점' })
  const before=props.score.hairpins![0].endEventId
  fireEvent.click(endpoint)
  fireEvent.keyDown(endpoint,{key:'ArrowUp'})
  expect(props.onEndpointChange).not.toHaveBeenCalled()
  fireEvent.keyDown(endpoint,{key:'Escape'})
  expect(props.onSelect).not.toHaveBeenCalled()
  expect(commit).not.toHaveBeenCalled()
  expect(globalKey).not.toHaveBeenCalled()
  expect(props.score.hairpins![0].endEventId).toBe(before)
  fireEvent.click(endpoint)
  fireEvent.keyDown(endpoint,{key:'ArrowUp'})
  fireEvent.keyDown(endpoint,{key:'Enter'})
  expect(props.onEndpointChange).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText('선택 표기 ID')).not.toBeVisible()
  expect(screen.getByRole('region',{name:'범위 표기 속성'})).not.toHaveClass('studio-chrome')
})

it('system disclosures use public accordion activation, preserve open selection and reset after deselection', () => {
  const { props, view, globalKey, commit } = setup()
  const geometry = screen.getByRole('button', { name: '배치 · 형상' })
  expect(geometry.closest('.dd-accordion')).not.toBeNull()
  expect(geometry).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByLabelText('표기 높이')).toBeVisible()
  const technical = screen.getByRole('button', { name: '기술 정보' })
  expect(technical).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByLabelText('선택 표기 ID')).not.toBeVisible()
  expect(fireEvent.keyDown(technical, { key: ' ', code: 'Space' })).toBe(true)
  expect(globalKey).not.toHaveBeenCalled()
  fireEvent.click(technical)
  expect(screen.getByLabelText('선택 표기 ID')).toBeVisible()
  expect(fireEvent.keyDown(geometry, { key: 'Enter', isComposing: true })).toBe(false)
  expect(commit).not.toHaveBeenCalled()
  const score = structuredClone(props.score)
  score.hairpins!.push({ ...score.hairpins![0], id: 'second' })
  view.rerender(<div onKeyDown={globalKey}><SpanProperties {...props} score={score} selected={{ kind: 'hairpin', id: 'second' }} /></div>)
  expect(screen.getByRole('button', { name: '배치 · 형상' })).toHaveAttribute('aria-expanded', 'true')
  view.rerender(<div onKeyDown={globalKey}><SpanProperties {...props} selected={undefined} /></div>)
  expect(screen.queryByRole('button', { name: '배치 · 형상' })).not.toBeInTheDocument()
  view.rerender(<div onKeyDown={globalKey}><SpanProperties {...props} /></div>)
  expect(screen.getByRole('button', { name: '배치 · 형상' })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByRole('button', { name: '기술 정보' })).toHaveAttribute('aria-expanded', 'false')
})

it.each(['slur','hairpin'] as const)('empty %s geometry is automatic while explicit zero still offers reset',kind=>{
  const score=parseMusicXml(fixture),events=score.parts[0].staves[0].measures[0].voices[1].events
  const span={id:'empty-span',startEventId:events[0].id,endEventId:events[3].id,engraving:{} as import('../../score-core').SpanEngraving}
  if(kind==='slur')score.slurs=[span];else score.hairpins=[{...span,type:'crescendo'}]
  const reset=vi.fn(),props={score,selected:{kind,id:'empty-span'},onSelect:vi.fn(),onDelete:vi.fn(),onEndpointChange:vi.fn(),onEngravingChange:reset}
  const view=render(<SpanProperties {...props}/>);fireEvent.click(screen.getByText('배치 · 형상'))
  const button=screen.getByRole('button',{name:'표기 자동 배치 복원'})
  expect(button).toBeDisabled();fireEvent.click(button);expect(reset).not.toHaveBeenCalled()
  if(kind==='slur')score.slurs![0].engraving={offsetY:0};else score.hairpins![0].engraving={offsetY:0}
  view.rerender(<SpanProperties {...props}/>);expect(button).toBeEnabled();fireEvent.click(button);expect(reset).toHaveBeenCalledExactlyOnceWith(undefined)
})

it('reset transfers focus to a real geometry input before dispatch, without a draft commit',()=>{
 const {props,view,commit,globalKey}=setup();props.score.hairpins![0].engraving={offsetY:0}
 view.rerender(<div onKeyDown={globalKey}><SpanProperties {...props}/></div>)
 const input=screen.getByLabelText('표기 가로 이동'),reset=screen.getByRole('button',{name:'표기 자동 배치 복원'})
 reset.focus();commit.mockImplementationOnce(()=>expect(input).toHaveFocus());fireEvent.click(reset)
 expect(commit).toHaveBeenCalledExactlyOnceWith(undefined);expect(input).toHaveFocus();expect(globalKey).not.toHaveBeenCalled()
})
