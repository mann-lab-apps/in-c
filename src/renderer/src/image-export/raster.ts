import type { PngPage } from '../../../image-export/png'
import { PNG_LIMITS, withPngResolution } from '../../../image-export/png'
import type { PrintLayoutPlan } from '../notation/print-layout'
import { planPngPages, PngPageRangeError, type PngDpi } from './pages'

const SVG = 'http://www.w3.org/2000/svg', HTML = 'http://www.w3.org/1999/xhtml'
function clonePrintedPage(host: HTMLElement): HTMLElement {
  const clone = host.cloneNode(true) as HTMLElement
  const source = [host, ...host.querySelectorAll<HTMLElement | SVGElement>('*')]
  const target = [clone, ...clone.querySelectorAll<HTMLElement | SVGElement>('*')]
  for (let i = 0; i < source.length; i++) {
    const style = getComputedStyle(source[i])
    for (const key of style) if (!key.startsWith('--')) target[i].style.setProperty(key, style.getPropertyValue(key), style.getPropertyPriority(key))
    for (const attr of [...target[i].attributes]) {
      if (attr.name.startsWith('on') || ['src','href','xlink:href'].includes(attr.name) && !attr.value.startsWith('#') && !attr.value.startsWith('data:')) throw new Error('외부 자원이 포함된 이미지는 출력할 수 없습니다.')
    }
  }
  clone.style.position = 'relative';clone.style.left = clone.style.top = '0px';clone.style.margin = '0px'
  return clone
}

export async function rasterizePngPages(root: HTMLElement, plan: PrintLayoutPlan, dpi: PngDpi,
  selectedPage: number | 'all', current: () => boolean, progress: (done: number, total: number) => void): Promise<{ pages: PngPage[]; totalPages: number }> {
  const check = () => { if (!current()) throw new DOMException('출력 대상 문서가 바뀌었습니다.', 'AbortError') }
  check();await document.fonts.ready;check()
  const host = root.querySelector<HTMLElement>('.score-page')
  if (!host) throw new Error('PNG 악보를 준비하지 못했습니다.')
  const rect = host.getBoundingClientRect(), geometry = planPngPages(rect, plan.pageSetup, dpi)
  if (selectedPage === 'all' && geometry.pageCount > PNG_LIMITS.pages) throw new Error('PNG 페이지가 너무 많습니다. 페이지를 나누어 저장해 주세요.')
  const numbers = selectedPage === 'all' ? Array.from({ length: geometry.pageCount }, (_, i) => i + 1) : [selectedPage]
  if (numbers.length > PNG_LIMITS.pages || numbers.some(n => !Number.isSafeInteger(n) || n < 1 || n > geometry.pageCount || n > 10000)) throw new PngPageRangeError(geometry.pageCount)
  const fonts = (await import('virtual:studio-export-fonts')).default;check()
  const clone = clonePrintedPage(host);clone.style.width = `${rect.width}px`;clone.style.height = `${rect.height}px`
  const pages: PngPage[] = [];let bytes = 0
  for (const [index, pageNumber] of numbers.entries()) {
    check();progress(index, numbers.length)
    const svg = document.createElementNS(SVG, 'svg')
    svg.setAttribute('xmlns', SVG);svg.setAttribute('width', String(geometry.pixelWidth));svg.setAttribute('height', String(geometry.pixelHeight))
    svg.setAttribute('viewBox', `0 0 ${geometry.paperWidth} ${geometry.paperHeight}`)
    const style = document.createElementNS(SVG, 'style');style.textContent = fonts;svg.append(style)
    const background = document.createElementNS(SVG, 'rect')
    background.setAttribute('width', '100%');background.setAttribute('height', '100%');background.setAttribute('fill', 'white');svg.append(background)
    const clipId = `studio-png-${crypto.randomUUID()}`
    const clip = document.createElementNS(SVG, 'clipPath');clip.id = clipId;clip.setAttribute('clipPathUnits','userSpaceOnUse')
    const clipRect = document.createElementNS(SVG, 'rect')
    for (const [k,v] of Object.entries({ x:geometry.margin, y:geometry.margin, width:rect.width, height:geometry.contentPageHeight })) clipRect.setAttribute(k,String(v))
    clip.append(clipRect);const defs=document.createElementNS(SVG,'defs');defs.append(clip);svg.append(defs)
    const group = document.createElementNS(SVG,'g');group.setAttribute('clip-path',`url(#${clipId})`)
    const foreign = document.createElementNS(SVG, 'foreignObject')
    for (const [k,v] of Object.entries({x:geometry.margin,y:geometry.margin-(pageNumber-1)*geometry.contentPageHeight,width:rect.width,height:rect.height})) foreign.setAttribute(k,String(v))
    const wrapper = document.createElementNS(HTML, 'div');wrapper.setAttribute('xmlns',HTML);wrapper.style.cssText=`position:relative;width:${rect.width}px;height:${rect.height}px;margin:0;padding:0;background:white;color:black;`
    wrapper.append(clone);foreign.append(wrapper);group.append(foreign);svg.append(group)
    const image = new Image(), canvas = document.createElement('canvas')
    try {
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg))
      let timeout: ReturnType<typeof setTimeout> | undefined
      try {
        await Promise.race([image.decode(), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('PNG 이미지 준비 시간이 초과되었습니다. 다시 시도해 주세요.')), 30000) })])
      } finally { clearTimeout(timeout) }
      check()
      canvas.width = geometry.pixelWidth;canvas.height = geometry.pixelHeight
      const context = canvas.getContext('2d');if (!context) throw new Error('PNG 이미지를 그릴 수 없습니다.')
      context.drawImage(image,0,0,canvas.width,canvas.height)
      const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG 파일을 만들지 못했습니다.')), 'image/png'))
      const data = withPngResolution(new Uint8Array(await blob.arrayBuffer()), dpi);check();bytes += data.length
      if (data.length > PNG_LIMITS.pageBytes || bytes > PNG_LIMITS.totalBytes) throw new Error('PNG 출력이 너무 큽니다. 해상도를 낮추거나 페이지를 나누어 저장해 주세요.')
      pages.push({pageNumber,bytes:data});progress(index+1,numbers.length)
    } finally { image.src='';canvas.width=canvas.height=0 }
  }
  return { pages, totalPages: geometry.pageCount }
}
