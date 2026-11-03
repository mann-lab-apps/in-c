import { open, rename, rm, mkdir, rmdir, type FileHandle } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { pngDimensions, validatePngExport, type PngPage } from '../image-export/png'

export async function savePngFile(filePath: string, bytes: Uint8Array): Promise<void> {
  pngDimensions(bytes)
  const temporary = join(dirname(filePath), `.studio-png-${randomUUID()}.tmp`)
  try {
    const handle = await open(temporary,'wx',0o600)
    try { await handle.writeFile(bytes);await handle.sync() } finally { await handle.close() }
    await rename(temporary,filePath)
  } finally { await rm(temporary,{force:true}) }
}

export async function savePngBatch(parent: string, name: string, input: PngPage[],
  write: (handle: FileHandle, bytes: Uint8Array) => Promise<void> = async(handle,bytes)=>{await handle.writeFile(bytes);await handle.sync()}): Promise<string> {
  const {pages} = validatePngExport({suggestedName:name,pages:input})
  let folder: string | undefined
  for (let i=1;i<=100;i++) {
    const candidate=join(parent,`${name}-png${i===1?'':` (${i})`}`)
    try { await mkdir(candidate,{mode:0o700});folder=candidate;break } catch(error) { if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error }
  }
  if(!folder)throw new Error('PNG 출력 폴더 이름을 만들 수 없습니다.')
  const created: string[]=[]
  try {
    for(const page of pages){
      const target=join(folder,`${name}-p${String(page.pageNumber).padStart(4,'0')}.png`),handle=await open(target,'wx',0o600)
      created.push(target)
      try { await write(handle,page.bytes) } finally { await handle.close() }
    }
    return folder
  } catch(error) {
    // Never recursively remove a directory selected by the user or unknown files.
    for(const target of created)await rm(target,{force:true}).catch(()=>undefined)
    await rmdir(folder).catch(()=>undefined)
    throw error
  }
}
