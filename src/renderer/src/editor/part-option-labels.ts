// Presentation only. Keep IDs, authored names and engraving labels untouched.
export function createPartOptionLabels(parts:readonly {name:string}[]):string[] {
  const duplicateNames=new Set(parts.map(part=>part.name)).size!==parts.length
  return parts.map((part,index)=>duplicateNames?`${index+1} · ${part.name}`:part.name)
}
