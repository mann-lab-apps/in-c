import { useEffect, useRef, useState } from 'react'
import './studio-dock-resize.css'

const desktopPointer = '(min-width: 1024px) and (pointer: fine)'
const clamp = (width:number) => Math.max(200,Math.min(360,Math.round(width)))

// A private workspace adapter, not a score command or a shared splitter API.
export function StudioDockResizeHandle({name,width,onWidth,theme,onReturn}:{
  name:'palette'|'properties';width:number;onWidth:(width:number)=>void;theme:'light'|'dark';onReturn?:()=>void
}) {
  const [available,setAvailable]=useState(()=>window.matchMedia?.(desktopPointer).matches??false)
  const [dragging,setDragging]=useState(false)
  const drag=useRef<{pointer:number;x:number;width:number;apply:(width:number)=>void}|undefined>(undefined)
  const cancel=()=>{
    const current=drag.current;drag.current=undefined
    if(current)current.apply(current.width)
    setDragging(false)
  }
  useEffect(()=>{
    const media=window.matchMedia?.(desktopPointer)
    const update=()=>{setAvailable(media?.matches??false);if(!media?.matches)cancel()}
    media?.addEventListener('change',update)
    return ()=>{media?.removeEventListener('change',update);const current=drag.current;drag.current=undefined;if(current)current.apply(current.width)}
  },[])
  if(!available)return null
  const title=name==='palette'?'팔레트':'속성'
  return <div className="studio-dock-resize ddirori" data-theme={theme} data-dragging={dragging||undefined}
    role="separator" tabIndex={0} aria-label={`${title} 도크 폭 조절`} aria-orientation="vertical"
    aria-keyshortcuts="ArrowLeft ArrowRight Home End F6" aria-controls={`studio-${name}`} aria-valuemin={200} aria-valuemax={360} aria-valuenow={width} aria-valuetext={`${width}px`}
    title="드래그 또는 좌우 방향키로 폭 조절 · Escape로 드래그 취소"
    onPointerDown={event=>{
      if(event.button!==0||event.pointerType==='touch'||drag.current)return
      event.preventDefault();event.currentTarget.focus({preventScroll:true})
      drag.current={pointer:event.pointerId,x:event.clientX,width,apply:onWidth};setDragging(true)
      try{event.currentTarget.setPointerCapture?.(event.pointerId)}catch{/* Keyboard and numeric settings remain available. */}
    }}
    onPointerMove={event=>{const current=drag.current;if(current&&current.pointer===event.pointerId)current.apply(clamp(current.width+event.clientX-current.x))}}
    onPointerUp={event=>{
      if(drag.current?.pointer!==event.pointerId)return
      drag.current=undefined;setDragging(false)
      try{event.currentTarget.releasePointerCapture?.(event.pointerId)}catch{/* Already released by the browser. */}
    }}
    onPointerCancel={event=>{if(drag.current?.pointer===event.pointerId)cancel()}} onLostPointerCapture={()=>{if(drag.current)cancel()}} onBlur={()=>{if(drag.current)cancel()}}
    onKeyDown={event=>{
      if(event.nativeEvent.isComposing||event.keyCode===229||event.key==='Process'){event.stopPropagation();return}
      if(event.ctrlKey||event.metaKey||event.altKey)return
      if(event.key==='F6'&&onReturn){event.preventDefault();event.stopPropagation();cancel();onReturn();return}
      event.stopPropagation()
      if(event.key==='Escape'){event.preventDefault();cancel();return}
      if(drag.current)return
      const next=event.key==='ArrowLeft'?width-16:event.key==='ArrowRight'?width+16:event.key==='Home'?200:event.key==='End'?360:undefined
      if(next!==undefined){event.preventDefault();onWidth(clamp(next))}
      else if(event.key===' '||event.key==='Enter')event.preventDefault()
    }}/>
}
