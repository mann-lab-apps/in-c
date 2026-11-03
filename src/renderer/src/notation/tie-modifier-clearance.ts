import { resolveSlurFermataControlY } from './slur-fermata-spacing'

type Ink = { x: number; y: number; width: number; height: number }
export interface TieModifierCurve {
  firstX: number; lastX: number; firstYs: readonly number[]; lastYs: readonly number[]
  direction: number; yShift: number; cp1: number; cp2: number
}

/** Preserve tie endpoints,side and inter-member spacing;only deepen a bow that
 * meets measured interior ink. Split pieces can keep their original side and
 * endpoints while reserving a deeper bow with the effective VexFlow options.
 */
export function resolveTieModifierDepth(curve: TieModifierCurve, symbols: readonly Ink[]): number {
  const { firstX,lastX,firstYs,lastYs,direction,yShift,cp1,cp2 } = curve
  if (![firstX,lastX,direction,yShift,cp1,cp2].every(Number.isFinite) ||
    lastX <= firstX || ![-1,1].includes(direction) || !firstYs.length ||
    firstYs.length !== lastYs.length || [...firstYs,...lastYs].some(y=>!Number.isFinite(y))) return 0
  let extra=0
  const obstacles=symbols.map(s=>({...s,collisionOnly:true}))
  // The first pass preserves the existing maximum member correction. Moving
  // every member by that depth can sweep a previously clear parallel lens into
  // an obstacle, so recheck the shared result monotonically. Once a member has
  // passed an obstacle it cannot re-enter it; member/obstacle pairs bound passes.
  for(let pass=0;pass<=firstYs.length*symbols.length;pass++){
    const previous=extra
    for (let index=0;index<firstYs.length;index++) {
      const y1=firstYs[index]+yShift*direction,y2=lastYs[index]+yShift*direction
      // The centre and full conservative thickness cover the filled lens.
      const originalControlY=(y1+y2)/2+(cp1+cp2)/2*direction
      const controlY=originalControlY+previous*direction
      const needed=resolveSlurFermataControlY({x1:firstX,x2:lastX,controlX:(firstX+lastX)/2,y1,y2,controlY,
        side:direction<0?'above':'below',strokeWidth:Math.abs(cp2-cp1)},obstacles)
      extra=Math.max(extra,(needed-originalControlY)*direction)
    }
    if(extra-previous<=.05)break
  }
  return extra
}

/** Leave every ordinary tie exactly alone. When the default side is blocked,
 * prefer the opposite automatic side if it avoids an unnecessarily tall bow.
 * Both members still use the same VexFlow note anchors and added depth.
 */
export function resolveTieModifierPlacement(curve: TieModifierCurve, symbols: readonly Ink[]): { direction:number; depth:number } {
  const depth=resolveTieModifierDepth(curve,symbols)
  if(!depth)return{direction:curve.direction,depth}
  const opposite=resolveTieModifierDepth({...curve,direction:-curve.direction},symbols)
  return opposite<depth?{direction:-curve.direction,depth:opposite}:{direction:curve.direction,depth}
}
