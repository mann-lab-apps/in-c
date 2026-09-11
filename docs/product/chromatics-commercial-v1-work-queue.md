# Chromatics Commercial V1 Work Queue

작성일: 2026-09-11
상태: 장기 반복 작업 큐

## Purpose

Chromatics Commercial V1 작업은 단일 vertical slice로 끝나지 않는다. 이 큐는
MuseScore Studio와 Finale-style workflow를 primary reference로 삼고, Dorico와
Sibelius를 secondary commercial reference로 유지하면서 남은 Commercial V1 blocker를
반복 수집, 우선순위화, 구현, 검증하기 위한 작업판이다.

상태 값은 `Todo`, `In progress`, `Done`, `Partial`, `Blocked external`,
`Manual QA required`, `Post-V1`만 사용한다.

## Queue

| ID | 문제명 | 카테고리 | Reference 근거 | 사용자 영향 | 자동화 가능 | 외부/수동 필요 | 상태 | 다음 action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CV1-MXML-MUSESCORE-GUI-SNAPSHOT | MuseScore GUI-created/reopen snapshot QA | MusicXML Compatibility | MuseScore Studio export/reopen workflow | MuseScore 사용자가 가져온 악보 호환성을 신뢰하기 어렵다. | 부분 가능: CLI app-export fixture와 PDF smoke는 존재 | MuseScore GUI에서 실제 작성, export, reopen snapshot 필요 | Manual QA required | MuseScore GUI로 grand staff score를 작성해 export하고 warning snapshot/reopen screenshot을 추가한다. |
| CV1-MXML-FINALE-MIGRATION-FIXTURE | Finale-origin migration fixture 수집 | MusicXML Compatibility | Finale MusicXML migration / Simple Entry legacy workflow | Finale 사용자 이전 파일을 상용 V1에서 검증했다고 말할 수 없다. | fixture가 있으면 자동 검증 가능 | Finale 설치 환경 또는 사용자 제공 Finale-origin MusicXML 필요 | Blocked external | Finale-origin uncompressed MusicXML과 출처/버전/export setting을 받아 `origin: app-export` fixture로 추가한다. |
| CV1-MXML-DORICO-SIBELIUS-FIXTURES | Dorico/Sibelius app-export fixture 수집 | MusicXML Compatibility | Dorico layout/export, Sibelius Dynamic Parts/MusicXML migration | secondary commercial reference 호환성 근거가 compatibility seed에 머문다. | fixture가 있으면 자동 검증 가능 | Dorico/Sibelius 설치 환경 또는 실제 export 파일 필요 | Blocked external | Dorico/Sibelius 실제 export 파일을 수집하고 manifest expectation/warning snapshot을 연결한다. |
| CV1-MULTIVOICE-GRAND-STAFF-WORKFLOW | Same-staff multi-voice 실전 workflow 완성 | Same-Staff Multi-Voice | MuseScore/Dorico multiple voices, Finale layer-style entry | 피아노/합창 악보에서 voice별 rest/stem/selection/export 신뢰가 부족하다. | 자동 회귀는 현재 가능 범위 완료 | 복잡한 PDF engraving과 SATB/piano 실제 작성 QA는 수동 확인 필요 | Manual QA required | voice별 selection/range/delete/copy/paste/playback/MusicXML 기본 회귀와 filtered copy/paste 회귀는 자동화되었다. RC 전 SATB 또는 piano grand staff 실제 악보를 작성해 rest/stem/engraving/PDF 시각 결과를 manual QA에 기록한다. |
| CV1-SELECTION-FILTERS | Voice/object selection filter | Editing Workflow | MuseScore selection filters, Dorico filters, Sibelius filter/copy reliability | 대량 편집 때 다른 voice나 표기 객체가 같이 바뀔 위험이 있다. | V1 필수 event-type filter 자동화 완료 | object-type fine filter UX는 후속 polish | Done | V1 필수 범위는 `전체/음표만/쉼표만` event-type filter로 고정했다. Filtered delete/copy/paste는 addressed same-staff voice 안에서만 작동하고, non-contiguous filtered copy는 rhythm gap을 만들지 않도록 거부한다. Lyrics/chord/dynamics 같은 object-type fine filters는 promoted될 때 별도 V1 Polish/Post-V1 row로 연다. |
| CV1-PART-EXPORT-MANUAL-QA | 선택 파트보 export 수동 QA | Parts / Part View | MuseScore parts, Dorico layouts/Print, Sibelius Dynamic Parts | 총보와 파트보 export가 섞이면 리허설 배포에 실패한다. | 부분 가능: export path smoke 존재 | file dialog PDF/MusicXML/MIDI와 사람이 PDF 여는 확인 필요 | Manual QA required | string quartet에서 full score/selected part export를 실제 file dialog로 저장하고 matrix에 Pass/Fail을 기록한다. |
| CV1-PDF-FILEDIALOG-VISUAL-QA | PDF page setup visual QA | PDF / Page Setup | MuseScore page layout, Dorico Engrave/Print | page size, margin, staff/system spacing이 실제 출력에서 잘릴 수 있다. | 부분 가능: renderer metadata/structure smoke 존재 | 사람이 PDF를 열어 solo/piano/ensemble/part를 확인 필요 | Manual QA required | release QA score 3종과 선택 파트보 PDF를 저장해 visual checklist를 채운다. |
| CV1-PLAYBACK-LISTENING-QA | playback/mixer 청감 QA | Playback / Mixer | MuseScore playback/mixer, Sibelius playback workflow | 자동 timeline은 통과해도 실제 소리, mute/solo/volume 체감은 미확인이다. | 부분 가능: timeline/scheduler 테스트 존재 | 실제 앱에서 사람이 들어야 함 | Manual QA required | solo, grand staff, ensemble에서 repeat/volta, cursor sync, mixer 조합 청감 결과를 기록한다. |
| CV1-PACKAGED-WINDOWS-SMOKE | Windows packaged smoke | Packaged App / Release QA | 상용 데스크탑 앱 OS별 설치/첫 실행 | Windows 사용자가 설치/저장/export 가능한지 검증되지 않았다. | CI/Windows runner가 있으면 가능 | Windows 환경 또는 CI artifact 필요 | Blocked external | Windows package를 생성하고 설치/첫 실행/save/open/export smoke evidence를 추가한다. |
| CV1-UI-COMPACT-DESKTOP-VISUAL-QA | compact desktop command surface 최종 정리 | UI Information Architecture | MuseScore palettes/properties, Dorico mode/panel, Sibelius ribbon/keypad | 기능이 많아졌지만 전문 사보앱처럼 빠르고 조용하게 보이는지 아직 확정되지 않았다. | 자동 guard는 현재 가능 범위 완료 | 사람이 compact desktop에서 조작 확인 필요 | Manual QA required | Electron E2E가 960px에서 File/Score Setup/Note Input/Notation Objects/Lyrics-Chords/Export-Page Setup/Playback mode를 순회하며 document/context/text overflow, File과 Export command 분리, Lyrics/Chords chord input 위치, playback controls 노출을 확인한다. RC 전 compact desktop screenshot 기준으로 사람이 naming/command density를 확인한다. |
| CV1-NATIVE-FORMAT-DECISION | native project format 또는 Commercial save policy 최종 판정 | Document Lifecycle | MuseScore/Dorico/Sibelius native project + MusicXML exchange | MusicXML-first 저장에서 앱 전용 상태가 사라지는 위험을 사용자가 오해할 수 있다. | 문서/테스트 가능 | 제품 결정 필요 | Done | V1은 native project format을 포함하지 않고 MusicXML primary save + local autosave/recent/view preference + export warning report 정책을 유지한다. `npm run verify:chromatics-v1-save-policy`가 release notes, known limitations, desktop V1 docs, export warning code/test, work queue consistency를 검증한다. Post-V1 native format 설계는 별도 work item으로 다시 열어야 한다. |

