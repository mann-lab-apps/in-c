import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import {expect,it,vi} from 'vitest'

const require=createRequire(import.meta.url)
const createInput=require('./studio-native-drag-input-qa.cjs')
const guardSource=readFileSync(new URL('./studio-native-input-state-qa.cjs',import.meta.url),'utf8')
function harness(){
  const state={destroyed:false,visible:true,minimized:false,windowFocused:true,webFocused:true,appActive:true,appHidden:false,rendererFocused:true,rendererVisible:true}
  const app={isActive:()=>state.appActive,isHidden:()=>state.appHidden},module={exports:{}}
  vm.runInNewContext(guardSource,{module,require:id=>{if(id!=='electron')throw Error('Unexpected dependency '+id);return{app}},Error,Date})
  let onDispatch,onRead
  const debuggerApi={sendCommand:vi.fn(async(method,params)=>{await onDispatch?.(method,params);return{sent:true}})}
  const win={isDestroyed:()=>state.destroyed,isVisible:()=>state.visible,isMinimized:()=>state.minimized,isFocused:()=>state.windowFocused,
    show:vi.fn(),focus:vi.fn(),webContents:{isDestroyed:()=>state.destroyed,isFocused:()=>state.webFocused,debugger:debuggerApi,sendInputEvent:vi.fn(event=>onDispatch?.('native',event))}}
  const run=vi.fn(async()=>{await onRead?.();return{focused:state.rendererFocused,visible:state.rendererVisible}}),results={}
  const api=createInput({win,run,results},module.exports)
  return{state,app,win,run,results,api,debuggerApi,setDispatch:fn=>{onDispatch=fn},setRead:fn=>{onRead=fn}}
}
const point={x:10,y:20},args={x:30,y:40,data:{items:[],dragOperationsMask:1}}
const channels=[
  {name:'CDP mouse',invoke:h=>h.api.mouse('mousePressed',point,1),method:'Input.dispatchMouseEvent',params:{type:'mousePressed',x:10,y:20,button:'left',buttons:1,clickCount:1}},
  {name:'CDP drag',invoke:h=>h.api.drag('dragOver',args),method:'Input.dispatchDragEvent',params:{type:'dragOver',...args}},
  {name:'native wheel',invoke:h=>h.api.native({type:'mouseWheel',x:10,y:20,deltaY:1}),method:'native',params:{type:'mouseWheel',x:10,y:20,deltaY:1}}
]
const dispatches=h=>[...h.debuggerApi.sendCommand.mock.calls.filter(([method])=>method.startsWith('Input.dispatch')), ...h.win.webContents.sendInputEvent.mock.calls]
it.each(channels)('retains the existing active $name event parameters',async channel=>{
  const h=harness();await channel.invoke(h)
  if(channel.method==='native')expect(h.win.webContents.sendInputEvent).toHaveBeenCalledWith(channel.params)
  else expect(h.debuggerApi.sendCommand).toHaveBeenCalledWith(channel.method,channel.params)
  expect(dispatches(h)).toHaveLength(1);expect(h.win.show).not.toHaveBeenCalled();expect(h.win.focus).not.toHaveBeenCalled()
})
const invalid=[['destroyed',true],['visible',false],['minimized',true],['windowFocused',false],['webFocused',false],['appActive',false],['appHidden',true],['rendererFocused',false],['rendererVisible',false]]
it.each(channels.flatMap(channel=>invalid.map(([field,value])=>({channel,field,value}))))('refuses $channel.name when $field=$value before sending any input',async({channel,field,value})=>{
  const h=harness();h.state[field]=value
  await expect(channel.invoke(h)).rejects.toMatchObject({code:'STUDIO_NATIVE_INPUT_UNAVAILABLE'})
  expect(dispatches(h)).toHaveLength(0);expect(h.win.show).not.toHaveBeenCalled();expect(h.win.focus).not.toHaveBeenCalled()
})
it.each(channels)('checks active ownership before and after $name',async channel=>{
  const h=harness();await channel.invoke(h)
  expect(h.results.nativeInputState?.checked).toBe(2);expect(h.run).toHaveBeenCalledTimes(2)
})
it.each(channels)('fails rather than approving $name when focus is lost during dispatch',async channel=>{
  const h=harness();h.setDispatch(()=>{h.state.windowFocused=false})
  await expect(channel.invoke(h)).rejects.toMatchObject({code:'STUDIO_NATIVE_INPUT_UNAVAILABLE'})
  expect(dispatches(h)).toHaveLength(1);expect(h.results.nativeInputState?.rejections).toHaveLength(1);expect(h.win.focus).not.toHaveBeenCalled()
})
it('rereads native ownership after the asynchronous renderer check',async()=>{
  const h=harness();h.setRead(()=>{h.state.appActive=false})
  await expect(h.api.mouse('mouseMoved',point,0)).rejects.toMatchObject({code:'STUDIO_NATIVE_INPUT_UNAVAILABLE'})
  expect(dispatches(h)).toHaveLength(0)
})
it('preserves a renderer-read failure and does not send or retry input',async()=>{
  const h=harness(),error=Error('owned renderer deadline');h.setRead(()=>{throw error})
  await expect(h.api.drag('drop',args)).rejects.toBe(error);expect(dispatches(h)).toHaveLength(0);expect(h.run).toHaveBeenCalledOnce()
})
it('ends an active press once and still runs owned cleanup tasks',async()=>{
  const h=harness(),cleanup=vi.fn();await h.api.mouse('mousePressed',point,1);await h.api.cleanup(point,undefined,[cleanup])
  expect(h.debuggerApi.sendCommand.mock.calls.filter(([method,params])=>method==='Input.dispatchMouseEvent'&&params.type==='mouseReleased')).toHaveLength(1)
  expect(h.debuggerApi.sendCommand).toHaveBeenCalledWith('Input.cancelDragging');expect(cleanup).toHaveBeenCalledOnce()
})
it('does not manufacture a release before a press or duplicate an already completed release',async()=>{
  const h=harness();await h.api.cleanup(point);expect(dispatches(h)).toHaveLength(0)
  await h.api.mouse('mousePressed',point,1);await h.api.mouse('mouseReleased',point,0);await h.api.cleanup(point)
  expect(h.debuggerApi.sendCommand.mock.calls.filter(([method,params])=>method==='Input.dispatchMouseEvent'&&params.type==='mouseReleased')).toHaveLength(1)
})
it('does not send cleanup mouse-up after focus loss when preserving a primary failure',async()=>{
  const h=harness(),primary=Error('primary drag failure');await h.api.mouse('mousePressed',point,1);h.state.windowFocused=false
  const before=dispatches(h).length;await h.api.cleanup(point,primary)
  expect(dispatches(h)).toHaveLength(before);expect(h.debuggerApi.sendCommand).toHaveBeenCalledWith('Input.cancelDragging')
  expect(h.results.nativeDragCleanup?.[0].primaryMessage).toBe(primary.message)
})
it('preserves the primary error when cancellation or later cleanup also fails',async()=>{
  const h=harness(),primary=Error('original failure'),secondary=Error('cleanup failure'),last=vi.fn()
  h.setDispatch(method=>{if(method==='Input.cancelDragging')throw secondary})
  const action=async()=>{try{throw primary}finally{await h.api.cleanup(point,primary,[()=>{throw Error('listener cleanup failure')},last])}}
  await expect(action()).rejects.toBe(primary);expect(last).toHaveBeenCalledOnce()
  expect(h.results.nativeDragCleanup?.[0].errors).toHaveLength(2)
})
it('reports a cleanup failure when there is no earlier error to preserve',async()=>{
  const h=harness(),secondary=Error('cancellation failed');h.setDispatch(()=>{throw secondary})
  await expect(h.api.cleanup(point)).rejects.toBe(secondary)
})
it('fails cleanup instead of silently releasing into an unfocused window',async()=>{
  const h=harness();await h.api.mouse('mousePressed',point,1);h.state.rendererFocused=false
  const before=dispatches(h).length
  await expect(h.api.cleanup(point)).rejects.toMatchObject({code:'STUDIO_NATIVE_INPUT_UNAVAILABLE'})
  expect(dispatches(h)).toHaveLength(before)
})
it('routes the shared palette runner through the tested dispatcher without implicit reactivation',()=>{
  const path=new URL('./studio-articulation-drag-qa.cjs',import.meta.url),source=ts.createSourceFile(path.pathname,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
  const direct=[],activations=[],cleanup=[]
  const visit=node=>{
    if(ts.isCallExpression(node)){
      const name=node.expression.getText(source),first=node.arguments[0]
      if(name.endsWith('.sendInputEvent')||(name.endsWith('.sendCommand')&&first&&ts.isStringLiteral(first)&&['Input.dispatchMouseEvent','Input.dispatchDragEvent'].includes(first.text)))direct.push(name)
      if(['win.focus','win.show'].includes(name))activations.push(name)
      if(name==='input.cleanup')cleanup.push(node.arguments.length)
    }
    ts.forEachChild(node,visit)
  }
  visit(source);expect(direct).toEqual([]);expect(activations).toEqual([]);expect(cleanup).toEqual([3])
})
