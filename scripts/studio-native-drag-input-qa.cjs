// Owned browser input only. A successful CDP command alone is not native-focus proof.
module.exports=function createNativeDragInput({win,run,results={}},assertReady){
  let pressed=false
  const ready=label=>(assertReady??require('./studio-native-input-state-qa.cjs'))({win,run,results,label})
  const dispatch=async(label,send,type)=>{
    await ready(`${label}: before`)
    if(type==='mousePressed'||type==='mouseDown')pressed=true
    if(type==='mouseReleased'||type==='mouseUp')pressed=false
    const result=await send()
    await ready(`${label}: after`)
    return result
  }
  const mouse=(type,p,buttons)=>dispatch(`palette CDP ${type}`,()=>win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{
    type,x:p.x,y:p.y,button:type==='mouseMoved'&&buttons===0?'none':'left',buttons,clickCount:1
  }),type)
  return {
    mouse,
    drag:(type,args)=>dispatch(`palette CDP ${type}`,()=>win.webContents.debugger.sendCommand('Input.dispatchDragEvent',{type,...args})),
    native:event=>dispatch(`palette native ${event.type}`,()=>win.webContents.sendInputEvent(event),event.type),
    async cleanup(point,primaryError,tasks=[]){
      const errors=[],attempt=async task=>{try{await task()}catch(error){errors.push(error)}}
      // Cancellation stops the owned browser gesture; it is not mouse input.
      await attempt(()=>win.webContents.debugger.sendCommand('Input.cancelDragging'))
      if(pressed)await attempt(()=>mouse('mouseReleased',point,0))
      pressed=false
      for(const task of tasks)await attempt(task)
      if(errors.length){
        results.nativeDragCleanup??=[]
        results.nativeDragCleanup.push({primaryMessage:primaryError?.message,
          errors:errors.map(error=>({message:String(error),code:error?.code})),
          scope:'Owned cancellation/cleanup only; no refocus, retry or unguarded release.'})
        if(!primaryError)throw errors[0]
      }
    }
  }
}
