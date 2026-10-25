# S-STUDIO 사보·편집

실제 제품: [App.tsx](../../../../../src/renderer/src/App.tsx), [SpanProperties.tsx](../../../../../src/renderer/src/SpanProperties.tsx), [score-core](../../../../../src/score-core/index.ts). React/Electron. 별도 [catalog/studio](../../../../../packages/ddirori_web/catalog/studio/)는 기보 fixture와 UI 상태 실험이며 실제 명령 실행/파일 저장의 증거가 아니다. 아래 facade/DTO는 **목표 설계**, 현재 props를 대체하지 않는다.

2026-10-25 실제 적용: SpanProperties가 @ddirori/ui의 Text/Input/IconButton과 scoped CSS를 사용한다. 숫자의 undefined·0·sp·step·undo는 앱 adapter 소유다. 단일 span/선택 없음만 지원하며 mixed facade는 아래 목표 설계다. [실행·검증](../../shared-baseline.md).

## 앱 내부 API 제안

```ts
// 제안: renderer presentation 계약. 엔진 타입은 adapter 뒤에 둔다.
type UiValue<T> = {kind:'none'} | {kind:'single'; value:T} | {kind:'mixed'};
type CommandView = {id:string; label:string; shortcut?:string;
  enabled:boolean; disabledReason?:string; selected?:boolean};
type FieldView<T> = {id:string; label:string; value:UiValue<T>;
  enabled:boolean; unit?:string; error?:string};
type StudioActions = {
  invoke:(commandId:string)=>void;
  commit:(fieldId:string,value:string|number|boolean)=>void;
  reset:(fieldId:string)=>void;
};
```

none=해당 선택 대상 없음, mixed=여러 대상의 서로 다른 값, single.value undefined를 none/mixed로 재활용하지 않는다. reset은 자동 배치 복원 등 도메인 의도를 뜻하므로 숫자0 입력과 별개다. commandId는 현행 엔진 command와 1:1 매핑 표를 adapter에 작성하고 문자열 eval/동적 bridge 호출 금지. 이벤트는 요청, 완료·undo snapshot은 엔진이 반환한다.

## 전용 구성

| ID / 연결 지점 | anatomy·기초 | 표시 입력 / 이벤트 | 상태·키보드·경계 |
| --- | --- | --- | --- |
| S-STUDIO-01 InputToolbar · toolbarCategories/App | category → 명령군 → 음가·점·쉼표·임시표·성부. gap8/group16, compact32, tool radius8, glyph18 기보 별도 | CommandView[], inputMode, durationId, voiceId; invoke/setInputMode/setDuration/setVoice | 입력 모드와 기존 선택 속성 분리. 토글 aria-pressed, 단일값 Segmented, 명령 Button. disabledReason tooltip; disabled 실행 금지 |
| S-STUDIO-02 SelectionInspector · selection-toolbar/SpanProperties | 선택 요약 → label/value fields → reset/delete; label14, group12/24, panel 기본280/min240 | FieldView[], selectionKind, selectionCount; commit/reset/delete | mixed는 힌트로 표시, 0으로 저장 금지. Enter/blur 확정은 한 번, Escape draft 복원. IME composition 보호 |
| S-STUDIO-03 SpanEndpoints · SpanProperties | 표기 선택 → 시작/끝 Select → 주소 output → geometry numbers | selected span ID, endpoint options, placement, optional engraving fields; onStart/onEnd/onEngravingChange | 역순·다른 악기 등 유효성은 엔진. 기존 unsupported endpoint 옵션은 숨겨 삭제하지 않음. reset은 undefined, 0과 구분 |
| S-STUDIO-04 PaletteDock · 실제 dock state | 검색/분류 → glyph button grid → 빈 결과, resize/close/restore | paletteId, query, allowed tools, dock visibility/width; selectTool/resize/toggle | 검색 clear가 glyph 삽입을 발생시키지 않음. 선택없음·적용불가 분리. 숨김 후 toggle로 focus 복귀 |
| S-STUDIO-05 HistoryFileStatus · 기존 undo/redo/backup UI | command buttons + dirty/saving/error label + recovery dialog | canUndo/Redo, dirty, saveState, current title, recovery choices; invoke/restore | 실제 저장 성공만 clean 표시. confirm은 손실 가능 행동에만. 실패 후 문서 유지; 기존 Electron bridge boundary |

