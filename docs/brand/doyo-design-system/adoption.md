# 제품 적용과 이행

## 시작점

현재 저장소를 확인하면 웹·Electron은 `--inc-*` 토큰, Flutter 앱들은 각자의 `ColorScheme.fromSeed`를 사용한다. 공통 UI 패키지가 이미 도입된 것으로 가정하지 않는다.

| 대상 | 현재 진입점 | 첫 교체 범위 |
| --- | --- | --- |
| Clef & Staff | apps/in_c_sheet/lib/main.dart, InCSheetApp | ThemeData, 악보함 버튼·검색·목록·로딩 |
| Chromatics | src/renderer/src/styles.css, App.tsx | 의미 색 변수, focus, 툴바와 속성 패널 |
| 로컬 음악앱 | apps/classical_local_library/lib/main.dart | ThemeData, 검색·작품/녹음 목록·작업 피드백 |
| 커뮤니티 | apps/classical_community/lib/main.dart | ThemeData, 카드·입력·피드백 |
| 공개 사이트 | site/styles.css | 기존 --inc-* 역할을 의미 토큰으로 대응 |
| 연습 실험 | apps/in_c_click, apps/in_c_chime | 실제 출시 범위에 맞는 공통 제어 |

## 단계 1: 악보함 한 화면

추천 대상은 Clef & Staff다. 먼저 기존 화면을 기준으로 밝은/다크·빈 목록·긴 제목·가져오기 실패의 상태를 기록한다. 새 토큰과 테마, 공통 검색/버튼/목록/도요 로딩을 적용하고 기존 controller·파일 저장·주석 도메인은 그대로 둔다.

Flutter는 `doyoTheme(brightness: Brightness.light)`와 dark 변형을 MaterialApp의 theme/darkTheme에 연결한다. `themeMode`는 기존 설정 또는 제품 선택을 따른다. 기존 문서 표시 효과와 자동 테마를 결합하지 않는다. 색이 자동 재생성되지 않도록 명시한 ColorScheme 역할을 쓴다. [ThemeData](https://api.flutter.dev/flutter/material/ThemeData-class.html), [ColorScheme.fromSeed](https://api.flutter.dev/flutter/material/ColorScheme/ColorScheme.fromSeed.html)

DoyoColors 확장에서 scorePaper·scoreNotation과 사용자 정의 의미 색을 얻는다. 입력 오류·진행 상태·재시도는 원래 작업 상태에 연결한다. CircularProgressIndicator를 도요로 바꾸더라도 Future·취소·중복 작업 처리 코드를 새 타이머로 대체하지 않는다.

## 단계 2: 열람과 연습

보기/주석/연습 모드, 페이지 위치, 파일 오류를 공통 문법으로 옮긴다. 기존 PDF/이미지 렌더링·crop·rotation·표시 효과·주석 좌표는 유지하며 회귀 검증한다. 악보 로딩 중 이미 열린 문서를 비울지, 자리 표시와 이전 페이지를 유지할지는 실제 캐시·오류 정책에 맞춘다.

## 단계 3: 사보와 웹

| 기존 역할 | 도요 역할 |
| --- | --- |
| --inc-color-background / --inc-color-app-background | --doyo-background |
| --inc-color-surface | --doyo-surface |
| --inc-color-surface-muted | --doyo-surface-muted |
| --inc-color-text | --doyo-text |
| --inc-color-text-soft | --doyo-muted |
| --inc-color-border | --doyo-border |
| --inc-color-border-strong | --doyo-control-border |
| --inc-color-accent | --doyo-action |
| --inc-color-accent-contrast | --doyo-on-action |
| --inc-color-focus | --doyo-focus |
| --inc-color-error | --doyo-error |

과도기에는 앱 최상위의 제한된 영역에서 기존 변수를 새 변수에 연결할 수 있다. 기존 disabled-opacity를 그대로 모든 상태에 곱하지 말고 disabled 색 역할로 옮긴다. 조작부/카드 radius는 새 크기로 단계 적용한다.

선택·입력·재생의 오버레이는 score 토큰을 사용하며 export/print에서는 제외한다. 오버레이 좌표는 실제 NotationPreview 좌표 변환을 따른다. .chromatics 저장·MusicXML 교환·PDF 출력 회귀를 같은 변경에서 확인한다.

## 적용 완료 기준

- 원래 핵심 동선과 사용자 데이터 유지, 없는 클라우드·저장 기능을 새 문구로 암시하지 않음.
- 기본/hover/pressed/focus/disabled/loading/error/selected가 구분됨.
- 도요 로딩이 실제 비동기 상태와 연결되고, 반복 실행·취소·실패를 처리함.
- 움직임 줄이기, 화면 읽기, 키보드, 큰 글자와 다크 모드 확인.
- 각 제품의 기존 tests/analyze/build 중 변경에 맞는 검사 통과. 토큰 검증만으로 제품 회귀 검증을 대신하지 않음.

## iOS 작업 시 같은 변경에서 할 일

실제 앱 화면·동선에 적용할 때는 루트 [AGENTS.md](../../../AGENTS.md)를 따른다. `source.path`로 대상 YAML을 찾고 제품 변경 시 `source.state: pending`, `content.reviewed: false`로 되돌린다. Clef는 `deployment/apps/clef/ios-metadata.yaml`이다. 다른 앱에 파일이 없으면 템플릿을 사용한다.

설명·출시 문구·screenshots.scenes와 steps/assertions, 영향받은 manual 근거를 실제 변경에 맞춰 갱신한다. 미확인 캡처·기기 검증·연락처·commit 해시를 만들지 않는다. 버전과 빌드를 임의로 올리지 않는다.

```sh
cd deployment
bundle exec fastlane prepare_ios_metadata manifest:apps/clef/ios-metadata.yaml mode:check
```

이번 작업은 독립 문서·참조 구현이므로 제품 YAML을 변경하지 않았다. 실제 적용 시 해당 앱 경로의 명령으로 검사한다.
