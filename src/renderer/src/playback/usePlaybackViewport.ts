import {useCallback,useEffect,useRef,useState,type RefObject} from 'react'
import type {PlaybackStatus} from './useScorePlayback'
import {createViewportScrollTracker,observeDocumentScrollbarIntent} from '../editor/viewport-scroll'

const isEditingTarget=(target:EventTarget|null)=>target instanceof Element&&
  Boolean(target.closest('input,textarea,[contenteditable="true"],[role="combobox"]'))

// Workspace state only. The renderer owns the cursor and App owns selection/audio.
// A manual document scroll suspends following until the explicit toolbar toggle.
export function usePlaybackViewport(canvas:RefObject<HTMLElement|null>,status:PlaybackStatus,reveal:(target:Element)=>void) {
  const [following,setFollowing]=useState(true)
  const followingRef=useRef(following)
  followingRef.current=following
  const toggleFollowing=useCallback(()=>setFollowing(value=>!value),[])
  useEffect(()=>{
    const root=canvas.current
    if(!root||status!=='playing'||!following)return
    let frame:number|undefined,disposed=false
    const schedule=()=>{
      if(frame!==undefined||disposed)return
      frame=requestAnimationFrame(()=>{
        frame=undefined
        if(disposed||!followingRef.current||!document.hasFocus()||isEditingTarget(document.activeElement))return
        const cursor=root.querySelector('.notation-playhead')
        if(cursor?.isConnected)reveal(cursor)
      })
    }
    const suspend=()=>{
      followingRef.current=false
      setFollowing(false)
      if(frame!==undefined){cancelAnimationFrame(frame);frame=undefined}
    }
    const scrollTracker=createViewportScrollTracker()
    const wheel=(event:WheelEvent|TouchEvent)=>{
      if(event instanceof WheelEvent&&!event.deltaX&&!event.deltaY)return
      if(scrollTracker.isInternalScroll(event,root))return
      suspend()
    }
    const keyboard=(event:KeyboardEvent)=>{
      if(event.isComposing||event.keyCode===229||isEditingTarget(event.target))return
      if(['PageUp','PageDown','Home','End'].includes(event.key)&&
        (event.target===document.body||event.target===root||event.target instanceof Element&&root.contains(event.target)))suspend()
    }
    const stopScrollbarObservation=observeDocumentScrollbarIntent(suspend)
    const observer=new MutationObserver(schedule)
    observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['x1','x2','y1','y2']})
    const resize=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(schedule)
    resize?.observe(root)
    window.addEventListener('wheel',wheel,{capture:true,passive:true})
    window.addEventListener('touchstart',scrollTracker.touchStart,{capture:true,passive:true})
    window.addEventListener('touchmove',wheel,{capture:true,passive:true})
    window.addEventListener('keydown',keyboard,true)
    window.addEventListener('resize',schedule)
    window.addEventListener('focus',schedule)
    document.addEventListener('focusin',schedule)
    schedule()
    return()=>{
      disposed=true;observer.disconnect();resize?.disconnect()
      if(frame!==undefined)cancelAnimationFrame(frame)
      window.removeEventListener('wheel',wheel,true)
      window.removeEventListener('touchstart',scrollTracker.touchStart,true)
      window.removeEventListener('touchmove',wheel,true)
      window.removeEventListener('keydown',keyboard,true)
      stopScrollbarObservation()
      window.removeEventListener('resize',schedule)
      window.removeEventListener('focus',schedule)
      document.removeEventListener('focusin',schedule)
    }
  },[canvas,status,following,reveal])
  return {following,toggleFollowing}
}
