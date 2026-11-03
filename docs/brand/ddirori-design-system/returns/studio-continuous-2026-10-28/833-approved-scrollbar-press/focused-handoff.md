# 833 — 승인된 native scrollbar press 적용

사용자가 822의 “일반 스크롤바와 통일: 누르면 추적 중단”을 승인했다. 현재 원본에 관측기만 좁게 이행했다. 828 전체 snapshot/App/shared UI를 복사하지 않았으며, 823/826 tracker 앞부분과 최신 830 Tooltip·831 mark focus는 해시로 보존했다. `promotion.json` 참조. 과거 승인 대기/미적용 기록은 그대로 두고 이 반환 자료에 승인 이후를 기록한다.

기존 classic gutter와 같이, 확인된 overlay HTML/body paint box/scroll range의 주 버튼 press에서 바로 viewport를 수동으로 넘긴다. 무이동 thumb 클릭도 중단한다. body/content/dock target, body 밖 root, secondary/middle button, range 없는 overlay는 제외한다. 임의 OS 설정이나 scrollbar 폭을 추가하지 않았다. scroll/release/focus 이벤트와 frame 만료를 기다리는 상태가 없어 지연 native movement보다 먼저 reveal이 실행되는 경쟁을 제거했다.

## 변경 전후 검증

- 새 정책 단위 15개는 수정 전 4실패/11통과다. 관련 전체 red-b는 18실패/161통과였다. 승인된 정책의 기대값 이전과 실제 measured native fixture 범위는 test-migration.md에 명시했다. 기존 실패·assertion·역사적 소스는 삭제하지 않았다.
- observer 이행 뒤 12파일/179검사와 typecheck가 통과했다. 새 정책 단위 15개와 App 입력/도크의 무이동 press 사례 각 1개를 추가했다. 일반 내용/도크·zero wheel·자동 SVG focus·명시적 follow 복귀 대조군을 유지한다.
- 최신 변경 전 red-b 빌드에서도 실제 track/resize의 scrollBy 2회 실패가 재현됐다. 이전 826의 실패만 재사용한 것이 아니다. baseline-track-a 실패 원문을 보존했다.
- 수정 빌드의 실제 track fast/held × 960/1400 4장면은 7.90초 PASS다. 실제 native track 이동과 같은 선택/주소·resize 중 scrollBy0/root0·명시적 악보 복귀를 확인했다.
- thumb drag/무이동 click 4장면은 7.31초 PASS다. drag는 실제 root가 151.5→10.5 /164→21.5로 이동하고 click은 151.5/164에 머물렀다. 양쪽 모두 follow=false이며 공개 following 버튼으로 실제 cursor 노출을 복구했다.
- contained popup 2장면은 4.82초, native content hit-grid/static click/resize 2장면은 3.92초 PASS다. 일반 내용 클릭과 내부 wheel을 native UI press로 잘못 분류하지 않았다. 이 관찰은 현재 두 viewport/DOM 범위이며 모든 OS/미래 구조의 보장으로 확대하지 않는다.
- 총 12장면/Native36쓰기·재열기·원본·선택/history0 보존을 확인했다. 실제 1400 thumb click과 960 fast track/resize 이미지를 직접 검토했다. build/profile/fixed도 PASS이며 baseline 변경은 없다.

전체 최신 351파일3750/Node5는 이번 정책 수정 전이다. 최신 고정 소스2914의 전체 gate를 이어서 실행하고 실제 결과를 추가한다. 현재는 미커밋이며 버전/배포/기보/공통 API/엔진/schema 변경은 없다. 사용자 Electron/live out/다른 worktree·브랜드·모바일 변경을 보존했다. 이번 desktop 정책에는 iOS metadata 변경이 없다.

829의 1400 nested-touch 문서 무이동 실패는 이 수정 범위가 아니며 원인 미확정으로 유지한다. 물리 IME/터치·OS dialog·스크린리더·청음·외부 앱을 새로 승인한 것은 아니다. 목표 도구 paused/재개 API 없음과 현재 턴의 실제 수행을 구분한다. Commercial V1/RC 전체 완료가 아니다.
