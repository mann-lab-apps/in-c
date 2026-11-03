import type { ScorePageSetup } from '../../../score-core'
import { planPngPages } from '../image-export/pages'
import { readSvgShapeInk, readSvgTextInk } from './staff-ink-spacing'
import { readPrintSystemInk } from './print-system-ink'
import { readPrintHeaderInk } from './print-header-ink'

export type PrintPageInkIssue =
  | { afterPage: number; kind: 'staff' | 'symbol' | 'header' | 'part-label'; axis?: 'vertical' }
  | { axis: 'horizontal'; page: number; kind: 'staff' | 'symbol' | 'header' | 'part-label' }
  | { kind: 'system'; axis?: 'vertical'; systemIndex: number; actualHeight: number; availableHeight: number }
type PageSelection = number | 'all'
const ROUNDING = .25

/** The physical slice is shared by PDF and PNG; a staff must stay intact even
 * when the boundary happens to pass through the space between two staff lines. */
export function crossingPrintPage(top: number, bottom: number, pageHeight: number, page: PageSelection = 'all'): number | undefined {
  if (![top,bottom,pageHeight].every(Number.isFinite) || bottom <= top || pageHeight <= 0) return
  const first = Math.max(1, Math.floor((top + ROUNDING) / pageHeight) + 1)
  const last = Math.ceil((bottom - ROUNDING) / pageHeight) - 1
  if (first > last) return
  if (page === 'all') return first
  for (const boundary of [page - 1,page]) if (boundary >= first && boundary <= last) return boundary
}

export class PrintPageInkError extends Error {
  constructor(readonly issue: PrintPageInkIssue) {
    const kind = issue.kind === 'staff' ? '보표' : issue.kind === 'header' ? '제목·작곡가 글자' : issue.kind === 'part-label' ? '파트 이름·약어' : '음악 기호'
    const partLabelGuidance = '형식 > 악보 설정에서 파트 이름·약어를 줄인 뒤 다시 출력해 주세요. 입력한 이름과 악보는 유지됩니다.'
    super(issue.kind === 'system'
      ? `${issue.systemIndex+1}번째 악보단의 높이가 용지의 출력 가능한 영역보다 큽니다. PDF 페이지 설정에서 보표 크기·용지 방향을 바꾸거나 파트보로 전환한 뒤 다시 출력해 주세요. 악보와 수동 배치는 유지됩니다.`
      : issue.axis === 'horizontal'
      ? `${issue.page}쪽의 ${kind}가 가로 출력 영역을 벗어납니다. `+(issue.kind==='header'
        ? '악보 정보에서 문구를 조정하거나 PDF 페이지 설정을 바꾼 뒤 다시 출력해 주세요. 원본 문구와 악보는 유지됩니다.'
        : issue.kind==='part-label' ? partLabelGuidance
        : '표기의 가로 이동을 줄이거나 자동 배치로 되돌린 뒤 다시 출력해 주세요. 악보와 수동 배치는 유지됩니다.')
      : `${issue.afterPage}–${issue.afterPage+1}쪽 사이에서 ${kind}가 나뉩니다. `+(issue.kind==='header'
        ? '악보 정보에서 문구를 조정하거나 PDF 페이지 설정을 바꾼 뒤 다시 출력해 주세요. 원본 문구와 악보는 유지됩니다.'
        : issue.kind==='part-label' ? partLabelGuidance
        : 'PDF 페이지 설정에서 용지 방향이나 보표 크기를 바꾸거나 파트보로 전환한 뒤 다시 출력해 주세요.'))
    this.name = 'PrintPageInkError'
  }
}

/** Renderer-owned identities, not inferred positions: multiple short systems
 * may legitimately span pages. Old snapshots retain the per-ink guard below. */
function readSystemOwnership(svg: SVGSVGElement) {
  try {
    const rawOrigins: unknown = JSON.parse(svg.getAttribute('data-print-system-origins') ?? 'null')
    const rawMeasures: unknown = JSON.parse(svg.getAttribute('data-print-measure-systems') ?? 'null')
    if (!Array.isArray(rawOrigins) || !Array.isArray(rawMeasures)) return
    const origins = new Map<number,number>(), measureSystems = new Map<string,number|undefined>()
    for (const entry of rawOrigins) {
      if (!Array.isArray(entry) || entry.length !== 2 || !Number.isInteger(entry[0]) || entry[0] < 0 ||
        !Number.isFinite(entry[1]) || origins.has(entry[0])) return
      origins.set(entry[0],entry[1])
    }
    for (const entry of rawMeasures) {
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || !entry[0] || measureSystems.has(entry[0]) ||
        (entry[1] !== null && (!Number.isInteger(entry[1]) || !origins.has(entry[1])))) return
      measureSystems.set(entry[0],entry[1] ?? undefined)
    }
    return {origins,measureSystems}
  } catch { return }
}

