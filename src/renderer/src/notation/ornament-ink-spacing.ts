interface Ink { x:number; y:number; width:number; height:number }
/** Associate automatic ornament ink with its painted staff, clearing owned notes. */
export function resolveOrnamentInkOffset(mark:Ink, obstacleTops:readonly number[], staffTop:number|undefined, staffY:number):number {
  if (![mark.x,mark.y,mark.width,mark.height].every(Number.isFinite) || mark.width<=0 || mark.height<=0) return 0
  const measured=Number.isFinite(staffTop)
  const boundary=measured?staffTop!:staffY-6
  if (!Number.isFinite(boundary)) return 0
  const top=Math.min(boundary,...obstacleTops.filter(Number.isFinite))
  const offset=top-6-(mark.y+mark.height)
  // A Stave origin is not its first painted line. With a measured boundary,
  // normalization can move down as well as up; missing metrics stay conservative.
  return measured?offset:Math.min(0,offset)
}
