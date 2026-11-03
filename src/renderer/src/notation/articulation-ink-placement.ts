import type { SystemInk } from './system-ink-spacing'

type Bounds = Pick<SystemInk, 'x' | 'y' | 'width' | 'height'>
interface Input {
  mark: Bounds
  heads: readonly Bounds[]
  stems: readonly Bounds[]
  staffLines: readonly Bounds[]
  obstacles: readonly Bounds[]
  stemDirection: number
  lane: 'neutral' | 'upper' | 'lower'
  anchor?: 'note' | 'staff'
  fixedAbove?: boolean
}
const valid = (b: Bounds) => [b.x,b.y,b.width,b.height].every(Number.isFinite) && b.width > 0 && b.height > 0

/** Layout only: associate marks with real head/stem ink, optionally outside the staff. */
export function resolveNearNoteArticulationOffset(input: Input): { x: number; y: number; side: 'above' | 'below' } | undefined {
  const { mark, stemDirection, lane } = input
  const heads = input.heads.filter(valid)
  if (!valid(mark) || !heads.length || ![1,-1].includes(stemDirection)) return undefined
  const side = input.fixedAbove ? 'above' : lane === 'neutral' ? (stemDirection === 1 ? 'below' : 'above') : (stemDirection === 1 ? 'above' : 'below')
  const left = Math.min(...heads.map(b=>b.x)), right = Math.max(...heads.map(b=>b.x+b.width))
  const x = (left+right-mark.width)/2-mark.x
  const stemSide = stemDirection === 1 ? 'above' : 'below'
  const noteBoundary = side === stemSide ? [...heads,...input.stems.filter(valid)] : heads
  const boundaryInk = input.anchor === 'staff' ? [...noteBoundary,...input.staffLines.filter(valid)] : noteBoundary
  const boundary = side === 'above' ? Math.min(...boundaryInk.map(b=>b.y)) : Math.max(...boundaryInk.map(b=>b.y+b.height))
  let top = side === 'above' ? boundary-8-mark.height : boundary+8
  const constraints = [
    ...input.obstacles.filter(valid).map(b=>({ ...b, gap:8 })),
    ...input.staffLines.filter(valid).map(b=>({ ...b, gap:1 }))
  ].filter(b=>Math.min(mark.x+x+mark.width,b.x+b.width)>Math.max(mark.x+x,b.x))
  // Every correction is outward. A later obstacle cannot undo an earlier gap.
  for(let pass=0;pass<constraints.length+2;pass++) {
    const previous=top
    for(const b of constraints) {
      if(top+mark.height<=b.y-b.gap+0.00001 || top>=b.y+b.height+b.gap-0.00001) continue
      top=side==='above'?Math.min(top,b.y-b.gap-mark.height):Math.max(top,b.y+b.height+b.gap)
    }
    if(Math.abs(top-previous)<0.00001) break
  }
  const delta=top-mark.y
  const y=side==='above'?Math.floor(delta*10000+1e-6)/10000:Math.ceil(delta*10000-1e-6)/10000
  return {x,y,side}
}
