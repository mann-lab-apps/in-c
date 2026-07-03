# in-C 프로젝트 파일과 자동저장 전략

이 문서는 in-C의 작업 보존용 프로젝트 파일, 자동저장, 복구 UX의 기준을 정한다.
MusicXML은 교환 포맷으로 유지하고, 프로젝트 파일은 앱의 편집 상태를 보존하는
작업 포맷으로 둔다.

## 목표

- 사용자가 작성 중인 악보를 다시 열었을 때 편집 상태가 최대한 유지되어야 한다.
- MusicXML 가져오기·내보내기와 프로젝트 저장·열기의 의미가 섞이지 않아야 한다.
- 향후 레이아웃, 파트보, 합주보, 웹 서비스형 편집기로 확장해도 포맷을 버리지
  않아야 한다.
- 자동저장과 복구는 사용자 파일을 조용히 덮어쓰지 않아야 한다.

## MusicXML과 프로젝트 파일의 역할

| 구분 | MusicXML | in-C 프로젝트 |
|---|---|---|
| 목적 | 다른 사보 도구와 교환 | in-C 작업 상태 보존 |
| 사용 버튼 | 가져오기, 내보내기 | 열기, 저장, 다른 이름으로 저장 |
| 보존 대상 | 음악 의미 중심 | 음악 의미, 편집 상태, 레이아웃 힌트, 앱 메타데이터 |
| 안정성 기준 | MusicXML subset과 round-trip | in-C 버전 간 migration |
| 파일 의미 | 외부 호환 문서 | 앱의 원본 작업 파일 |

사용자-facing 용어는 다음처럼 구분한다.

- `저장`: in-C 프로젝트 파일 저장.
- `열기`: in-C 프로젝트 파일 열기.
- `가져오기`: MusicXML을 in-C score로 변환.
- `내보내기`: MusicXML 또는 PDF 생성.
- `PDF 변환`: 악보를 읽기/공유용 PDF로 생성.

## 파일 형식 결정

MVP 이후의 기본 프로젝트 확장자는 `.incproj`로 둔다.

`.incproj`는 내부적으로 ZIP 컨테이너를 사용한다. 압축 파일이지만 사용자는 하나의
프로젝트 파일로 다룬다. 앱 내부에서는 같은 구조를 디렉토리로 풀어 자동저장과 복구에
사용할 수 있다.

압축 컨테이너를 기본값으로 두는 이유:

- 향후 이미지, 원본 MusicXML, 파트보 cache, 협업 메타데이터를 함께 담을 수 있다.
- 웹 서비스형 편집기에서도 같은 manifest와 score payload를 사용할 수 있다.
- `.mxl`처럼 하나의 파일로 공유하면서도 내부 구조를 확장할 수 있다.
- 사용자에게는 단일 파일로 보여 저장/백업/공유가 단순하다.

## 내부 구조 초안

```txt
score.incproj
  manifest.json
  score.json
  editor/state.json
  layout/hints.json
  parts/views.json
  assets/
  cache/
```

### `manifest.json`

프로젝트 컨테이너의 진입점이다.

```json
{
  "format": "in-c-project",
  "formatVersion": 1,
  "createdWith": {
    "app": "in-C",
    "version": "0.1.0-alpha.2"
  },
  "scorePath": "score.json",
  "editorStatePath": "editor/state.json",
  "layoutHintsPath": "layout/hints.json",
  "partViewsPath": "parts/views.json",
  "createdAt": "2026-07-02T00:00:00.000Z",
  "updatedAt": "2026-07-02T00:00:00.000Z"
}
```

규칙:

- `formatVersion`은 breaking migration이 필요할 때 올린다.
- 컨테이너 내부 경로는 상대 경로만 사용한다.
- 앱 버전은 migration과 오류 메시지에 사용한다.
- 알 수 없는 manifest 필드는 보존하거나 무시할 수 있어야 한다.

### `score.json`

`src/score-core`의 `Score` 모델을 저장한다. MusicXML이 아니라 in-C의 canonical
score JSON이다.

규칙:

- score-core validation을 통과한 상태만 저장한다.
- event ID, measure ID, tuplet ID, tie 관계를 그대로 보존한다.
- 향후 다중성부와 여러 part를 위해 part/staff/voice 주소 구조를 유지한다.
- MusicXML import 원본은 필요하면 `assets/original.musicxml`에 별도 보관한다.

### `editor/state.json`

사용자가 다시 열었을 때 이어서 작업하기 위한 편집 상태다.

포함 후보:

- 현재 선택 상태.
- 현재 note input state.
- 마지막 활성 measure.
- 현재 음가, 임시표, 입력 모드.
- tempo와 playback UI 상태.
- undo/redo stack은 MVP에서는 저장하지 않는다.

undo/redo stack은 세션 안의 임시 편집 기록으로 취급한다. 프로젝트를 다시 열면
비어 있는 상태로 시작한다.

### `layout/hints.json`

사용자가 기대하는 배치 정보를 보존하기 위한 공간이다.

MVP에서는 비어 있거나 최소 구조만 둔다. #104 이후 다음 정보를 담을 수 있다.

