// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { collectForeignBeamPaths, isForeignStaffVoice } from './tie-voice-ink'

function fixture(owners: string[]) {
  const host = document.createElement('div')
  host.innerHTML = `<svg>
    <g id="source" class="notation-event" data-event-id="tied" data-part-id="p" data-staff-id="s" data-voice-id="v1"/>
    <g class="notation-event" data-event-id="foreign" data-part-id="p" data-staff-id="s" data-voice-id="v2"/>
    <g class="notation-event" data-event-id="own" data-part-id="p" data-staff-id="s" data-voice-id="v1"/>
    <g class="notation-event" data-event-id="staff" data-part-id="p" data-staff-id="other" data-voice-id="v2"/>
    <g class="notation-event" data-event-id="part" data-part-id="other" data-staff-id="s" data-voice-id="v2"/>
    <g class="vf-beam" data-measure-id="m"><path id="body" d="M0 0H40V4H0Z"/>
      ${owners.map((owner,i) => `<g class="vf-stem" ${owner ? `data-slur-stem-event-id="${owner}"` : ''}><path id="stem-${i}" d="M10 0V40"/></g>`).join('')}
    </g></svg>`
  return { svg: host.querySelector('svg')!, source: host.querySelector<SVGElement>('#source')! }
}

it('collects foreign painted stems and their complete body without changing DOM', () => {
  const { svg, source } = fixture(['foreign','foreign']), before = svg.outerHTML
  expect(collectForeignBeamPaths(svg,source).map(n=>n.id)).toEqual(['stem-0','stem-1','body'])
  expect(svg.outerHTML).toBe(before)
})
it.each(['own','staff','part','missing',''])('excludes %s ownership even when its shape coordinates coincide', owner => {
  const { svg, source } = fixture([owner])
  expect(collectForeignBeamPaths(svg,source)).toEqual([])
})
it.each(['own','staff','part','missing',''])('does not attribute a mixed %s body to the known foreign stem', owner => {
  const { svg, source } = fixture(['foreign',owner])
  expect(collectForeignBeamPaths(svg,source).map(n=>n.id)).toEqual(['stem-0'])
})
it('does not guess when the source voice identity or owned beam identity is absent', () => {
  const { svg, source } = fixture(['foreign'])
  delete source.dataset.voiceId
  expect(collectForeignBeamPaths(svg,source)).toEqual([])
  source.dataset.voiceId='v1';svg.querySelector('.vf-beam')!.removeAttribute('data-measure-id')
  expect(collectForeignBeamPaths(svg,source)).toEqual([])
  expect(isForeignStaffVoice(undefined,source)).toBe(false)
})
