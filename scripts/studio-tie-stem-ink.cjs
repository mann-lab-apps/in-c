// Independent actual-stroke oracle. A tie is a filled lens, never a stroked
// centreline. Positive/alpha-zero probes validate the measurement itself.
module.exports = function sampleTieStemInk(value) {
  const {print,beam,accidentals}=typeof value==='object'?value:{print:value,beam:false}
  const root = document.querySelector(print ? '.studio-pdf-snapshot' : '.score-canvas')
  const svg = root.querySelector('svg')
  const visible = node => {
    for (let n = node; n; n = n.parentElement) {
      const s = getComputedStyle(n)
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false
      if (n === svg) break
    }
    return true
  }
  const beamGroups=beam?[...root.querySelectorAll('.vf-beam')].filter(g=>
    [...g.querySelectorAll('.vf-stem')].some(n=>n.dataset.slurStemEventId?.startsWith('other-note'))):[]
  const stems = [...root.querySelectorAll('.notation-event[data-voice-id="voice-2"] .vf-stem path'),
    ...beamGroups.flatMap(g=>[...g.querySelectorAll('.vf-stem path')].filter(n=>n.closest('.vf-stem').dataset.slurStemEventId?.startsWith('other-note')))]
    .filter(n => {
      const s = getComputedStyle(n), b = n.getBBox()
      return visible(n) && s.stroke !== 'none' && Number(s.strokeOpacity) > 0 && parseFloat(s.strokeWidth) > 0 && b.height > 0
    })
  const ties = [...root.querySelectorAll('.vf-stavetie path')].filter(visible)
  const bodies=beamGroups.flatMap(g=>[...g.querySelectorAll(':scope > path')]).filter(n=>{
    const s=getComputedStyle(n),b=n.getBBox()
    return visible(n)&&s.fill!=='none'&&Number(s.fillOpacity)>0&&b.width>0&&b.height>0
  })
  // VexFlow renders modifiers inside the notehead group, without an accidental
  // wrapper. Inspect actual SMuFL accidental text, not a nonexistent class.
  const glyphs=accidentals?[...root.querySelectorAll('.notation-event .vf-notehead text')]
    .filter(n=>visible(n)&&/[\uE260-\uE26F]/u.test(n.textContent)):[]
  const metrics=document.createElement('canvas').getContext('2d')
  return [...stems.map(n=>({node:n,kind:'stem'})),...bodies.map(n=>({node:n,kind:'beam'})),...glyphs.map(n=>({node:n,kind:'accidental'}))].map(({node:stem,kind}) => {
    const style = getComputedStyle(stem), pad = kind==='stem'?parseFloat(style.strokeWidth)/2:0
    let b=stem.getBBox()
    if(kind==='accidental'){
      metrics.font=style.font;const m=metrics.measureText(stem.textContent),p=stem.getStartPositionOfChar(0)
      b={x:p.x-m.actualBoundingBoxLeft,y:p.y-m.actualBoundingBoxAscent,width:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent}
    }
    const m = svg.getCTM().inverse().multiply(stem.getCTM())
    const points = [[b.x-pad,b.y-pad],[b.x+b.width+pad,b.y-pad],[b.x-pad,b.y+b.height+pad],[b.x+b.width+pad,b.y+b.height+pad]]
      .map(([x,y]) => new DOMPoint(x,y).matrixTransform(m))
    const left = Math.min(...points.map(p=>p.x))-1, top = Math.min(...points.map(p=>p.y))-1
    const width = Math.max(...points.map(p=>p.x))-left+1, height = Math.max(...points.map(p=>p.y))-top+1
    const scale = 8, canvas = document.createElement('canvas')
    canvas.width = Math.ceil(width*scale); canvas.height = Math.ceil(height*scale)
    const c = canvas.getContext('2d')
    const transform = node => {
      const t = svg.getCTM().inverse().multiply(node.getCTM())
      c.setTransform(scale*t.a,scale*t.b,scale*t.c,scale*t.d,scale*(t.e-left),scale*(t.f-top))
    }
    const clear = () => { c.resetTransform(); c.clearRect(0,0,canvas.width,canvas.height); c.globalAlpha=1 }
    const alpha = () => c.getImageData(0,0,canvas.width,canvas.height).data
    const paintStem = opacity => {
      transform(stem); c.strokeStyle=style.stroke; c.fillStyle=style.fill; c.lineWidth=parseFloat(style.strokeWidth)
      c.lineCap=style.strokeLinecap; c.lineJoin=style.strokeLinejoin
      c.globalAlpha=opacity
      if(kind==='stem')c.stroke(new Path2D(stem.getAttribute('d')))
      else if(kind==='accidental'){c.font=style.font;c.textBaseline='alphabetic';const p=stem.getStartPositionOfChar(0);c.fillText(stem.textContent,p.x,p.y)}
      else c.fill(new Path2D(stem.getAttribute('d')),style.fillRule)
    }
    const count = (a,z) => { let n=0; for(let i=3;i<a.length;i+=4)if(a[i]>=128&&(!z||z[i]>=128))n++; return n }
    paintStem(Number(style.opacity)*Number(kind==='stem'?style.strokeOpacity:style.fillOpacity)); const actual=alpha(); clear()
    c.fillStyle='#000';c.fillRect(0,0,canvas.width,canvas.height); const probe=alpha(); clear()
    paintStem(0); const transparent=alpha(); clear()
    const overlaps=ties.map((tie,index) => {
      const s=getComputedStyle(tie); transform(tie); c.fillStyle=s.fill
      c.globalAlpha=Number(s.opacity)*Number(s.fillOpacity)
      if(s.fill!=='none')c.fill(new Path2D(tie.getAttribute('d')),s.fillRule)
      const pixels=count(actual,alpha()); clear(); return {index,pixels}
    })
    return {kind,eventId:stem.closest('.notation-event')?.dataset.eventId??stem.closest('.vf-stem')?.dataset.slurStemEventId,path:stem.getAttribute('d'),text:kind==='accidental'?stem.textContent:undefined,
      rect:{x:left+1,y:top+1,width:width-2,height:height-2},positivePixels:count(actual),
      positiveProbe:count(actual,probe),transparentProbe:count(transparent,probe),overlaps}
  })
}
