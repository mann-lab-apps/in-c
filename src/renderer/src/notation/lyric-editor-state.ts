export interface LyricEditorAnchor {
  eventId:string
  number:number
  value:string
  documentKey?:number
  focusRequest?:number
}
export interface LyricEditorRestore {
  defer:boolean
  focus:boolean
  draft?:{value:string;start:number|null;end:number|null;direction:'forward'|'backward'|'none'|null}
}

export function captureLyricEditorState(
  input:HTMLInputElement|null,anchor:LyricEditorAnchor|undefined,activeElement:Element|null
):LyricEditorRestore {
  const same=Boolean(input&&anchor&&input.dataset.eventId===anchor.eventId&&
    input.dataset.lyricNumber===String(anchor.number)&&input.dataset.documentKey===String(anchor.documentKey??''))
  const draft=input&&same&&input===activeElement&&input.dataset.sourceValue===anchor?.value
    ? {value:input.value,start:input.selectionStart,end:input.selectionEnd,direction:input.selectionDirection}
    : undefined
  return {draft,defer:same&&input?.dataset.editorComposing==='true',
    focus:!input||!same||input===activeElement||input.dataset.focusRequest!==String(anchor?.focusRequest??0)}
}