가변 dock 폭200~360/사용자 저장 상태와 기존 전환을 최초 이행에서 보존한다. 공통 panelWidth280을 강제해 저장 값을 잃지 않는다. 현재 App.tsx에는 native select가 남아 있다. 공통 Select 도입 시 id/label만 바꾸지 말고 값 탐색·확정 시점의 변화가 편집 command 횟수에 미치는 영향을 확인한다.

## 명령·focus·단위 전이

1. 단일 선택을 adapter가 읽어 FieldView.single 생성. 사용자가 숫자 입력하면 UI draft만 갱신.
2. commit 시 유효성 확인 → 엔진 command 1회 → undo snapshot 1개 → 새 표시값 반영.
3. mixed 상태에서 값 입력은 선택 전체에 명시적으로 적용. untouched mixed field는 저장 명령 없음.
4. Escape는 draft만 복원. 텍스트 입력의 Escape가 전역 선택 해제까지 전파되지 않도록 scope를 정한다.
5. panel 닫힘/모드 전환 때 focus를 유효한 trigger로 옮기며 selection 자체는 유지한다.

`sp`는 기보 공간 단위다. UI px/rem을 engraving offset으로 전달하지 않는다. existing GeometryInput은 min/max/step/undefined의 의미를 가지고 있으므로 NumberControl에 맞추려고 빈 값을0으로 바꾸지 않는다. 숫자 단위와 `자동` placeholder를 유지한다. 키보드 입력 영역 안에서 전역 음표/삭제 단축키가 실행되면 실패다.

## 구성·시각 패턴

```text
AppHeader(문서명 + 상태 + 파일 행동)
  InputToolbar(모드/명령/선택 도구)
  Workspace
    PaletteDock | 기존 NotationPreview | SelectionInspector
  Status(선택 범위·입력 맥락)
```

공통 CSS는 chrome에만 scope한다. canvas/악보 출력·VexFlow geometry·font metrics는 기존 엔진 유지. 좁은 창은 dock을 접거나 세로 배치하되 문서 scroll과 UI overflow를 분리한다. 200%에서 가로 명령군은 wrap 또는 그룹 단위 scroll; 글자 축소로 억지 맞춤 금지. 단축키는 mac Cmd와 win/linux Ctrl 표기를 실제 앱 keymap으로 생성한다.

## 이행·검증

첫 이행은 독립 명령군 하나와 그 속성 필드. 다음 selection inspector, 이후 dock/복구 흐름. root 외 진행 중인 Chromatics worktree에 변경하지 않는다. UI adapter를 revert하면 기존 command/프로젝트 파일이 그대로 작동해야 한다.

- Given mixed voice, When 새 voice 확정, Then 선택 전체 command 한 번/undo 한 번. 취소는 command0회.
- Given lyrics 한글 조합 중, When Enter, Then 입력 확정과 전역 명령이 중복되지 않음.
- Given span 지원되지 않는 endpoint, Then 값 숨김·자동 재지정 없음. 잘못된 역순 변경은 오류와 원래 선택 유지.
- Given dock focus 내부, When 닫기/restore, Then 숨은 DOM focus 없음·폭 보존.
- Given 저장 실패/backup 복원 취소, Then dirty/문서/선택을 성공 상태로 덮지 않음.
- UI가 바뀌어도 MusicXML/PDF·undo/redo·save/reopen 결과는 기존 fixture와 동등.

검증 후보: root `npm run typecheck`, `npm run test:components`, 관련 editor/score-core tests, 기존 notation snapshots. UI catalog는 별도 검사. Electron 실제 Cmd/Ctrl·메뉴·파일 dialog와 출력은 제품 QA. 패키징·배포는 이행 권한에서 추론하지 않는다.

## 2026-10-24 실제 입력 보완

실제 `SpanProperties.GeometryInput`에 dirty/composition 가드를 적용했다. Enter는 조합 완료 후 blur 경로에서 편집당1회 확정하고 Escape는 draft만 취소하며 상위 keydown으로 전파하지 않는다. 외부 value 변경 시 draft/dirty를 초기화한다. 빈값=undefined/자동, min/max/step/sp 단위를 보존했다. 공통 패키지 전면 이행은 아니다.

근거: [아이콘·시스템 감사](../../../ddirori-brand-system/icon-family-v2/audit.md)의 H03과 `src/renderer/src/SpanProperties.test.tsx`.
