import {describe,expect,it} from 'vitest'
import {findPlaybackStartBeat,type PlaybackEvent,type PlaybackTimeline} from './timeline'

const event=(patch:Partial<PlaybackEvent>={}):PlaybackEvent=>({eventId:'note',partId:'part',staffId:'staff',measureId:'measure',voiceId:'voice',startBeat:4,durationBeats:1,velocityStart:0.16,velocityEnd:0.16,...patch})
const timeline=(...events:PlaybackEvent[]):PlaybackTimeline=>({events,tempoEvents:[],totalBeats:16})
describe('playback start-from-selection policy',()=>{
 it('starts notes and silent rests at their actual performed beat',()=>{
  expect(findPlaybackStartBeat(timeline(event()),'note')).toBe(4)
  expect(findPlaybackStartBeat(timeline(event({eventId:'rest',frequency:undefined,startBeat:6})),'rest')).toBe(6)
 })
 it('keeps duplicate source IDs in different addresses separate',()=>{
  const t=timeline(event(),event({partId:'second',measureId:'second-measure',startBeat:8}))
  expect(findPlaybackStartBeat(t,'note',{partId:'second',staffId:'staff',voiceId:'voice',measureId:'second-measure'})).toBe(8)
  expect(findPlaybackStartBeat(t,'note',{partId:'missing'})).toBeUndefined()
  expect(findPlaybackStartBeat(t,'note',{measureId:'missing'})).toBeUndefined()
 })
 it('uses the first unfolded repeat pass without changing the timeline',()=>{
  const t=timeline(event(),event({startBeat:12})),before=structuredClone(t)
  expect(findPlaybackStartBeat(t,'note')).toBe(4);expect(t).toEqual(before)
 })
 it('starts a selected tie continuation at the sustained chain beginning',()=>{
  const t=timeline(event({tiedEvents:[{eventId:'continuation',measureId:'next'}],durationBeats:8}))
  expect(findPlaybackStartBeat(t,'continuation',{partId:'part',measureId:'next'})).toBe(4)
  expect(findPlaybackStartBeat(t,'continuation',{measureId:'wrong'})).toBeUndefined()
 })
 it('leaves fallback policy to the caller for missing events',()=>{
  expect(findPlaybackStartBeat(timeline(event()),'missing')).toBeUndefined()
 })
})
