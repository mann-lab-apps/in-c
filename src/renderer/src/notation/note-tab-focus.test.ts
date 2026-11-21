// @vitest-environment jsdom
import {expect,it} from 'vitest'
import {resolveTabNoteFocusTarget} from './focus-viewport'
function note(){
 const n=document.createElementNS('http://www.w3.org/2000/svg','g');n.classList.add('notation-event');for(const key of['event','part','staff','measure','voice'])n.setAttribute('data-'+key+'-id',key+'-one');n.setAttribute('aria-pressed','false');return n
}
it('retains the full tabbed note address without changing selection or DOM order',()=>{
 const root=document.createElementNS('http://www.w3.org/2000/svg','svg'),before=note(),target=note(),other=note();other.dataset.eventId='other';root.append(other,target);const order=[...root.children]
 expect(resolveTabNoteFocusTarget(root,before,true)).toBe(target);expect(target.getAttribute('aria-pressed')).toBe('false');expect([...root.children]).toEqual(order)
})
it.each(['part','staff','measure','voice'])('does not conflate matching event ids in another %s',key=>{
 const root=document.createElementNS('http://www.w3.org/2000/svg','svg'),before=note(),wrong=note(),target=note();wrong.setAttribute('data-'+key+'-id','different');root.append(wrong,target);expect(resolveTabNoteFocusTarget(root,before,true)).toBe(target)
})
it('leaves normal note selection and new span/document intent to the existing resolver',()=>{
 const root=document.createElementNS('http://www.w3.org/2000/svg','svg'),target=note();root.append(target);expect(resolveTabNoteFocusTarget(root,note(),false)).toBeUndefined()
})
it('does not focus readonly tuplet previews or an event removed by undo',()=>{
 const root=document.createElementNS('http://www.w3.org/2000/svg','svg'),preview=note();preview.classList.add('is-preview');root.append(preview);expect(resolveTabNoteFocusTarget(root,note(),true)).toBeUndefined();preview.remove();expect(resolveTabNoteFocusTarget(root,note(),true)).toBeUndefined()
})
it('rejects incomplete addresses and non-note focus',()=>{
 const root=document.createElementNS('http://www.w3.org/2000/svg','svg'),target=note(),missing=note();root.append(target);missing.removeAttribute('data-voice-id');expect(resolveTabNoteFocusTarget(root,missing,true)).toBeUndefined();expect(resolveTabNoteFocusTarget(root,document.createElement('input'),true)).toBeUndefined();expect(resolveTabNoteFocusTarget(root,null,true)).toBeUndefined()
})
