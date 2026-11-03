import { PNG_LIMITS } from '../../../image-export/png'
export type PngDpi = 150 | 300

/** A measured output range is safe to show;native/disk diagnostics remain private. */
export class PngPageRangeError extends Error {
  constructor(readonly totalPages: number) {
    super(`출력 시작 시점의 악보는 ${totalPages}쪽입니다. PNG 페이지 번호를 1–${totalPages} 사이로 바꾼 뒤 다시 출력해 주세요.`)
    this.name = 'PngPageRangeError'
  }
}

export function planPngPages(source: { width: number; height: number }, paper: { pageSize: 'a4' | 'letter'; orientation: 'portrait' | 'landscape'; pageMarginMm: number }, dpi: PngDpi) {
  if (![source.width, source.height, paper.pageMarginMm].every(Number.isFinite) || source.width <= 0 || source.height <= 0 || ![150,300].includes(dpi)) throw new Error('이미지 지면 크기가 올바르지 않습니다.')
  let [widthMm, heightMm] = paper.pageSize === 'letter' ? [215.9,279.4] : [210,297]
  if (paper.orientation === 'landscape') [widthMm,heightMm] = [heightMm,widthMm]
  const usableWidth = widthMm - paper.pageMarginMm * 2, usableHeight = heightMm - paper.pageMarginMm * 2
  if (paper.pageMarginMm < 0 || usableWidth <= 0 || usableHeight <= 0) throw new Error('이미지 여백이 올바르지 않습니다.')
  const pixelWidth = Math.round(widthMm / 25.4 * dpi), pixelHeight = Math.round(heightMm / 25.4 * dpi)
  if (pixelWidth * pixelHeight > PNG_LIMITS.pixels) throw new Error('이미지 해상도가 너무 큽니다.')
  const contentPageHeight = source.width * usableHeight / usableWidth
  const pageCount = Math.max(1, Math.ceil(source.height / contentPageHeight - 1e-10))
  if (![contentPageHeight, source.width * widthMm / usableWidth, source.width * heightMm / usableWidth].every(v => Number.isFinite(v) && v > 0) || !Number.isSafeInteger(pageCount) || pageCount > 10000) throw new Error('이미지 페이지 수가 너무 많습니다. 악보를 나누어 출력해 주세요.')
  return { pixelWidth, pixelHeight, contentPageHeight, margin: source.width * paper.pageMarginMm / usableWidth,
    paperWidth: source.width * widthMm / usableWidth, paperHeight: source.width * heightMm / usableWidth,
    pageCount }
}
