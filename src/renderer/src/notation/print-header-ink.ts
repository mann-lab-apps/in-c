interface HeaderInk { x:number; y:number; width:number; height:number }
interface TextRun { left:number; right:number; top:number; height:number; text:string }

/** DOM ranges locate each rendered line, not its painted bounds. Canvas ink
 * metrics supply the glyph envelope; font bounds only locate the baseline
 * within the range. Empty placeholders/collapsed whitespace have no ink. */
export function readPrintHeaderInk(header:HTMLElement, context:CanvasRenderingContext2D):HeaderInk[] {
  const result:HeaderInk[]=[],walker=document.createTreeWalker(header,NodeFilter.SHOW_TEXT)
  while(walker.nextNode()) {
    const node=walker.currentNode,parent=node.parentElement,text=node.textContent
    if(!parent || !text?.trim())continue
    const style=getComputedStyle(parent)
    if(style.display==='none' || style.visibility==='hidden' || style.opacity==='0')continue
    const range=document.createRange()
    if(typeof range.getBoundingClientRect!=='function')continue // Non-rendering DOM tests.
    const runs:TextRun[]=[]
    for(let i=0;i<text.length;i++) {
      range.setStart(node,i);range.setEnd(node,i+1)
      const r=range.getBoundingClientRect(),char=text[i]
      if(![r.left,r.top,r.width,r.height].every(Number.isFinite) || r.height<=0 || (r.width<=0&&!char.trim()))continue
      const value=/[\t\r\n\f ]/.test(char)&&['normal','nowrap','pre-line'].includes(style.whiteSpace)?' ':char
      const run=runs.find(run=>Math.abs(run.top-r.top)<.25&&Math.abs(run.height-r.height)<.25)
      if(run){run.left=Math.min(run.left,r.left);run.right=Math.max(run.right,r.left+r.width);run.text+=value}
      else runs.push({left:r.left,right:r.left+r.width,top:r.top,height:r.height,text:value})
    }
    context.save()
    try {
      context.font=style.font;context.textAlign='left';context.textBaseline='alphabetic'
      context.direction=style.direction==='rtl'?'rtl':'ltr'
      context.fontKerning=style.fontKerning==='none'?'none':style.fontKerning==='normal'?'normal':'auto'
      if('letterSpacing' in context)context.letterSpacing=style.letterSpacing==='normal'?'0px':style.letterSpacing
      if('wordSpacing' in context)context.wordSpacing=style.wordSpacing==='normal'?'0px':style.wordSpacing
      for(const run of runs) {
        if(!run.text.trim())continue
        const m=context.measureText(run.text)
        const values=[m.fontBoundingBoxAscent,m.fontBoundingBoxDescent,m.actualBoundingBoxLeft,m.actualBoundingBoxRight,m.actualBoundingBoxAscent,m.actualBoundingBoxDescent]
        if(!values.every(Number.isFinite))throw new Error('출력할 머리말 글자를 측정하지 못했습니다. 다시 시도해 주세요.')
        const baseline=run.top+(run.height-m.fontBoundingBoxAscent-m.fontBoundingBoxDescent)/2+m.fontBoundingBoxAscent
        const width=m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent
        if(width>0&&height>0)result.push({x:run.left-m.actualBoundingBoxLeft,y:baseline-m.actualBoundingBoxAscent,width,height})
      }
    } finally {context.restore()}
  }
  return result
}
