// Shared App integration harness; product mocks and hooks unchanged.
import '@testing-library/jest-dom/vitest'

import { useMemo } from 'react'

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import recentMusicXml from '../../musicxml/fixtures/single-part-treble.musicxml?raw'

import tupletInputProgressMusicXml from '../../musicxml/fixtures/tuplet-input-progress.musicxml?raw'

import richPartExportMusicXml from '../../musicxml/fixtures/expanded-v1-part-export.musicxml?raw'

import restHairpinMusicXml from '../../musicxml/fixtures/rest-hairpin-input.musicxml?raw'

import { parseMusicXml } from '../../musicxml'

import { TICKS_PER_QUARTER } from '../../score-core'

import { listSpans, spanEndpointOptions } from './editor/span-editing'

import { unsavedScoreChangesMessage } from './editor/file-lifecycle'

import { demoScore } from './notation/demo-score'

import { partPresets, scoreStructurePresets } from './editor/new-score'

import { instrumentTranspositionPresets } from './editor/instrument-transposition'

import { createPlaybackTimeline, findPlaybackEvent } from './playback/timeline'

const withPercussionClef = (musicXml: string) =>
  musicXml.replace(
    /<clef>\s*<sign>G<\/sign>\s*<line>2<\/line>\s*<\/clef>/,
    `<clef>
          <sign>percussion</sign>
          <line>2</line>
        </clef>`
  )

