// XML emits directions in part/staff/measure/tick order. The score's array can
// instead reflect edit order. Canonicalize only different anchors; retain every
// item and the authored order within the same anchor (including duplicates).
export function orderMeasureMarkingSignatures<T extends { measure?: string; tick?: number }>(items: T[]): T[] {
  return items.slice().sort((a,b)=>{
    const left=a.measure?.split(':').map(Number)??[],right=b.measure?.split(':').map(Number)??[]
    for(let i=0;i<Math.max(left.length,right.length);i++){
      const difference=(left[i]??-1)-(right[i]??-1)
      if(difference)return difference
    }
    return (a.tick??0)-(b.tick??0)
  })
}
