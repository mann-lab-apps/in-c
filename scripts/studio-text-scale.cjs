// Shared QA helper, evaluated in the renderer. It never scales score or print glyphs.
function scaleStudioChromeText() {
  const state = window.__textChoiceScale ??= { nodes: new Map(), roots: new Map() }
  for (const [n, value] of state.nodes) if (n.isConnected) n.style.fontSize = value
  for (const [n, values] of state.roots) if (n.isConnected) for (const [key, value] of values) n.style.setProperty(key, value)
  const roots = [...document.querySelectorAll('.ddirori')].filter(n => !n.closest('.score-canvas,.studio-pdf-snapshot'))
  const tokens = ['--dd-type-body', '--dd-type-label', '--dd-control-font']
  const rootSizes = roots.map(n => {
    if (!state.roots.has(n)) state.roots.set(n, tokens.map(key => [key, n.style.getPropertyValue(key)]))
    return [n, tokens.map(key => { const probe = document.createElement('span'); probe.style.fontSize = `var(${key})`; n.append(probe); const px = parseFloat(getComputedStyle(probe).fontSize); probe.remove(); return [key, px] })]
  })
  const sizes = [...document.querySelectorAll('.ddirori :is(button,input,select,summary,label,span,strong,output,h1,h2,h3,h4,p,dt,dd,code)')].filter(n => !n.closest('.score-canvas,.studio-pdf-snapshot')).map(n => { if (!state.nodes.has(n)) state.nodes.set(n, n.style.fontSize); return [n, parseFloat(getComputedStyle(n).fontSize)] })
  for (const [n, values] of rootSizes) for (const [key, px] of values) n.style.setProperty(key, `${px * 2}px`)
  for (const [n, px] of sizes) n.style.fontSize = `${px * 2}px`
}
module.exports = { scaleStudioChromeText }