export function assertPrintPageInk(root: HTMLElement, paper: Required<ScorePageSetup>, page: PageSelection = 'all'): void {
  const host = root.querySelector<HTMLElement>('.score-page')
  if (!host) return
  const hostRect = host.getBoundingClientRect()
  // Non-rendering test environments have no SVG metrics. Production callers
  // wait for the actual print snapshot and fonts before invoking this check.
  const svgs = [...host.querySelectorAll<SVGSVGElement>('.notation-preview svg')]
    .filter(svg => typeof svg.getCTM === 'function')
  if (!svgs.length || hostRect.width <= 0 || hostRect.height <= 0) return
  const {contentPageHeight} = planPngPages(hostRect,paper,150)
  const context = document.createElement('canvas').getContext('2d')
  if (!context) throw new Error('출력할 음악 기호를 측정하지 못했습니다. 다시 시도해 주세요.')
  const header=host.querySelector<HTMLElement>('.score-title')
  if(header)for(const ink of readPrintHeaderInk(header,context)) {
    const top=ink.y-hostRect.top,bottom=top+ink.height
    const afterPage=crossingPrintPage(top,bottom,contentPageHeight,page)
    if(afterPage!==undefined)throw new PrintPageInkError({kind:'header',afterPage})
    const left=ink.x-hostRect.left,right=left+ink.width
    const affected=page==='all'?Math.max(1,Math.floor((top+ROUNDING)/contentPageHeight)+1):page
    if((left < -ROUNDING || right > hostRect.width+ROUNDING) && bottom>(affected-1)*contentPageHeight && top<affected*contentPageHeight)
      throw new PrintPageInkError({kind:'header',axis:'horizontal',page:affected})
  }
  for (const svg of svgs) {
    const box = svg.viewBox.baseVal, rect = svg.getBoundingClientRect()
    if (box.width <= 0 || rect.width <= 0) continue
    const scale = rect.width / box.width, offset = rect.top - hostRect.top - box.y * scale
    const offsetX = rect.left - hostRect.left - box.x * scale
    const ownership = readSystemOwnership(svg)
    if (ownership) {
      const {bands} = readPrintSystemInk(svg,context,ownership.origins,ownership.measureSystems)
      for (const band of bands) {
        const top = offset + band.top * scale, bottom = offset + band.bottom * scale
        if (bottom - top > contentPageHeight + ROUNDING &&
          (page === 'all' || (bottom > (page-1)*contentPageHeight && top < page*contentPageHeight))) {
          throw new PrintPageInkError({kind:'system',systemIndex:band.systemIndex,actualHeight:bottom-top,availableHeight:contentPageHeight})
        }
      }
    }
    const check = (bounds: {x:number;y:number;width:number;height:number} | undefined, kind: 'staff' | 'symbol' | 'part-label') => {
      if (!bounds) return
      const top = offset + bounds.y * scale, bottom = offset + (bounds.y + bounds.height) * scale
      const afterPage = crossingPrintPage(top,bottom,contentPageHeight,page)
      if (afterPage !== undefined) throw new PrintPageInkError({afterPage,kind})
      const left = offsetX + bounds.x * scale, right = offsetX + (bounds.x + bounds.width) * scale
      if (left < -ROUNDING || right > hostRect.width + ROUNDING) {
        // A selected safe page must remain printable even if another page's
        // authored geometry overflows. Use physical ink overlap, not SVG height.
        const affected = page === 'all' ? Math.max(1,Math.floor((top + ROUNDING) / contentPageHeight) + 1) : page
        if (bottom > (affected - 1) * contentPageHeight && top < affected * contentPageHeight) {
          throw new PrintPageInkError({axis:'horizontal',page:affected,kind})
        }
      }
    }
    for (const stave of svg.querySelectorAll<SVGGElement>('.vf-stave')) {
      const ink = [...stave.querySelectorAll<SVGGraphicsElement>('path,line')].map(readSvgShapeInk).filter(b => b !== undefined)
      if (ink.length) {
        const top = Math.min(...ink.map(b => b.y)), bottom = Math.max(...ink.map(b => b.y + b.height))
        const left = Math.min(...ink.map(b => b.x)), right = Math.max(...ink.map(b => b.x + b.width))
        check({x:left,y:top,width:right-left,height:bottom-top},'staff')
      }
    }
    for (const node of svg.querySelectorAll<SVGTextContentElement>('text')) {
      if (!node.closest('defs,clipPath,mask')) check(readSvgTextInk(node,context),node.classList.contains('notation-staff-label')?'part-label':'symbol')
    }
    for (const node of svg.querySelectorAll<SVGGraphicsElement>('path,line,circle,ellipse,polygon,polyline,rect')) {
      if (!node.closest('defs,clipPath,mask,.notation-measure-layer') && !node.classList.contains('notation-span-hit')) check(readSvgShapeInk(node),'symbol')
    }
  }
}
