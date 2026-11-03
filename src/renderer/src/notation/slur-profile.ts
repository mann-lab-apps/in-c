/** Filled, pointed contour inside the original constant-width stroke envelope.
 * The M/Q centerline remains the authority for endpoints, manual geometry,
 * collision planning and pointer targets. No score/schema data is rewritten.
 */
export function taperedSlurPath(centerline:string, thickness:number, ends={taperStart:true,taperEnd:true}):string|undefined {
  const t=centerline.trim().split(/\s+/)
  if(t.length!==8||t[0]!=='M'||t[3]!=='Q'||!Number.isFinite(thickness)||thickness<=0)return undefined
  const [x1,y1,cx,cy,x2,y2]=[1,2,4,5,6,7].map(i=>Number(t[i]))
  if(![x1,y1,cx,cy,x2,y2].every(Number.isFinite)||x2<=x1||cx<x1||cx>x2)return undefined
  if(ends.taperStart&&ends.taperEnd) return `M ${x1} ${y1} Q ${cx} ${cy-thickness} ${x2} ${y2} Q ${cx} ${cy+thickness} ${x1} ${y1} Z`
  const start=ends.taperStart?0:thickness/2,end=ends.taperEnd?0:thickness/2,middle=thickness/2
  return `M ${x1} ${y1-start} Q ${cx} ${cy-middle} ${x2} ${y2-end} L ${x2} ${y2+end} Q ${cx} ${cy+middle} ${x1} ${y1+start} Z`
}
