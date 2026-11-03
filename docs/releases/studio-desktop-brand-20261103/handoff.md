# Studio 데스크톱 브랜드·입력 피드백 인계

현재 작업은 `feature/studio-desktop-brand-20261103`, 기준 HEAD `653497ac7a7fa692db430a1420040ed6fd6bf253` 위의 **미커밋 변경**이다. 원본 작업 공간·사용자 설치 앱·기존 alpha.38 게시물은 변경하지 않았다. 로컬 검증본 버전은 `0.1.0-alpha.38`이며 새 릴리즈가 아니다.

## 결과

| 항목 | 구현과 확인한 범위 |
| --- | --- |
| 이름·아이콘 | 띠로리 Studio / 현재 파란 연필 벡터. 실제 macOS 창·앱 메뉴·About·Dock·읽기 전용 DMG Finder 화면 확인 |
| 데이터 호환 | `com.mannlab.inc`, `appData/in-C`의 userData/sessionData, 프로젝트 형식·확장자·IPC·설정 키 유지. 임시 이전 프로필의 도크 폭207/360·최근 파일·복구·백업 확인 |
| 빠르기 | 새 악보 입력 중 값을 자동 보정하지 않는다. 40–240 정수 안내, 잘못된 초안 보존, Escape 복원, 유효한80bpm으로 실제 프로젝트 저장 |
| 꾸밈음 | 상시 도구의 꾸밈음 버튼과 Alt+G. 기존 음표 변환은 Alt+Shift+G; 승인대로 뒤 음표를 당기고 끝을 쉼표로 채운다. 제한 조건과 한 undo/native/XML 계약 확인 |
| 음가 확대 | 뒤 음표와 겹치면 확인·취소 후 기존 리듬 transaction으로 덮어쓴다. 겹치는 음표 전체와 부착 표기가 대체되고 남는 부분은 쉼표. 보호된 타이·구간 경계는 거부 |
| 도움말 | 도움말 → 단축키 도움말과 [사용 안내](../../product/studio-user-guide.md). 현재 코드 기준의 입력·선택·저장·꾸밈음·변박자 설명 |
| 방향키 | ↑/↓ 반음, ⌘/Ctrl+↑/↓ 옥타브, Alt+Shift+↑/↓ 온음계, Alt+↑/↓ 보표 선택. 메뉴가 소비한 키를 전역 명령이 재실행하지 않도록 수정 |
| 슬러 | 검은 filled taper. 실제 끝만 가늘게 하고 줄바꿈 연결부 두께를 유지한다. 기존 중심선·끝점·수동 geometry·hit 경로와 타이 경로는 보존 |
| 변박자 | 마디 우클릭 → 박자표 변경… → 실제 박자표 필드 포커스. 대상 파트·보표·마디와 ‘선택 보표의 이 마디만’ 표시.960/1400 native 입력·한 undo·저장/재열기·PDF, 단위 XML 왕복 확인 |

## 검증

- 새 기능 focused: 11파일39검사 PASS. 추가 마디 native/XML 왕복 PASS, 메뉴 키 소유권 관련14검사 PASS.
- typecheck/build, Studio R3 notation profile, fixed-canvas, 패키지 metadata5검사 PASS.
- `compat-integrated-n/current.json`: 실제 main/preload/renderer의960/1400 입력·파일·PDF·키보드·우클릭. 파일 대화상자는 자체 fixture로 연결한 adapter다.
- 곡선6경로: 동일한 native 입력에서 타이 `d`와 슬러 중심선이 정확히 같다. 양 폭의 PDF 이미지가 같고 자동·수동·줄바꿈 세 가지 변경 전후 실제 출력 잉크를 검토했다.
- 최신 전체 gate: **Vitest364파일/3,811검사 PASS, 외부 opt-in1파일/1검사 skip, Node 도구5검사 PASS (551.42초, 입력/빌드1,026개 변경 없음)**. `out/brand-qa/suite-input-b.json`의1,026개 입력/빌드 파일을 고정했으며 전체 실행 중 제품·테스트·QA 스크립트 수정이나 build/Electron은 하지 않는다.
- 첫 전체 실행은 오래된 도움말/빠르기 문구 기대값2개 때문에 실패했다. 원래 실패와 이후 이행 검사를 보존했다. 방향키 이행 중 메뉴가 악보를1회 수정하던 회귀는 기존 assertion을 유지한 채 제품에서 수정했다.

