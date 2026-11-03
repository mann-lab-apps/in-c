# Studio 사용자 피드백 실행 큐 — 2026-11-03

작업: `feature/studio-desktop-brand-20261103`, base653497ac. 별도 영구 worktree의 미커밋 변경이며 원본 in-c·설치 앱·게시된 alpha.38·사이트는 변경하지 않았다. 최신 상세 결과는 [인계](../releases/studio-desktop-brand-20261103/handoff.md)를 참고한다.

| 순서 / ID | 구현한 범위 | 현재 근거 |
| --- | --- | --- |
| 1 BRAND-01 | 표시명 띠로리 Studio, 현재 blue pencil SVG → PNG/ICNS/ICO, metadata 기반 패키지 경로. 기존ID·데이터 경로 보존 | 실제 읽기 전용 DMG·Finder·앱 실행 창·OS 메뉴·About·Dock, mounted smoke PASS. 로컬 arm64 ad-hoc이며 공개 릴리즈가 아님 |
| 2 TEMPO-01 | 새 악보의40–240 정수 입력을 draft로 유지, 범위 밖 오류·Escape·생성 검증 | focused2 및 실제960/1400의999 보존/취소/80bpm native 저장 |
| 3 GRACE-01 | 상시 꾸밈음 Alt+G, 기존 음 변환 Alt+Shift+G. 뒤 음을 당기고 끝을 쉼표로 채우는 승인 정책 | 단위·App·native/XML/MIDI 왕복·실제 화면/PDF·한 undo. 타이·잇단음표·부착 표기가 있는 원본 등 미지원 조건 명시. 별도 grace 발음은 추가하지 않음 |
| 4 HELP-01 | 도움말 → 단축키 도움말, 현재 코드의 입력·선택·음가·성부·저장·꾸밈음·박자표 안내 | 실제960/1400 도움말 및 public control/Space 격리 검사. [사용 안내](studio-user-guide.md) |
| 5 DURATION-01 | 뒤 음표와 겹치는 확대를 확인·취소 후 기존 rhythm transaction으로 덮어쓰기 | 실제 native·undo·확인창·XML/MIDI 왕복. 같은 마디·성부 범위, 겹치는 음표 전체 대체/남는 꼬리 쉼표, 타이/기호 endpoint 보호 |
| 6 CURVE-01 | 슬러를 검은 filled taper로 변경. 실제 끝과 줄바꿈 연결부를 구분 | 자동/수동/줄바꿈 ×960/1400 실제 화면/PDF. 원본 native·타이 d·슬러 중심선/hit 동일. 기존 기준의 슬러 y/높이9값씩만 직접 검토 후 갱신 |
| 7 KEYMAP-01 | 기본↑/↓ 반음, ⌘/Ctrl↑/↓ 옥타브, AltShift↑/↓ 온음계, Alt↑/↓ 보표/성부 선택. 메뉴 소비 키의 전역 재실행 차단 | red5 → new focused/실제 native 파일의 음높이·한 undo. 메뉴0회 수정 assertion 유지. 개별 화음 구성음·Shift↑/↓ 범위 확장은 지원하지 않음 |
| 8 METER-01 | 우클릭 ‘박자표 변경…’ → 기존 실제 필드 focus. 파트·보표·마디·한 마디 적용 범위 표시 | 실제960/1400 pointer/keyboard/native·undo/reopen·PDF. native/XML 왕복에서 첫 보표2마디3/4와 뒤4/4·다른 파트 보존 |

최신 전체 gate: **Vitest364파일/3,811검사 PASS, 외부 opt-in1파일/1검사 skip, Node 도구5검사 PASS (551.42초, 입력/빌드1,026개 변경 없음)**. 과거 전체 PASS로 현재 변경의 전체 PASS를 대신하지 않는다. 초기 실패·검증 도구 교정은 [실패 기록](../releases/studio-desktop-brand-20261103/failures.md)에 남겼다.

## 다음 범위에서 검토할 항목

- 총보 공통·이후 마디 적용과 사용자 지정 박자표. 현재 목록은2/4·3/4·4/4·6/8이며 이번 진입점 개선으로 지원 범위를 확장한 것은 아니다.
- 꾸밈음의 실제 내부 재생/MIDI 발음·세부 음가 편집. 현재는 기존 표기/저장 모델의 기능을 노출하고 변환한다.
- 화음 구성음별 선택·부분 화음 타이와 range staff extension. 새 모델이나 지원하지 않는 옵션을 표시하지 않았다.
- 반음 이동의 기존 enharmonic 철자는 보존한다. 예를 들어 F♯→F𝄪는 G와 실제 음높이가 같지만 표기가 다를 수 있으며 J로 표기를 변경한다. MuseScore의 철자 선택까지 GUI로 일치 확인한 것은 아니다.
- Windows/Linux 실제 설치·실행·업그레이드, macOS 기존 설치를 대체하는 업그레이드 및 universal/Developer ID/공증. 별도 승인 전 게시하지 않는다.
- 실제 사용자 악보·외부 MuseScore GUI/MIDI·청음·물리 IME·OS 파일 dialog·스크린리더는 이번 범위에서 승인하지 않았다. 기존801 포인터 관찰 전체의 해결로 확대 해석하지 않는다.

MuseScore 매핑/덮어쓰기 기준은 [공식 음표 편집](https://handbook.musescore.org/basics/editing-notes-and-rests), [공식 단축키 목록](https://handbook.musescore.org/appendix/all-keyboard-shortcuts)을 확인했다. 현재 Studio 지원 범위와 완전한 MuseScore parity는 구분한다.
