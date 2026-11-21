// UI naming only. Ratios and rhythm validation remain in the existing model.
export function tupletInputLabel(ratio?: {actualNotes:number;normalNotes:number}): string {
  if (!ratio || (ratio.actualNotes===3&&ratio.normalNotes===2)) return '셋잇단음표'
  if (ratio.actualNotes===2&&ratio.normalNotes===3) return '2연음'
  if (ratio.actualNotes===5&&ratio.normalNotes===4) return '다섯잇단음표'
  if (ratio.actualNotes===7&&ratio.normalNotes===4) return '7연음'
  return `잇단음표(${ratio.actualNotes}:${ratio.normalNotes})`
}
