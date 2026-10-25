# Studio: 악보는 넓게, 명령은 정확하게

기존 [S-STUDIO](../specifications/services/studio.md), [screen-contract](screen-contract.md)를 따른다. 첫 범위는 기존 명령군 하나 + SpanProperties와 주변 chrome. 전체 기보 엔진은 유지한다.

## 소스·구성 분류

실제 React/Electron: `src/renderer/src/App.tsx`, `SpanProperties.tsx`, 해당 CSS, `src/score-core/`. 공유 React `packages/ddirori_web`, 기존 root file dependency `@ddirori/ui`. 다른 Chromatics worktree는 수정/닫기 금지.

| 분류 | 구성 |
| --- | --- |
| 1 공통 재사용 | 이미 적용된 Text/Input/IconButton, Button/Choices/상태와 surface/action/typography/density 토큰 |
| 2 앱 adapter | GeometryInput, SpanEndpoints, 명령 enablement/keymap, dock·selection·문서 저장/undo |
| 3 공통 API 검토 | native select를 공통 Select로 옮길 때 탐색/확정 command 횟수가 같은지 검토. NumberControl은 undefined 자동을 못 나타내므로 무조건 대체 금지 |
| 4 목표 설계 | 전체 neutral chrome·dark, narrow inspector 접기, mixed multi-selection. 현재 단일 span/none 실제 지원을 mixed 지원으로 보고하지 않음 |

## 영역과 토큰

문서명/dirty/저장 → 기존 파일/악보/음표/표기/가사/내보내기/재생 분류 → 현재 도구군 → PaletteDock | NotationPreview | SelectionInspector → 선택/입력 맥락. 카테고리·명령을 삭제하거나 순서를 무단 변경하지 않는다. 리뷰의 3개 토글은 밀도 샘플이며 전체 명령 목록이 아니다.

크림색 chrome를 neutral background/surfaceMuted/border로 치환, 악보 인쇄 지면/기보 metrics는 유지. compact32 컨트롤·18px glyph·label14, group gap8/16, inspector group12/24. 실제 사용자 dock 폭200–360를 유지, 신규 기본280. 리뷰의260은 비교 viewport 배치 예시이며 제품 저장 폭을 덮어쓰지 않는다.

1024 이상 주요 dock 나란히. 좁은 창/200%는 명령 그룹 wrap 또는 그룹별 scroll, inspector 접기/다시 열기 가능. 숨긴 panel focus는 trigger로 복귀. 선택/문서 scroll/pan/zoom은 남는다. 320 모바일 사보 기능을 새로 지원한다고 주장하지 않는다. 터치 기기에서는 compact32가 아닌48 target.

## 상태와 편집 계약

- 선택 없음: 필드 disabled + “표기를 선택하면 속성을 바꿀 수 있어요.” 기존 선택 panel empty message 우선.
- 단일 선택: label/value/unit. `undefined`는 자동, `0`은 명시적 offset. px/rem을 sp로 전달하지 않는다. GeometryInput min/max/step(.25) 현행 유지.
- 입력 draft: renderer local. Enter/blur command1회·undo snapshot1개. Escape는 draft 복원·전역 선택 해제로 전파 금지. IME composition 중 Enter는 저장/전역 명령 발생 금지.
- 선택 변경/외부 value 변경: 현행 draft reset과 selection key remount를 유지. 이전 대상 draft가 새 객체로 저장되지 않는다.
- endpoint: 기존 미지원 옵션을 숨겨 자동 재지정하지 않는다. 역순/다른 파트 유효성은 엔진. 오류는 입력 옆 설명, 원래 선택과 문서 유지.
- reset: undefined 복원 명령이며 0 입력과 별개. delete/undo/redo 활성 상태는 실제 engine 가능 여부.
- 파일 저장: 성공 때만 clean. 실패는 문서·dirty·선택·undo 유지. 취소는 기존 dialog 동선. 복구/backup/내보내기 동작을 UI 개선과 함께 바꾸지 않는다.
- mixed UI는 후속 범위. 현재 없는 기능을 회색 placeholder로 완성 기능처럼 추가하지 않는다.

## 접근성·수용 조건

키보드 순서 category→tools→workspace→inspector. 실제 keymap 기준 Cmd/Ctrl 표기. input/IME 중 음표 입력·Delete·전역 Escape 차단. label/단위/자동 placeholder·disabled 사유 유지. F6 등 새 traversal shortcut은 기존 충돌 조사 없이 추가하지 않는다.

`npm run typecheck`, 관련 SpanProperties·renderer tests, 영향받은 score-core·notation snapshot 검사. `npm run build` 후 `env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron scripts/verify-ddirori-studio.cjs`로 실제 renderer의 입력/undo와 overflow 확인. 실제 OS 메뉴·파일 dialog·물리 IME·스크린리더·MusicXML/PDF 출력은 수행한 항목만 증거 보고.

필수 비교: 기존207px/기본280px/저장360px,1280·좁은 창·200%, 단일/none/오류/dirty/저장실패. 저장→재열기·undo/redo·기존 프로젝트 fixture 동등. focus 숨김 없음. CSS는 chrome scope에 한정, 기보 glyph와 문서 geometry snapshot 불변.

범위 밖: 엔진/프로젝트 schema·이름/최종색/런처·릴리스·다른 worktree. 현재 desktop-only scope에는 iOS metadata 갱신을 만들지 않는다. 영향이 생기면 실제 source.path로 manifest 찾고 AGENTS 적용. 반환은 [handoff-review](handoff-review.md).
