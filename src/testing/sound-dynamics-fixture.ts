import { createDirectSoundTempoFixture } from './direct-sound-tempo-fixture'

export type SoundDynamicsCase='direct'|'direction'|'symbolic'|'secondary'|'combined'
export function createSoundDynamicsFixture(kind:SoundDynamicsCase,value='20') {
 const title=`Sound dynamics ${kind}`
 const base=createDirectSoundTempoFixture(kind==='secondary'?'secondary':'initial')
 const sound=`<sound dynamics="${value}"/>`
 const data=kind==='direction'?`<direction><direction-type><words>Playback value</words></direction-type>${sound}</direction>`
  :kind==='symbolic'?`<direction><direction-type><dynamics><f/></dynamics></direction-type>${sound}</direction>`
  :kind==='combined'?`<sound tempo="60" dynamics="${value}" damper-pedal="100"/>`:sound
 const xml=base.xml.replace(base.title,title).replace(kind==='secondary'?'<sound tempo="60"><offset>1</offset></sound>':'<sound tempo="60"/>',data)
 return{title,xml}
}
