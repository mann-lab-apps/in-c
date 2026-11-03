import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMusicXmlWithReport, parseMusicXml, serializeMusicXml } from './index'
import { expandScoreRepeatsForMusicXml } from './expand-repeats'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { createPianoCommands } from '../renderer/src/playback/piano-transport'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'

it.each([false, true].flatMap(repeat => [false, true].map(authored => ({ repeat, authored }))))(
  'keeps common direct tempo and authored damper independent: %j', ({ repeat, authored }) => {
    const kind = `${repeat ? 'repeat' : 'linear'}-${authored ? 'authored' : 'control'}`
    const xml = `<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>Direct tempo pedal ${kind}</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${repeat ? '<barline location="left"><repeat direction="forward"/></barline>' : ''}<direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>120</per-minute></metronome></direction-type><sound tempo="120"/></direction><sound tempo="60"${authored ? ' damper-pedal="100"' : ''}><offset>1</offset></sound>${authored ? '<sound damper-pedal="0"><offset>3</offset></sound>' : ''}<note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note><note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>${repeat ? '<barline location="right"><repeat direction="backward" times="2"/></barline>' : ''}</measure><measure number="2"><note><rest/><duration>4</duration><type>whole</type></note></measure></part></score-partwise>`
    const { score, report } = parseMusicXmlWithReport(xml), before = structuredClone(score)
    const timeline = createPlaybackTimeline(score)
    const tempo = [[0,120], ...timeline.tempoEvents.map(event => [event.startBeat,event.quarterBpm])]
    expect(report.warnings).toEqual([])
    expect(tempo).toEqual(repeat ? [[0,120],[1,60],[4,120],[5,60]] : [[0,120],[1,60]])
    expect(timeline.pedalEvents?.map(event => [event.startBeat,event.value]) ?? []).toEqual(!authored ? [] : repeat ? [[1,127],[3,0],[4,0],[5,127],[7,0]] : [[1,127],[3,0]])
    const commands = createPianoCommands(timeline,0,120,{})
    const onset = repeat ? [0,1.5,3.5,5] : [0,1.5]
    const ringOff = authored ? repeat ? [2.5,3.5,6,7] : [2.5,3.5] : repeat ? [1.5,3.5,5,7] : [1.5,3.5]
    expect(commands.filter(event => event.type === 'on').map(event => event.time)).toEqual(onset)
    expect(commands.filter(event => event.type === 'off').map(event => event.time)).toEqual(ringOff)
    expect(timeline.events.filter(event => event.frequencies?.length).map(event => [event.startBeat,event.durationBeats])).toEqual(repeat ? [[0,2],[2,2],[4,2],[6,2]] : [[0,2],[2,2]])
    const native = encodeNativeProject(createNativeProject(score)), midi = serializeMidi(score), output = serializeMusicXml(score)
    expect(decodeNativeProject(native).score).toEqual(before)
    expect(serializeMidi(parseMusicXml(output))).toEqual(midi)
    const expanded = serializeMusicXml(expandScoreRepeatsForMusicXml(score))
    expect(serializeMidi(parseMusicXml(expanded))).toEqual(midi)
    expect(score).toEqual(before)
    const out = process.env.DDIRORI_DIRECT_PEDAL_OUT
    if (out) {
      const dir=join(out,kind);mkdirSync(dir,{recursive:true})
      writeFileSync(join(dir,'source.musicxml'),xml);writeFileSync(join(dir,'source.chromatics'),native);writeFileSync(join(dir,'source.mid'),midi)
      writeFileSync(join(dir,'output.musicxml'),output);writeFileSync(join(dir,'expanded.musicxml'),expanded)
      writeFileSync(join(dir,'oracle.json'),JSON.stringify({kind,repeat,authored,tempo,onset,ringOff,writtenOff:repeat?[1.5,3.5,5,7]:[1.5,3.5],totalBeats:timeline.totalBeats},null,2))
    }
  })
