// Fail closed before native QA input. Activation is an explicit caller action.
const {app}=require('electron')
module.exports=async function assertNativeInputState({win,run,results,label}){
 const read=()=>{
  const present=Boolean(win&&!win.isDestroyed()&&!win.webContents.isDestroyed())
  return{present,visible:present&&win.isVisible(),minimized:present&&win.isMinimized(),windowFocused:present&&win.isFocused(),webContentsFocused:present&&win.webContents.isFocused(),appActive:typeof app.isActive==='function'?app.isActive():null,appHidden:typeof app.isHidden==='function'?app.isHidden():null}
 }
 const usable=s=>s.present&&s.visible&&!s.minimized&&s.windowFocused&&s.webContentsFocused&&s.appActive!==false&&s.appHidden!==true
 results.nativeInputState??={checked:0,rejections:[],scope:'Own QA window must be visible, active and focused before native input; no automatic refocus/retry.'}
 const reject=state=>{
  const error=Error(`Native input unavailable (${label}): ${JSON.stringify(state)}`);error.code='STUDIO_NATIVE_INPUT_UNAVAILABLE';error.state=state
  results.nativeInputState.rejections.push({at:Date.now(),label,state});throw error
 }
 const before=read();if(!usable(before))reject({before})
 const renderer=await run(()=>({focused:document.hasFocus(),visible:document.visibilityState==='visible'})),after=read()
 if(!usable(after)||!renderer.focused||!renderer.visible)reject({before,renderer,after})
 results.nativeInputState.checked++;return{before,renderer,after}
}
