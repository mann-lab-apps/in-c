// Renderer-only tooling, kept outside application dependencies.
// npm install --prefix out/brand-tools --no-save --package-lock=false @resvg/resvg-js@2.6.2
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const root = resolve(import.meta.dirname, '..')
const toolRoot = resolve(process.env.DDIRORI_ICON_TOOLS || join(root, 'out/brand-tools'))
const require = createRequire(join(toolRoot, 'package.json'))
const { Resvg } = require('@resvg/resvg-js')
const version = require('@resvg/resvg-js/package.json').version
if (version !== '2.6.2') throw Error('Use pinned @resvg/resvg-js 2.6.2')
const svg = readFileSync(join(root, 'build/icon.svg'))
const png = size => new Resvg(svg, { fitTo: {mode:'width',value:size} }).render().asPng()
writeFileSync(join(root, 'build/icon.png'), png(1024))
// Windows ICO contains standard PNG frames, including 256px for high DPI.
const sizes=[16,24,32,48,64,128,256], frames=sizes.map(png)
const header=Buffer.alloc(6+16*sizes.length); header.writeUInt16LE(1,2); header.writeUInt16LE(sizes.length,4)
let offset=header.length
frames.forEach((frame,i)=>{const at=6+16*i,size=sizes[i];header[at]=size===256?0:size;header[at+1]=header[at];header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(frame.length,at+8);header.writeUInt32LE(offset,at+12);offset+=frame.length})
writeFileSync(join(root,'build/icon.ico'),Buffer.concat([header,...frames]))
if(process.platform!=='darwin') throw Error('ICNS generation requires macOS iconutil; PNG/ICO rendered')
const temporary=mkdtempSync(join(tmpdir(),'studio-icons-')),iconset=join(temporary,'Studio.iconset');mkdirSync(iconset)
try{
  for(const size of [16,32,128,256,512]){
    writeFileSync(join(iconset,`icon_${size}x${size}.png`),png(size))
    writeFileSync(join(iconset,`icon_${size}x${size}@2x.png`),png(size*2))
  }
  execFileSync('iconutil',['-c','icns',iconset,'-o',join(root,'build/icon.icns')])
}finally{rmSync(temporary,{recursive:true,force:true})}
const sha=p=>createHash('sha256').update(readFileSync(join(root,p))).digest('hex')
console.log(JSON.stringify({source:'build/icon.svg',sourceSha256:sha('build/icon.svg'),renderer:`@resvg/resvg-js ${version}`,icns:'macOS iconutil',outputs:['build/icon.png','build/icon.ico','build/icon.icns'].map(path=>({path,sha256:sha(path)}))},null,2))
