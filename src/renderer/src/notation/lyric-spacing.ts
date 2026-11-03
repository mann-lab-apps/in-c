import { Annotation, BarlineType, Stave, type StaveNote } from 'vexflow'
import { sortVoiceEvents, type Measure, type Voice as ScoreVoice, type VoiceEvent } from '../../../score-core'
import { leadingNotationPadding } from './system-layout'
import { toVexFlowClef, toVexFlowKeySignature } from './vexflow-adapter'
import { minimumSharedRhythmWidth } from './shared-rhythm-layout'
import { lyricDisplayText } from './lyric-text'
import type { HarmonySpacingWidths } from './harmony-spacing'
import { keySignatureCancellation } from './key-signature-header'
export { lyricDisplayText } from './lyric-text'

// Formatter reservation only. The existing SVG lyric renderer owns visible ink,
// selection and keyboard behavior; never draw a duplicate annotation.
class LyricSpacing extends Annotation {
  constructor(width:number) {
    super('')
    this.setWidth(width).setJustification(Annotation.HorizontalJustify.CENTER)
      .setVerticalJustification(Annotation.VerticalJustify.BOTTOM)
  }
  draw():void { this.setRendered() }
}

export function attachLyricSpacing(note:StaveNote,event:VoiceEvent,widths?:ReadonlyMap<string,number>):void {
  if(event.type!=='note'||!widths?.size)return
  const width=Math.max(0,...(event.lyrics??[]).map(lyric=>widths.get(lyricDisplayText(lyric))??0))
  if(width>0)note.addModifier(new LyricSpacing(width),0)
}

export function minimumLyricMeasureWidth(
  measure:Measure,widths:ReadonlyMap<string,number>,
  createNote:(event:VoiceEvent,measure:Measure,voice:ScoreVoice)=>StaveNote
):number {
  return minimumLyricColumnWidth([measure], widths, createNote)
}

export function minimumLyricColumnWidth(
  measures: Measure[], widths: ReadonlyMap<string, number>,
  createNote: (event: VoiceEvent, measure: Measure, voice: ScoreVoice) => StaveNote,
  harmonyWidths?: HarmonySpacingWidths,
  header?: { isSystemStart: boolean; previousMeasures: readonly (Measure | undefined)[] }
): number {
  const staves = measures.map((measure, index) => {
    const stave = new Stave(0, index * 96, 1000)
    if (measure.repeat?.start) stave.setBegBarType(BarlineType.REPEAT_BEGIN)
    if (measure.repeat?.end) stave.setEndBarType(BarlineType.REPEAT_END)
    const previous = header?.previousMeasures[index]
    const showsClef = !header || header.isSystemStart || !previous ||
      previous.clef.sign !== measure.clef.sign || previous.clef.line !== measure.clef.line
    const showsKeySignature = !header || header.isSystemStart || !previous ||
      previous.keySignature.fifths !== measure.keySignature.fifths || previous.keySignature.mode !== measure.keySignature.mode
    const showsTimeSignature = !header || !previous ||
      previous.timeSignature.beats !== measure.timeSignature.beats || previous.timeSignature.beatType !== measure.timeSignature.beatType
    const cancellation = header ? keySignatureCancellation(measure.keySignature, previous?.keySignature) : undefined
    if (showsClef) stave.addClef(toVexFlowClef(measure.clef))
    if (showsKeySignature) stave.addKeySignature(toVexFlowKeySignature(measure.keySignature), cancellation?.keySpec)
    if (showsTimeSignature) stave.addTimeSignature(`${measure.timeSignature.beats}/${measure.timeSignature.beatType}`)
    stave.setNoteStartX(stave.getNoteStartX() + leadingNotationPadding(measure,
      { showsClef, showsKeySignature, showsTimeSignature, cancelledKeyAccidentals:cancellation?.count }))
    return { measure, stave, lyricWidths: widths, harmonyWidths: harmonyWidths?.get(measure.id), voices: measure.voices.map(voice => {
      const events = sortVoiceEvents(voice.events)
      return { events, notes: events.map(event => {
        const note = createNote(event, measure, voice)
        return note
      }) }
    }) }
  })
  return Math.ceil(minimumSharedRhythmWidth(staves))
}
