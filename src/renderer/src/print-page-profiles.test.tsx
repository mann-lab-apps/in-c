// @vitest-environment jsdom
import {act,cleanup,renderHook} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {decodePrintPageProfiles,printPageProfilesKey as key,usePrintPageProfiles,type PrintSetup} from './print-page-profiles'
const setup:PrintSetup={pageSize:'letter',orientation:'landscape',pageMarginMm:8.5,staffSizePercent:87.5,systemSpacingPercent:93.75}
const profile=()=>({id:'one',name:'한글 설정',setup:structuredClone(setup)})
beforeEach(()=>{
 if(typeof window.localStorage?.clear!=='function'){const memory=new Map<string,string>();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>memory.set(key,String(value)),clear:()=>memory.clear()}})}
 localStorage.clear()
});afterEach(()=>{cleanup();vi.restoreAllMocks()})
it.each(['{','{}','null',JSON.stringify({version:2,profiles:[]}),JSON.stringify({version:1,profiles:{}})])('retains malformed storage until an explicit write: %s',raw=>{
 localStorage.setItem(key,raw);const h=renderHook(usePrintPageProfiles);expect(h.result.current.profiles).toEqual([]);expect(h.result.current.storageIssue).toContain('읽지 못했습니다');expect(localStorage.getItem(key)).toBe(raw)
})
it.each(['size','orientation','margin','staff','spacing','nan','duplicate-id','duplicate-name','empty','long','control']as const)('rejects an invalid %s without silently correcting it',kind=>{
 const a=profile(),b={...profile(),id:'two',name:'다른 설정'}
 if(kind==='size')(a.setup as any).pageSize='a3';if(kind==='orientation')(a.setup as any).orientation='sideways'
 if(kind==='margin')a.setup.pageMarginMm=2;if(kind==='staff')a.setup.staffSizePercent=126;if(kind==='spacing')a.setup.systemSpacingPercent=79;if(kind==='nan')a.setup.pageMarginMm=NaN
 if(kind==='duplicate-id')b.id=a.id;if(kind==='duplicate-name')b.name=a.name;if(kind==='empty')a.name=' ';if(kind==='long')a.name='가'.repeat(41);if(kind==='control')a.name='bad\0name'
 expect(()=>decodePrintPageProfiles(JSON.stringify({version:1,profiles:[a,b]}))).toThrow()
})
it('stores an independent normalized snapshot, preserves fractions and reloads without project data',()=>{
 const h=renderHook(usePrintPageProfiles),value=structuredClone(setup);let id=''
 act(()=>{id=h.result.current.add('  한글\n설정  ',value).id!});expect(id).toBeTruthy();expect(h.result.current.profiles[0]).toEqual({id,name:'한글 설정',setup})
 value.pageMarginMm=12;expect(h.result.current.profiles[0].setup.pageMarginMm).toBe(8.5)
 act(()=>{expect(h.result.current.add('한글 설정',setup).error).toContain('같은 이름')});expect(h.result.current.profiles).toHaveLength(1)
 const saved=structuredClone(h.result.current.profiles);h.unmount();const reopened=renderHook(usePrintPageProfiles);expect(reopened.result.current.profiles).toEqual(saved)
 const raw=JSON.parse(localStorage.getItem(key)!);expect(Object.keys(raw.profiles[0]).sort()).toEqual(['id','name','setup']);expect(Object.keys(raw.profiles[0].setup).sort()).toEqual(Object.keys(setup).sort())
})
it('updates and deletes only the requested snapshot and rejects stale IDs',()=>{
 const h=renderHook(usePrintPageProfiles);let first='',second=''
 act(()=>{first=h.result.current.add('첫 설정',setup).id!;second=h.result.current.add('이웃 설정',setup).id!})
 const next={...setup,pageMarginMm:12};act(()=>{expect(h.result.current.update(first,next)).toBe(true);expect(h.result.current.update('missing',next)).toBe(false)})
 next.pageMarginMm=20;expect(h.result.current.profiles.find(p=>p.id===first)?.setup.pageMarginMm).toBe(12);expect(h.result.current.profiles.find(p=>p.id===second)?.setup).toEqual(setup)
 act(()=>{expect(h.result.current.remove(first)).toBe(true);expect(h.result.current.remove(first)).toBe(false)});expect(h.result.current.profiles.map(p=>p.id)).toEqual([second])
})
it('keeps a session list with a truthful warning when the device write fails',()=>{
 const h=renderHook(usePrintPageProfiles),target=Object.getPrototypeOf(localStorage)===Storage.prototype?Storage.prototype:localStorage
 vi.spyOn(target,'setItem').mockImplementation(()=>{throw Error('owned quota')})
 act(()=>{expect(h.result.current.add('세션 설정',setup).id).toBeTruthy()});expect(h.result.current.profiles).toHaveLength(1);expect(h.result.current.storageIssue).toContain('세션에서만')
})
it('limits count and names without replacing or truncating existing profiles',()=>{
 const h=renderHook(usePrintPageProfiles)
 for(let n=0;n<20;n++)act(()=>{expect(h.result.current.add('설정 '+n,setup).id).toBeTruthy()})
 const saved=localStorage.getItem(key)
 act(()=>{expect(h.result.current.add('추가',setup).error).toContain('20개');expect(h.result.current.add('가'.repeat(41),setup).error).toContain('1–40자')})
 expect(localStorage.getItem(key)).toBe(saved);expect(h.result.current.profiles).toHaveLength(20)
})
