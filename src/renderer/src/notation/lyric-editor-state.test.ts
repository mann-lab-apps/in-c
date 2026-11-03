// @vitest-environment jsdom
import {afterEach,expect,it} from 'vitest'
import {captureLyricEditorState,type LyricEditorAnchor} from './lyric-editor-state'
afterEach(()=>document.body.replaceChildren())
function setup(){
 const input=document.createElement('input');document.body.append(input)
 Object.assign(input.dataset,{eventId:'same-id',lyricNumber:'1',documentKey:'4',focusRequest:'2',sourceValue:'기존 가사'})
 input.value='아직 확정하지 않은 가사';input.focus();input.setSelectionRange(2,5,'backward')
 const anchor:LyricEditorAnchor={eventId:'same-id',number:1,documentKey:4,focusRequest:2,value:'기존 가사'}
 return {input,anchor}
}
it('keeps same-document same-anchor draft/caret without committing or changing source',()=>{
 const {input,anchor}=setup(),source={...anchor}
 expect(captureLyricEditorState(input,anchor,document.activeElement)).toEqual({defer:false,focus:true,draft:{value:input.value,start:2,end:5,direction:'backward'}})
 expect(anchor).toEqual(source);expect(input.dataset.sourceValue).toBe('기존 가사')
})
it.each([{documentKey:5},{eventId:'other-note'},{number:2},{value:'되돌린 값'}])('does not carry a draft across document/selection/verse/source changes: %j',patch=>{
 const {input,anchor}=setup()
 expect(captureLyricEditorState(input,{...anchor,...patch},document.activeElement).draft).toBeUndefined()
})
it('does not steal Tab focus back unless there is an explicit lyric focus request',()=>{
 const {input,anchor}=setup(),button=document.createElement('button');document.body.append(button);button.focus()
 expect(captureLyricEditorState(input,anchor,document.activeElement)).toEqual({defer:false,focus:false,draft:undefined})
 expect(captureLyricEditorState(input,{...anchor,focusRequest:3},document.activeElement).focus).toBe(true)
})
it('defers same-anchor composition but never preserves an old document native input',()=>{
 const {input,anchor}=setup();input.dataset.editorComposing='true'
 expect(captureLyricEditorState(input,anchor,document.activeElement).defer).toBe(true)
 expect(captureLyricEditorState(input,{...anchor,documentKey:5},document.activeElement).defer).toBe(false)
 expect(captureLyricEditorState(input,undefined,document.activeElement).draft).toBeUndefined()
})