현재 두 notation 기준의 변경은 각각 **슬러 bbox y/높이9값**뿐이다. 중심선만 측정하던 경로를 filled 잉크로 바꾸면서 생긴 차이를 화면/PDF로 검토했다. 다른 기호·노트 수·지면 크기·음악 중심선은 그대로다. 변경 전 기준·차이·원인은 `checks/baseline-review.json`에 남겼다. 역사적 반환 자료와 responsive 실패를 PASS로 바꾸지 않았다.

실제 ASAR의 main/preload/renderer 컴파일 파일8개가 고정한 빌드와 해시 일치한다. 새 이름의 실제 패키지를 외부 HTTP 차단·최종 출력 음소거 상태로15초 실행해 worker 준비415ms, sample 시작663ms,54개 source 생성/최대6개 동시/near-late0을 확인했다. 프로그램으로 재생을 시작하는 별도 sample/worker smoke이며,605초 자연 종료·청음·실제 포인터 UX 검사로 확대하지 않는다. QA copy와 원래 script 해시·음소거 방법은 checks/piano-method.json을 따른다.

## 로컬 패키지

`out/brand-package-feedback/Ddirori-Studio-0.1.0-alpha.38-mac-arm64.dmg` 및 같은 stem의 ZIP. arm64 / 오프라인 ad-hoc 서명이며 Developer ID·공증·universal·배포 승인이 아니다. 최신 패키지의 mounted smoke는 기존 프로젝트·복구·백업·XML/MXL·MIDI·PDF/파트보 assertion을 유지한다.

macOS 한글 시작 실패는 builder가 파일명을 NFD로 생성하지만 CFBundleName은 NFC로 남겨 helper 해석이 실패하던 사례다. CFBundleName과 CFBundleExecutable의 정규화를 맞춘 대조군에서 시작 실패가 사라졌다. 표시명은 NFC로 유지한다. `identity=-`를 사용한 초기 로컬 시도는 의도와 달리 Developer ID 선택을 시작해 중단했으며, 그 불완전한 결과를 승인하지 않았다. 최종 검증본은 `identity=null`, 자동 인증서 검색 없음, 별도의 offline ad-hoc afterPack을 사용했다. 공증·업로드는 하지 않았다.

[DMG](captures/dmg.png), [실제 창](captures/native-window.png), [About](captures/about.png), [Dock](captures/dock.png), [변박자 필드](captures/meter-entry-960.png), [단축키 도움말](captures/shortcuts.png)을 직접 검토했다. OS 검사는 자체 프로세스·프로필·Finder 창만 사용했고, DMG를 분리하고 자체 앱을 종료했다. 캐시 초기화나 기존 앱 삭제·설치는 하지 않았다.

## 지원 경계와 후속

- 박자표 목록은 현재2/4·3/4·4/4·6/8이다. 총보 공통/이후 마디 적용이나 사용자 지정 박자표를 새로 구현한 것이 아니다. 기존 음표가 새 마디 길이를 넘으면 변경을 거부한다.
- 개별 화음 구성음 선택·부분 화음 타이·Shift+↑/↓ 보표 범위 확장은 미지원이다. 음가 확대는 같은 마디의 기존 지원 리듬 범위부터 처리한다.
- 꾸밈음의 내부 재생/MIDI 별도 발음은 추가하지 않았다. 표기·native/XML 보존과 재생 지원을 구분한다.
- Windows/Linux는 실제 builder metadata/경로 계약 검사이며 해당 OS의 설치·실행 승인이 아니다.
- 실제 사용자 프로젝트, 물리 IME·OS 파일 dialog·스크린리더·청음·외부 MuseScore GUI/MIDI 호환 검증은 이번 검증 범위가 아니다. MuseScore 키 기준은 공식 핸드북을 확인했으며 GUI 실험으로 주장하지 않는다.
- 다음 릴리즈는 별도 버전·서명/공증·universal·Windows/Linux 검증·사이트 다운로드 반영이 필요하다. 현재 태그·다운로드·사이트 PR을 바꾸지 않았다.

소스/산출물 해시는 `source.json`, `artifacts.json`, 채택 아이콘은 `icon-source.json`, 상세 초기 실패는 `failures.md`를 참고한다. Commercial V1/RC 전체 완료가 아니다.