## Current Loop Notes

- 2026-09-11: 큐 파일과 `verify:chromatics-v1-work-queue` gate를 추가해 다음 실행이
  남은 blocker를 다시 수집하고 최소 5개 후보를 확인할 수 있게 한다.
- 2026-09-11: MuseScore CLI app-export fixture는 자동 evidence로 인정하지만,
  GUI-created source score, GUI reopen snapshot, human PDF review는 완료 처리하지 않는다.
- 2026-09-11: `CV1-SELECTION-FILTERS` 첫 implementation slice로 `notes/rests/all`
  event-type filter를 File command surface와 context strip에 연결했다. Filtered delete는
  addressed same-staff voice에서만 작동하고, copy/paste/object-type filters는 다음 action으로 남긴다.
- 2026-09-11: `CV1-SELECTION-FILTERS` 후속 slice로 filtered copy/paste도 `notes/rests/all`
  event-type filter를 따른다. Copy source와 paste target 모두 addressed voice 안에서 필터링하고,
  non-contiguous filtered range는 rhythm gap을 만들지 않도록 거부한다. Object-type fine filters는
  Commercial V1 필수 blocker가 아니라 별도 polish 후보로 분리한다.
- 2026-09-11: `CV1-UI-COMPACT-DESKTOP-VISUAL-QA` 자동 guard를 Electron E2E에 추가했다.
  960px compact desktop에서 모든 work mode를 순회하며 command placement와 overflow를 점검한다.
  남은 작업은 사람이 실제 화면 밀도와 naming을 확인하는 manual QA다.
- 2026-09-11: `CV1-NATIVE-FORMAT-DECISION`은 Commercial V1 정책을 `Done`으로 전환했다.
  V1 native project format은 포함하지 않고, MusicXML primary save 정책과 unsupported layout
  warning report를 `verify:chromatics-v1-save-policy`로 유지한다.
