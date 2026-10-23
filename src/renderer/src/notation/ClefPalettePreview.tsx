import { useEffect, useRef } from 'react'
import { BarlineType, Renderer, Stave } from 'vexflow'

import type { Clef } from '../../../score-core'
import { toVexFlowClef } from './vexflow-adapter'

export function ClefPalettePreview({ clef }: { clef: Clef }) {
  const containerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.replaceChildren()
    const surface = document.createElement('div')
    const renderer = new Renderer(surface, Renderer.Backends.SVG)
    renderer.resize(80, 100)
    const context = renderer.getContext()
    context.setFillStyle('currentColor')
    context.setStrokeStyle('currentColor')
    new Stave(4, 0, 72)
      .setBegBarType(BarlineType.NONE)
      .setEndBarType(BarlineType.NONE)
      .addClef(toVexFlowClef(clef))
      .setContext(context)
      .draw()
    const svg = surface.querySelector('svg')!
    svg.setAttribute('viewBox', '0 0 80 100')
    svg.setAttribute('focusable', 'false')
    svg.style.removeProperty('width')
    svg.style.removeProperty('height')
    container.replaceChildren(svg)
    return () => container.replaceChildren()
  }, [clef])

  return <span aria-hidden="true" className="clef-palette-preview" ref={containerRef} />
}
