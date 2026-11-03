import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { expect, it } from 'vitest'
import { createScore } from '../score-core'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { toFileName } from '../renderer/src/editor/file-lifecycle'
import { NativeProjectFileSession } from './project-files'
import { NativeProjectBackupStore } from './project-backups'

it.each(['x','가'])('atomically saves and reopens an app-suggested long %s name without leftover temp files',async character=>{
 const root=await mkdtemp(join(tmpdir(),'studio-long-native-'))
 try{
  const title=character.repeat(1000),name=toFileName(title)+'.chromatics',file=join(root,name),project=createNativeProject(createScore({title}))
  expect(Buffer.byteLength(name)).toBe(251)
  const session=new NativeProjectFileSession(async()=>{})
  session.authorizeSave(file);await session.save(file,project)
  expect(await readFile(file,'utf8')).toBe(encodeNativeProject(project))
  expect(await new NativeProjectFileSession(async()=>{}).open(file)).toEqual(project)
  expect(await readdir(root)).toEqual([name])
 }finally{await rm(root,{recursive:true,force:true})}
})
it.each(['x','가'])('backs up a valid long %s source without renaming or changing its native content',async character=>{
 const root=await mkdtemp(join(tmpdir(),'studio-long-backup-'))
 try{
  const project=createNativeProject(createScore({title:character.repeat(1000)})),bytes=encodeNativeProject(project),file=join(root,toFileName(project.score.title)+'.chromatics'),directory=join(root,'backups')
  await writeFile(file,bytes)
  const store=new NativeProjectBackupStore(()=>directory);await store.create(file)
  const entries=await store.list();expect(entries).toHaveLength(1);expect(entries[0].error).toBeUndefined()
  expect(entries[0].title).toBe(project.score.title);expect(Buffer.byteLength(entries[0].fileName)).toBeLessThanOrEqual(251)
  expect(await store.read(entries[0].id)).toBe(bytes);expect(await readFile(file,'utf8')).toBe(bytes)
  expect((await readdir(directory)).filter(name=>name.endsWith('.tmp'))).toEqual([])
 }finally{await rm(root,{recursive:true,force:true})}
})
it.each(['native-without-extension','Native.CHRoMATICS'])('discovers a validated native backup of %s by its internal native extension',async name=>{
 const root=await mkdtemp(join(tmpdir(),'studio-backup-extension-'))
 try{
  const bytes=encodeNativeProject(createNativeProject(createScore({title:'Source filename stays unchanged'}))),file=join(root,name),store=new NativeProjectBackupStore(()=>join(root,'backups'))
  await writeFile(file,bytes);await store.create(file)
  const entries=await store.list();expect(entries).toHaveLength(1);expect(entries[0].fileName.endsWith('.chromatics')).toBe(true)
  expect(await store.read(entries[0].id)).toBe(bytes);expect(await readFile(file,'utf8')).toBe(bytes)
 }finally{await rm(root,{recursive:true,force:true})}
})

// Distinct from injected backup callback errors: a real on-disk backup-directory
// collision must preserve both the source and the caller's opened revision.
it('preserves a long source and cleans atomic temp files after real backup IO failure, then retries',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-real-backup-failure-'))
 try{
  const project=createNativeProject(createScore({title:'Before real backup failure'})),before=encodeNativeProject(project),file=join(root,toFileName('x'.repeat(1000))+'.chromatics'),directory=join(root,'backups')
  await writeFile(file,before);await writeFile(directory,'Owned blocking file')
  const store=new NativeProjectBackupStore(()=>directory),session=new NativeProjectFileSession(path=>store.create(path))
  await session.open(file);project.score.title='Retry preserves actual edit'
  await expect(session.save(file,project)).rejects.toMatchObject({code:'EEXIST'})
  expect(await readFile(file,'utf8')).toBe(before)
  expect(await readFile(directory,'utf8')).toBe('Owned blocking file')
  expect((await readdir(root)).filter(name=>name.endsWith('.tmp'))).toEqual([])
  await rm(directory);await session.save(file,project)
  expect(await readFile(file,'utf8')).toBe(encodeNativeProject(project))
  const entries=await store.list();expect(entries).toHaveLength(1);expect(await store.read(entries[0].id)).toBe(before)
  expect((await readdir(root)).filter(name=>name.endsWith('.tmp'))).toEqual([])
 }finally{await rm(root,{recursive:true,force:true})}
})