- 수동 system break.
- 수동 page break.
- page size, margins, staff size.
- measure width override.

자동 사보 결과 cache는 canonical 데이터가 아니며, 필요하면 `cache/`에 둔다.

### `parts/views.json`

향후 합주보와 파트보를 위한 view 정의다.

MVP에서는 full score view 하나만 둔다.

```json
{
  "views": [
    {
      "id": "full-score",
      "type": "full-score",
      "name": "Full Score",
      "partIds": ["part-1"]
    }
  ]
}
```

파트보 추출은 score 데이터를 복제하지 않고 view/cache로 다룬다. canonical 음악
데이터는 항상 `score.json` 하나다.

## 저장 UX 정책

기본 버튼 의미:

- `저장`: 현재 프로젝트 경로가 있으면 `.incproj`에 저장한다.
- `저장`: 현재 프로젝트 경로가 없으면 `다른 이름으로 저장`을 연다.
- `다른 이름으로 저장`: 새 `.incproj` 경로를 선택한다.
- `MusicXML 내보내기`: 외부 교환용 `.musicxml`을 생성한다.
- `PDF 변환`: 인쇄/공유용 PDF를 생성한다.

상태 표시:

- 저장된 상태: `저장됨`.
- 변경 있음: `저장되지 않음`.
- 자동저장됨: `자동저장됨`.
- 복구본 열림: `복구본`.

앱 종료 또는 새 파일 열기 전:

- 저장되지 않은 변경이 있으면 `저장`, `저장하지 않음`, `취소`를 제공한다.
- 자동저장본만 있고 사용자가 명시 저장하지 않은 경우, 자동저장본 위치를 사용자에게
  파일 경로처럼 노출하지 않는다.

## 자동저장 정책

자동저장은 사용자 파일을 직접 덮어쓰지 않는다.

저장 위치:

```txt
<userData>/autosave/
  sessions/
    <autosave-id>/
      autosave.incproj/
      metadata.json
```

권장 주기:

- score 또는 editor state가 바뀐 뒤 2초 debounce.
- 변경이 계속 이어지면 최대 30초마다 한 번 저장.
- 명시 저장이 성공하면 해당 프로젝트의 오래된 자동저장본은 정리 후보가 된다.

`metadata.json` 포함 후보:

- 원래 프로젝트 경로.
- autosave 생성 시각과 갱신 시각.
- 앱 버전.
- score title.
- 마지막 정상 종료 여부.

자동저장 실패:

- 사용자의 편집을 막지 않는다.
- 상태 영역에 간단히 알린다.
- 같은 세션에서 반복 실패하면 너무 자주 알리지 않는다.

## 복구 UX 정책

앱 시작 시 또는 새 프로젝트 열기 전 다음을 확인한다.

1. autosave metadata를 읽는다.
2. 정상 종료되지 않은 세션의 autosave가 있는지 확인한다.
3. 원래 프로젝트보다 autosave가 최신인지 확인한다.
4. 복구 후보가 있으면 사용자에게 보여준다.

복구 dialog의 선택지:

- `복구`: autosave를 임시 프로젝트로 연다.
- `삭제`: autosave를 버린다.
- `나중에`: 이번 실행에서는 건너뛰고 metadata를 유지한다.

복구 후:

- 복구본은 원래 파일을 자동으로 덮어쓰지 않는다.
- 사용자가 `저장`하면 원래 경로에 저장할지 새 경로로 저장할지 확인한다.
- 복구본을 명시 저장하면 해당 autosave는 정리한다.

## 웹 서비스형 편집기와의 호환

프로젝트 포맷은 로컬 파일이지만 서버 저장 모델과 충돌하지 않게 설계한다.

- 컨테이너 내부 데이터는 JSON 중심으로 둔다.
- 절대 로컬 경로를 canonical 데이터에 저장하지 않는다.
- assets는 content hash 또는 project-relative path로 참조한다.
- manifest에 `projectId`가 있더라도 로컬 파일명과 분리한다.
- 협업 metadata는 `collaboration/` 같은 별도 영역으로 확장한다.

## 확장 이슈와의 관계

- #94 합주보: `score.json`의 여러 part가 canonical 데이터가 되고,
  `parts/views.json`은 full score와 part views를 정의한다.
- #104 레이아웃: `layout/hints.json`이 수동 system/page break와 page setup을
  저장한다.
- #66 웹 서비스형 편집기: 같은 manifest와 score payload를 서버 document로
  저장할 수 있어야 한다.

## 구현 단계 제안

1. `.incproj` 저장/열기 최소 구현.
2. 저장 상태와 메뉴/버튼 용어 정리.
3. 자동저장과 복구 dialog 구현.
4. MusicXML/PDF 내보내기와 프로젝트 저장 UI 분리.
5. 레이아웃 힌트와 파트보 view 확장.

## 후속 구현 이슈

이 문서는 #105의 설계 산출물이다. 실제 구현은 별도 이슈로 진행한다.

- #127 `.incproj` 프로젝트 저장/열기 구현.
- #128 자동저장과 복구 dialog 구현.
- #129 저장, MusicXML 내보내기, PDF 변환 UI 분리.