const twoPartMusicXmlWithPrimaryAnnotations = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work>
    <work-title>Imported Duo</work-title>
  </work>
  <part-list>
    <score-part id="P1">
      <part-name>Violin</part-name>
    </score-part>
    <score-part id="P2">
      <part-name>Cello</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <direction placement="above">
        <direction-type>
          <rehearsal>Reh-One</rehearsal>
        </direction-type>
      </direction>
      <direction placement="above">
        <direction-type>
          <words>PrimaryOnlyText</words>
        </direction-type>
      </direction>
      <direction placement="below">
        <direction-type>
          <dynamics>
            <mf/>
          </dynamics>
        </direction-type>
      </direction>
      <harmony>
        <root>
          <root-step>C</root-step>
        </root>
        <kind text="maj7">major-seventh</kind>
      </harmony>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>F</sign>
          <line>4</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>3</octave>
        </pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`

const playbackMockState = vi.hoisted(() => ({
  readViewportOwnership: undefined as (()=>boolean) | undefined,
  lastPreviewAddress: undefined as {partId:string;staffId:string;measureId:string;voiceId:string} | undefined,
  lastScore: undefined as Parameters<typeof createPlaybackTimeline>[0] | undefined,
  lastPreviewScore: undefined as Parameters<typeof createPlaybackTimeline>[0] | undefined,
  jumpToStart: vi.fn(),
  lastPartMixer: {} as Record<
    string,
    {
      muted: boolean
      solo: boolean
      volume: number
    }
  >,
  pause: vi.fn(),
  play: vi.fn(),
  playFromEvent: vi.fn(),
  stop: vi.fn(),
  value: {
    activeEvent: undefined as
      | {
          eventId: string
          partId: string
          staffId: string
          measureId: string
          voiceId: string
        }
      | undefined,
    activeEventId: undefined as string | undefined,
    positionBeat: 0,
    status: 'stopped' as 'stopped' | 'playing' | 'paused',
    totalBeats: 16
  }
}))

vi.mock('./notation/NotationPreview', async importOriginal => ({
  createStaveNote: (await importOriginal<typeof import('./notation/NotationPreview')>()).createStaveNote,
  NotationPreview: ({
    score,
    inlineLyricEditor,
    onSelectEvent,
    onSelectEventRange,
    onSelectLyric,
    onSelectRehearsalMark,
    selectedRehearsalMarkId,
    onSelectSystemText,
    selectedSystemTextId,
    onSelectStaffText,
    onSelectDynamic,
    selectedDynamicId,
    onSelectHarmony,
    selectedHarmonyId,
    onSelectExpressionText,
    selectedExpressionTextId,
    selectedStaffTextId,
    onOpenMeasureContextMenu,
    onSelectMeasure,
    selectedEventAddress,
    inputPosition,
    shouldRestoreFocusViewport,
    selectedEventId,
    selectedEventIds,
    selectedMeasureId,
    playbackEventId,
    playbackEventAddress,
    printLayout,
    printLayoutPlan,
  }: {
    score: typeof demoScore
    inlineLyricEditor?: {
      number: number
      value: string
      syllabic: 'single' | 'begin' | 'middle' | 'end'
      extend?: boolean
      onCommit: (
        text: string,
        options?: {
          syllabic?: 'single' | 'begin' | 'middle' | 'end'
          extend?: boolean
          moveNext?: boolean
        }
      ) => void
      onMoveVerse: (direction: 1 | -1) => void
    }
    onSelectEvent: (
      eventId: string,
      extendRange?: boolean,
      address?: {
        partId: string
        staffId: string
        measureId: string
        voiceId: string
      }
    ) => void
    onSelectEventRange: (
      anchorEventId: string,
      focusEventId: string,
      address?: {
        partId: string
        staffId: string
        measureId: string
        voiceId: string
      }
    ) => void
    onSelectLyric: (eventId: string, verse: number) => void
    onSelectRehearsalMark?: (reference: {id:string;measureId:string}) => void
    selectedRehearsalMarkId?:string
    onSelectSystemText?:(reference:{id:string;measureId:string})=>void
    inputPosition?:{address:{partId:string;staffId:string;measureId:string;voiceId:string};tick:number}
    shouldRestoreFocusViewport?:()=>boolean
    selectedSystemTextId?:string
    onSelectStaffText?:(reference:{id:string;measureId:string})=>void
    selectedStaffTextId?:string
    onSelectExpressionText?:(reference:{id:string;measureId:string;tick:number})=>void
    onSelectDynamic?:(reference:{id:string;measureId:string;edit?:boolean})=>void
    selectedDynamicId?:string
    selectedHarmonyId?:string
    onSelectHarmony?:(reference:{id:string;measureId:string;tick:number;edit?:boolean})=>void
    selectedExpressionTextId?:string
    onOpenMeasureContextMenu: (
      measureId: string,
      position: { x: number; y: number }
    ) => void
    onSelectMeasure: (measureId: string) => void
    selectedEventId?: string
    selectedEventIds?: string[]
    selectedMeasureId?: string
    selectedEventAddress?: {
      partId: string
      staffId: string
      measureId: string
      voiceId: string
    }
    playbackEventId?: string
    playbackEventAddress?: {
      partId: string
      staffId: string
      measureId: string
      voiceId: string
    }
    printLayout?: boolean
    printLayoutPlan?: {
      estimatedPageCount: number
      id: string
      overflowedTarget: boolean
      pageCount: number
      pageCssSize?: string
      pageMarginMm: number
      renderWidth: number
      scale: number
      targetPages?: number
    }
  }) => (
    <div
      ref={() => { playbackMockState.lastPreviewAddress=playbackEventAddress;playbackMockState.lastPreviewScore=score;playbackMockState.readViewportOwnership=shouldRestoreFocusViewport }}
      aria-label="악보 미리보기 테스트 더블"
      data-event-count={score.parts[0]?.staves[0]?.measures.reduce(
        (count, measure) =>
          count + measure.voices.reduce((sum, voice) => sum + voice.events.length, 0),
        0
      )}
      data-event-durations={score.parts[0]?.staves[0]?.measures
        .flatMap((measure) =>
          measure.voices.flatMap((voice) =>
            voice.events.map((event) =>
              [
                event.id,
                event.duration.value,
                event.duration.tuplet
                  ? `${event.duration.tuplet.actualNotes}:${event.duration.tuplet.normalNotes}`
                  : 'regular'
              ].join(':')
            )
          )
        )
        .join(',')}
      data-event-pitches={score.parts[0]?.staves[0]?.measures
        .flatMap((measure) =>
          measure.voices.flatMap((voice) =>
            voice.events.map((event) =>
              event.type === 'note'
                ? `${event.id}:${event.pitch.step}${event.pitch.alter ?? ''}${event.pitch.octave}`
                : `${event.id}:rest`
            )
          )
        )
        .join(',')}
      data-all-event-pitches={score.parts
        .flatMap((part) =>
          part.staves.flatMap((staff) =>
            staff.measures.flatMap((measure) =>
              measure.voices.flatMap((voice) =>
                voice.events.map((event) =>
                  [
                    part.id,
                    staff.id,
                    measure.id,
                    voice.id,
                    event.id,
                    event.type === 'note'
                      ? `${event.pitch.step}${event.pitch.alter ?? ''}${event.pitch.octave}`
                      : 'rest'
                  ].join(':')
                )
              )
            )
          )
        )
        .join(',')}
      data-global-tempo={score.tempo?.bpm}
      data-rhythm-feel={score.rhythmFeel?.unit ?? ''}
      data-part-structure={score.parts
        .map((part) => `${part.id}:${part.name}:${part.staves.length}`)
        .join('|')}
      data-staff-clefs={score.parts
        .flatMap((part) =>
          part.staves.map((staff) =>
            [
              part.id,
              staff.id,
              `${staff.measures[0]?.clef.sign}${staff.measures[0]?.clef.line}`,
              staff.measures.length
            ].join(':')
          )
        )
        .join('|')}
      data-measure-clefs={score.parts[0]?.staves[0]?.measures
        .map((measure) => `${measure.clef.sign}${measure.clef.line}`)
        .join(',')}
      data-voice-ids={score.parts[0]?.staves[0]?.measures
        .map(
          (measure) =>
            `${measure.id}:${measure.voices.map((voice) => voice.id).join('/')}`
        )
        .join('|')}
      data-all-voice-ids={score.parts
        .flatMap((part) =>
          part.staves.flatMap((staff) =>
            staff.measures.map((measure) =>
              [
                part.id,
                staff.id,
                measure.id,
                measure.voices.map((voice) => voice.id).join('/')
              ].join(':')
            )
          )
        )
        .join('|')}
      data-lyrics={score.parts[0]?.staves[0]?.measures
        .flatMap((measure) =>
          measure.voices.flatMap((voice) =>
            voice.events.flatMap((event) =>
              event.type === 'note'
                ? (event.lyrics ?? []).map(
                    (lyric) =>
                      `${event.id}:${lyric.number ?? 1}:${lyric.syllabic ?? ''}:${lyric.text}`
                  )
                : []
            )
          )
        )
        .join('|')}
      data-measure-count={score.parts[0]?.staves[0]?.measures.length ?? 0}
      data-measure-marks={score.parts[0]?.staves[0]?.measures
        .map((measure) =>
          [
            measure.number,
            `${measure.repeat?.start ? 'S' : ''}${measure.repeat?.end ? 'E' : ''}`,
            measure.repeat?.times ?? '',
            measure.volta
              ? `${measure.volta.number}:${measure.volta.start ? 'S' : ''}${
                  measure.volta.end ? 'E' : ''
                }`
              : ''
          ].join(':')
        )
        .join('|')}
      data-input-measure-id={inputPosition?.address.measureId??''}
      data-input-tick={inputPosition?.tick??''}
      data-selected-event-id={selectedEventId ?? ''}
      data-selected-event-ids={(selectedEventIds ?? []).join(',')}
      data-selected-event-address={
        selectedEventAddress
          ? [
              selectedEventAddress.partId,
              selectedEventAddress.staffId,
              selectedEventAddress.measureId,
              selectedEventAddress.voiceId
            ].join(':')
          : ''
      }
      data-selected-measure-id={selectedMeasureId ?? ''}
      data-playback-event-id={playbackEventId ?? ''}
      data-playback-event-address={
        playbackEventAddress
          ? [
              playbackEventAddress.partId,
              playbackEventAddress.staffId,
              playbackEventAddress.measureId,
              playbackEventAddress.voiceId
            ].join(':')
          : ''
      }
      data-print-layout={printLayout ? 'true' : 'false'}
      data-page-breaks={(score.layout?.pageBreakBeforeMeasureIds ?? []).join(',')}
      data-system-breaks={(score.layout?.systemBreakBeforeMeasureIds ?? []).join(',')}
      data-print-layout-id={printLayoutPlan?.id ?? ''}
      data-print-layout-margin={printLayoutPlan?.pageMarginMm ?? ''}
      data-print-page-css-size={printLayoutPlan?.pageCssSize ?? ''}
      data-print-layout-overflowed={printLayoutPlan?.overflowedTarget ? 'true' : 'false'}
      data-print-layout-pages={printLayoutPlan?.pageCount ?? ''}
      data-print-layout-scale={printLayoutPlan?.scale ?? ''}
      data-print-layout-target={printLayoutPlan?.targetPages ?? ''}
      data-print-layout-width={printLayoutPlan?.renderWidth ?? ''}
      data-testid="notation-preview"
    >
      {inlineLyricEditor ? (
        <input
          aria-label="선택 음표 가사"
          defaultValue={inlineLyricEditor.value}
          onBlur={(event) =>
            inlineLyricEditor.onCommit(event.currentTarget.value, {
              syllabic: inlineLyricEditor.syllabic,
              extend: inlineLyricEditor.extend
            })
          }
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault()
              inlineLyricEditor.onCommit(event.currentTarget.value, {
                syllabic: inlineLyricEditor.syllabic,
                extend: inlineLyricEditor.extend
              })
              inlineLyricEditor.onMoveVerse(
                event.key === 'ArrowDown' ? 1 : -1
              )
            } else if (event.key === 'Enter') {
              event.preventDefault()
              inlineLyricEditor.onCommit(event.currentTarget.value, {
                syllabic: inlineLyricEditor.syllabic,
                extend: inlineLyricEditor.extend,
                moveNext: true
              })
            }
          }}
        />
      ) : null}
      {score.parts[0]?.staves[0]?.measures[0]?.voices[0]?.events[0]?.id}
      {score.parts[0]?.staves[0]?.measures.map((measure) => (
        <button
          aria-label={`${measure.number}마디 선택`}
          key={`${measure.id}-select`}
          onClick={() => onSelectMeasure(measure.id)}
          onContextMenu={(event) => {
            event.preventDefault()
            onOpenMeasureContextMenu(measure.id, {
              x: event.clientX,
              y: event.clientY
            })
          }}
          type="button"
        />
      ))}
      {score.parts.flatMap((part) =>
        part.staves.flatMap((staff) =>
          staff.measures.flatMap((measure) =>
            measure.voices.flatMap((voice) =>
              voice.events.map((event) => (
                <button
                  aria-label={`${event.id} 선택`}
                  key={`${event.id}-select`}
                  onClick={(clickEvent) =>
                    onSelectEvent(event.id, clickEvent.shiftKey, {
                      partId: part.id,
                      staffId: staff.id,
                      measureId: measure.id,
                      voiceId: voice.id
                    })
                  }
                  type="button"
                />
              ))
            )
          )
        )
      )}
      {score.parts.flatMap((part) =>
        part.staves.flatMap((staff) =>
          staff.measures.flatMap((measure) =>
            measure.voices.flatMap((voice) =>
              voice.events.flatMap((event) =>
                event.type === 'note'
                  ? (event.lyrics ?? []).map((lyric) => (
                      <button
                        aria-label={`${event.id} ${
                          lyric.number ?? 1
                        }절 가사 선택`}
                        key={`${event.id}-${lyric.number ?? 1}-lyric-select`}
                        onClick={() =>
                          onSelectLyric(event.id, lyric.number ?? 1)
                        }
                        type="button"
                      />
                    ))
                  : []
              )
            )
          )
        )
      )}
      {(score.hairpins ?? []).map((hairpin) => (
        <span data-hairpin-type={hairpin.type} key={hairpin.id}>
          {hairpin.startEventId}–{hairpin.endEventId}
        </span>
      ))}
      {(score.slurs ?? []).map((slur) => (
        <span data-slur="true" key={slur.id}>
          slur:{slur.startEventId}–{slur.endEventId}
        </span>
      ))}
      {(score.rehearsalMarks ?? []).map((mark) => (
        <span data-measure-id={mark.measureId} key={mark.id}>
          {mark.text}
          <button type="button" className="notation-rehearsal-mark" data-rehearsal-id={mark.id} aria-pressed={selectedRehearsalMarkId===mark.id} aria-label={`연습표 ${mark.text} 속성 열기`} onClick={()=>{
            const measure=score.parts[0]?.staves[0]?.measures.find(measure=>measure.id===mark.measureId||`measure-${measure.number}`===mark.measureId)
            if(measure)onSelectRehearsalMark?.({id:mark.id,measureId:measure.id})
          }}/>
        </span>
      ))}
      {(score.staffTexts ?? []).map((text) => (
        <span data-measure-id={text.measureId} key={text.id}>
          {text.text}
          <button type="button" className="notation-staff-text-target" data-staff-text-id={text.id} aria-pressed={selectedStaffTextId===text.id} aria-label={`보표 글자 ${text.text} 속성 열기`} onClick={()=>onSelectStaffText?.({id:text.id,measureId:text.measureId})}/>
        </span>
      ))}
      {(score.systemTexts ?? []).map((text) => (
        <span data-measure-id={text.measureId} key={text.id}>
          {text.text}
          <button type="button" className="notation-system-text-target" data-system-text-id={text.id} aria-pressed={selectedSystemTextId===text.id} aria-label={`시스템 텍스트 ${text.text} 속성 열기`} onClick={()=>{
            const measure=score.parts[0]?.staves[0]?.measures.find(measure=>measure.id===text.measureId||`measure-${measure.number}`===text.measureId)
            if(measure)onSelectSystemText?.({id:text.id,measureId:measure.id})
          }}/>
        </span>
      ))}
      {(score.harmonies??[]).map(mark=><button key={mark.id} type="button" className="notation-harmony-target" data-harmony-id={mark.id} aria-label={`코드 심벌 ${mark.text} 속성 열기`} aria-pressed={selectedHarmonyId===mark.id} onClick={()=>onSelectHarmony?.({...mark,edit:false})} onDoubleClick={()=>onSelectHarmony?.({...mark,edit:true})}/>) }
      {(score.expressionTexts ?? []).map((text) => (
        <span data-measure-id={text.measureId} data-tick={text.tick} key={text.id}>
          {text.text}
          <button type="button" className="notation-expression-text-target" data-expression-text-id={text.id} aria-pressed={selectedExpressionTextId===text.id} aria-label={`표현 텍스트 ${text.text} 속성 열기`} onClick={()=>onSelectExpressionText?.({id:text.id,measureId:text.measureId,tick:text.tick})}/>
        </span>
      ))}
      {(score.dynamics??[]).filter((mark,index,marks)=>marks.findIndex(item=>item.measureId===mark.measureId)===index).map(mark=><button key={mark.id} type="button" className="notation-dynamic-target" data-dynamic-id={mark.id} aria-pressed={selectedDynamicId===mark.id} aria-label={`셈여림 ${mark.value} 속성 열기`} onClick={()=>onSelectDynamic?.({...mark,edit:false})} onDoubleClick={()=>onSelectDynamic?.({...mark,edit:true})}/>) }
      {(score.dynamics ?? []).map((dynamic) => (
        <span data-measure-id={dynamic.measureId} key={dynamic.id}>
          {dynamic.value}
        </span>
      ))}
      {(score.harmonies ?? []).map((harmony) => (
        <span
          data-measure-id={harmony.measureId}
          data-tick={harmony.tick}
          key={harmony.id}
        >
          {harmony.text}
        </span>
      ))}
      {score.parts.flatMap((part) =>
        part.staves.flatMap((staff) =>
          staff.measures.flatMap((measure) =>
            measure.voices.flatMap((voice) =>
              voice.events.flatMap((event) => [
                event.fermata ? (
                  <span data-event-id={event.id} key={`${event.id}-fermata`}>
                    페르마타 표시
                  </span>
                ) : null,
                event.breathMark ? (
                  <span data-event-id={event.id} key={`${event.id}-breath-mark`}>
                    {event.breathMark === 'caesura' ? '중지표 표시' : '숨표 표시'}
                  </span>
                ) : null,
                event.type === 'note' && event.tremolo ? (
                  <span data-event-id={event.id} key={`${event.id}-tremolo`}>
                    트레몰로 {event.tremolo.marks}줄 표시
                  </span>
                ) : null,
                event.type === 'note' && event.ornaments?.length ? (
                  <span data-event-id={event.id} key={`${event.id}-ornaments`}>
                    {event.ornaments
                      .map((ornament) =>
                        ornament === 'trill'
                          ? 'tr'
                          : ornament === 'mordent'
                            ? 'mord.'
                            : 'turn'
                      )
                      .join(' ')}
                  </span>
                ) : null
              ])
            )
          )
        )
      )}
    </div>
  )
}))

vi.mock('./playback/useScorePlayback', async importOriginal => {
  const { isPlaybackPartActive } = await importOriginal<typeof import('./playback/useScorePlayback')>()
  return {
  useScorePlayback: (
    score: Parameters<typeof createPlaybackTimeline>[0],
    partMixer?: typeof playbackMockState.lastPartMixer
  ) => {
    playbackMockState.lastScore = score
    playbackMockState.lastPartMixer = partMixer ?? {}
    const timeline = useMemo(() => createPlaybackTimeline(score), [score])

    return {
      activeEvent: playbackMockState.value.activeEvent,
      activeEventId: playbackMockState.value.activeEventId,
      getActiveEventForPart: (partId: string) => playbackMockState.value.activeEvent
        ? findPlaybackEvent(timeline, playbackMockState.value.positionBeat, partId) : undefined,
      isPartPlaying: (partId: string) => playbackMockState.value.status === 'playing'
        && isPlaybackPartActive(timeline, playbackMockState.value.positionBeat, partId, partMixer ?? {}),
      jumpToStart: playbackMockState.jumpToStart,
      pause: playbackMockState.pause,
      play: playbackMockState.play,
      playFromEvent: playbackMockState.playFromEvent,
      positionBeat: playbackMockState.value.positionBeat,
      setTempo: vi.fn(),
      status: playbackMockState.value.status,
      stop: playbackMockState.stop,
      tempo: 120,
      totalBeats: playbackMockState.value.totalBeats
    }
  }
  }
})

const installPreloadStub = () => {
  window.inC = {
    appName: '띠로리 Studio',
    project: { open: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(null), listBackups: vi.fn().mockResolvedValue([]), readBackup: vi.fn() },
    autosave: {
      clear: vi.fn().mockResolvedValue(undefined),
      read: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined)
    },
    musicXml: {
      open: vi.fn().mockResolvedValue(undefined),
      exportCopy: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined)
    },
    png: { save: vi.fn().mockResolvedValue(null) },
    pdf: {
      save: vi.fn().mockResolvedValue(undefined)
    },
    midi: {
      save: vi.fn().mockResolvedValue(undefined)
    },
    promotions: {
      getConcertPosters: vi.fn().mockResolvedValue({ posters: [] })
    },
    recentMusicXml: {
      add: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
      open: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue([])
    },
    versions: {
      chrome: 'test',
      electron: 'test',
      node: 'test'
    }
  }
}

const installLocalStorageStub = () => {
  try {
    const storage = window.localStorage
    // Some Node/jsdom combinations expose a truthy object without the DOM
    // Storage methods. Preserve usable instances, not just object presence.
    if (storage && typeof storage.length === 'number' &&
      typeof storage.clear === 'function' && typeof storage.getItem === 'function' &&
      typeof storage.key === 'function' && typeof storage.removeItem === 'function' &&
      typeof storage.setItem === 'function') {
      return
    }
  } catch {
    // jsdom can expose localStorage as unavailable for opaque origins.
  }

  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      removeItem: (key: string) => {
        store.delete(key)
      },
      setItem: (key: string, value: string) => {
        store.set(key, String(value))
      },
      get length() {
        return store.size
      }
    }
  })
}

const choosePageSetup = (name: string, label: string) => {
  fireEvent.click(screen.getByRole('combobox', { name }))
  fireEvent.click(screen.getByRole('option', { name: label }))
}

const chooseNewScoreTemplate = (value:string) => {
  const dialog=within(screen.getByRole('dialog',{name:'새 악보 만들기'}))
  fireEvent.click(dialog.getByRole('combobox',{name:'악보 구성'}))
  fireEvent.click(screen.getByRole('option',{name:scoreStructurePresets.find(preset=>preset.id===value)!.label}))
}

const printingPreview = () => within(document.querySelector<HTMLDivElement>('.studio-pdf-snapshot')!).getByTestId('notation-preview')

const focusTestBody = () => {
  const previous = document.body.getAttribute('tabindex')
  document.body.tabIndex = -1
  document.body.focus()
  if (previous === null) document.body.removeAttribute('tabindex')
  else document.body.setAttribute('tabindex', previous)
}

const openStudioWorkspace = (label: string) => {
  const mapping: Record<string, [string,string]> = {
    '파일':['파일','파일 작업 열기'], '악보':['형식','악보 설정'],
    '음표':['도구','선택 속성 열기'], '표기 객체':['추가','표기 팔레트 열기'],
    '가사':['추가','가사 및 코드'], '내보내기':['파일','내보내기 설정'], '재생':['도구','재생 도구']
  }
  const [menu,item]=mapping[label]!
  const nav=within(screen.getByRole('navigation',{name:'앱 메뉴'}))
  fireEvent.click(nav.getByRole('button',{name:menu}))
  fireEvent.click(nav.getByRole('menuitem',{name:item}))
}

const openNotationSettings = (entry:'clef'|'range'|'repeat') => {
  openStudioWorkspace('표기 객체')
  const palette=within(screen.getByRole('complementary',{name:'고정 팔레트'}))
  const [family,action]={clef:['음자리표·조표·박자표','음자리표 설정 열기'],range:['범위 기호','범위 기호 설정 열기'],repeat:['반복·볼타','반복·볼타 설정 열기']}[entry]
  const header=palette.getByRole('button',{name:family})
  if(header.getAttribute('aria-expanded')==='false')fireEvent.click(header)
  fireEvent.click(palette.getByRole('button',{name:action}))
}

const openSpanFinder = () => {
  const nav=within(screen.getByRole('navigation',{name:'앱 메뉴'}))
  fireEvent.click(nav.getByRole('button',{name:'도구'}))
  fireEvent.click(nav.getByRole('menuitem',{name:'범위 표기 찾기'}))
}

const chooseSelectionFilter = (name:'선택 필터'|'표기 필터',value:string) => {
  const labels:Record<string,string>={'notes-and-rests':'전체',notes:'음표만',rests:'쉼표만',none:'없음',dynamics:'셈여림',harmonies:'코드','system-texts':'시스템 텍스트'}
  fireEvent.click(screen.getByRole('combobox',{name}))
  fireEvent.click(within(screen.getByRole('listbox',{name})).getByRole('option',{name:labels[value]}))
}

const openHarmonyProperties = () => {
  openStudioWorkspace('가사')
  fireEvent.click(screen.getByRole('button',{name:'코드 심벌 편집'}))
  return screen.getByRole('textbox',{name:'선택 요약 코드'})
}

const chooseInspectorDynamic = (value:string) => {
  openStudioWorkspace('음표')
  const field=screen.getByRole('combobox',{name:/^(선택|입력) 마디 셈여림$/})
  fireEvent.click(field);fireEvent.click(within(screen.getByRole('listbox',{name:/^(선택|입력) 마디 셈여림$/})).getByRole('option',{name:value||'없음'}))
}

const choosePartSetup = (name:'현재 보표 음자리표'|'추가할 악기'|'현재 파트 이조', value:string) => {
  openStudioWorkspace('악보')
  const label=name==='현재 보표 음자리표' ? ({treble:'높은음자리표',bass:'낮은음자리표',alto:'가온음자리표',tenor:'테너음자리표'}[value]!) :
    name==='추가할 악기' ? partPresets.find(preset=>preset.id===value)!.label : instrumentTranspositionPresets.find(preset=>preset.id===value)!.label
  fireEvent.click(screen.getByRole('combobox',{name}))
  fireEvent.click(within(screen.getByRole('listbox',{name})).getByRole('option',{name:label}))
}

const chooseScoreView = (name:'악보 보기'|'파트보 선택', value:string) => {
  openStudioWorkspace('악보')
  fireEvent.click(screen.getByRole('combobox',{name}))
  const list=within(screen.getByRole('listbox',{name}))
  if(name==='악보 보기')fireEvent.click(list.getByRole('option',{name:value==='score'?'총보':'파트보'}))
  else{
    const parts=playbackMockState.lastScore!.parts,index=parts.findIndex(part=>part.id===value)
    expect(index).toBeGreaterThanOrEqual(0)
    const option=list.getAllByRole('option')[index]
    expect(option).toHaveTextContent(parts[index].name)
    fireEvent.click(option)
  }
}

const staffTargetLabel = (value:string) => {
  const [partId,staffId]=value.split(':').map(decodeURIComponent)
  const part=playbackMockState.lastScore!.parts.find(part=>part.id===partId)!
  const index=part.staves.findIndex(staff=>staff.id===staffId)
  expect(index).toBeGreaterThanOrEqual(0)
  return part.staves.length===1?part.name:`${part.name} 보표 ${index+1}`
}

const chooseStaffTarget = (value:string) => {
  const label=staffTargetLabel(value)
  const targets=playbackMockState.lastScore!.parts.flatMap(part=>part.staves.map(staff=>`${encodeURIComponent(part.id)}:${encodeURIComponent(staff.id)}`))
  const index=targets.indexOf(value);expect(index).toBeGreaterThanOrEqual(0)
  fireEvent.click(screen.getByRole('combobox',{name:'입력 보표'}))
  const option=within(screen.getByRole('listbox',{name:'입력 보표'})).getAllByRole('option')[index]
  expect(option).toHaveTextContent(label)
  fireEvent.click(option)
}

const expectStaffTarget = (value:string) => {
  const count=playbackMockState.lastScore!.parts.reduce((sum,part)=>sum+part.staves.length,0)
  if(count===1){
    expect(screen.queryByRole('combobox',{name:'입력 보표'})).toBeNull()
    expect(screen.getByRole('status',{name:'입력 보표'})).toHaveTextContent(staffTargetLabel(value))
  }else{
    expect(screen.queryByRole('status',{name:'입력 보표'})).toBeNull()
    expect(screen.getByRole('combobox',{name:'입력 보표'})).toHaveTextContent(staffTargetLabel(value))
  }
  const address=screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  if(address)expect(address).toMatch(new RegExp('^'+value.split(':').map(decodeURIComponent).join(':')+':'))
}

const selectedSpanReference = () => {
  const id=screen.getByLabelText('선택 표기 ID').textContent!
  return listSpans(playbackMockState.lastScore!).find(reference=>reference.id===id)!
}

const chooseSpanReference = (value:string) => {
  openSpanFinder()
  const references=listSpans(playbackMockState.lastScore!)
  const index=references.findIndex(reference=>`${reference.kind}:${reference.id}`===value)
  expect(index).toBeGreaterThanOrEqual(0)
  fireEvent.click(screen.getByRole('combobox',{name:'표기 객체 선택'}))
  fireEvent.click(within(screen.getByRole('listbox',{name:'표기 객체 선택'})).getAllByRole('option')[index+1]!)
}

const chooseSpanEndpoint = (label:string,id:string) => {
  const option=spanEndpointOptions(playbackMockState.lastScore!,selectedSpanReference()).find(option=>option.id===id)!
  fireEvent.click(screen.getByRole('combobox',{name:label}))
  fireEvent.click(within(screen.getByRole('listbox',{name:label})).getByRole('option',{name:option.label}))
}

const expectSpanEndpoint = (label:string,id:string) => {
  const option=spanEndpointOptions(playbackMockState.lastScore!,selectedSpanReference()).find(option=>option.id===id)!
  expect(screen.getByRole('combobox',{name:label})).toHaveTextContent(option.label)
}

const expandNoteDetails = () => {
  openStudioWorkspace('음표')
  expect(screen.getByRole('region', { name: '선택 요약' })).toBeVisible()
}

const installCompactDockMedia = () => {
  const previous=window.matchMedia
  let compact=true,listener: (()=>void)|undefined
  Object.defineProperty(window,'matchMedia',{configurable:true,writable:true,value:vi.fn((query:string)=>({
    get matches(){return query.includes('761px')?compact:false},media:query,
    addEventListener:(_name:string,callback:()=>void)=>{if(query.includes('761px'))listener=callback},
    removeEventListener:()=>{}
  }))})
  return {resize:(value:boolean)=>act(()=>{compact=value;listener?.()}),restore:()=>{Object.defineProperty(window,'matchMedia',{configurable:true,writable:true,value:previous})}}
}

function asciiBytes(bytes: number[], start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length))
}

export { withPercussionClef, twoPartMusicXmlWithPrimaryAnnotations, playbackMockState, installPreloadStub, installLocalStorageStub, choosePageSetup, chooseNewScoreTemplate, printingPreview, focusTestBody, openStudioWorkspace, openNotationSettings, openSpanFinder, chooseSelectionFilter, openHarmonyProperties, chooseInspectorDynamic, choosePartSetup, chooseScoreView, staffTargetLabel, chooseStaffTarget, expectStaffTarget, selectedSpanReference, chooseSpanReference, chooseSpanEndpoint, expectSpanEndpoint, expandNoteDetails, installCompactDockMedia, asciiBytes }
export function registerAppTestHooks() {
  // App cases perform complete edit/history/file workflows; this is their
  // aggregate budget, not a product latency assertion. Individual waits and
  // the separate score-core/notation/component projects retain their limits.
  // Vitest resets this file-local setting between test files.
  vi.setConfig({testTimeout:15_000})
  let restoreCanvasContext: (() => void) | undefined
  let restorePopoverApi: (()=>void) | undefined
  afterEach(() => {
    cleanup()
    restoreCanvasContext?.()
    restoreCanvasContext = undefined
    restorePopoverApi?.()
    restorePopoverApi=undefined
  })
  beforeEach(() => {
    // App integration tests exercise the existing no-Canvas fallback. Delegate
    // other context kinds, and restore after each case; do not fake font ink.
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    const canvasContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(function(this: HTMLCanvasElement, kind: string, options?: unknown) {
        return kind === '2d' ? null : originalGetContext.call(this, kind, options)
      })
    restoreCanvasContext = () => canvasContext.mockRestore()
    Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value(this:HTMLDialogElement){this.setAttribute('open','')}})
    Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value(this:HTMLDialogElement){this.removeAttribute('open')}})
    // Keep browser-owned visibility/dismissal coherent. A no-op hidePopover
    // leaves closed menus in accessibility queries after aria-expanded closes.
    // Native placement and outside-pointer light dismissal remain Electron QA.
    const names=['matches','showPopover','hidePopover'] as const
    const descriptors=names.map(name=>Object.getOwnPropertyDescriptor(HTMLElement.prototype,name))
    restorePopoverApi=()=>names.forEach((name,index)=>{
      const descriptor=descriptors[index]
      if(descriptor)Object.defineProperty(HTMLElement.prototype,name,descriptor)
      else Reflect.deleteProperty(HTMLElement.prototype,name)
    })
    const popovers = new Set<HTMLElement>()
    Object.defineProperty(HTMLElement.prototype,'matches',{configurable:true,value(this:HTMLElement,selector:string){
      return selector === ':popover-open' ? popovers.has(this) : Element.prototype.matches.call(this,selector)
    }})
    Object.defineProperty(HTMLElement.prototype,'showPopover',{configurable:true,value(this:HTMLElement){
      popovers.add(this);this.style.display='block'
    }})
    Object.defineProperty(HTMLElement.prototype,'hidePopover',{configurable:true,value(this:HTMLElement){
      const wasOpen=popovers.delete(this);this.style.display='none'
      if(wasOpen)this.dispatchEvent(Object.assign(new Event('toggle'),{oldState:'open',newState:'closed'}))
    }})
    // Mocks are fixed for this file; reset their state below, not the App module graph.
    // Reloading that graph for every workflow exhausts the worker heap in the full run.
    playbackMockState.value = {
      activeEvent: undefined,
      activeEventId: undefined,
      positionBeat: 0,
      status: 'stopped',
      totalBeats: 16
    }
    playbackMockState.lastPreviewAddress = undefined
    playbackMockState.lastScore = undefined
    playbackMockState.lastPreviewScore = undefined
    playbackMockState.readViewportOwnership = undefined
    playbackMockState.lastPartMixer = {}
    playbackMockState.jumpToStart.mockReset()
    playbackMockState.pause.mockReset()
    playbackMockState.play.mockReset()
    playbackMockState.playFromEvent.mockReset()
    playbackMockState.stop.mockReset()
    window.history.replaceState({}, '', '/')
    window.confirm = vi.fn(() => true)
    installLocalStorageStub()
    window.localStorage.clear()
    installPreloadStub()
  })
}
