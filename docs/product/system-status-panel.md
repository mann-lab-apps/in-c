# System Status Panel

작성일: 2026-07-13

## 목적

앱 안에서 현재 구현된 기능, 지원 범위, 알려진 제한사항, 버전 정보를 한눈에 보여주는
시스템 성격의 탭 또는 패널을 정의한다. 일반 사용자가 기대를 조정하고, QA 담당자가
릴리즈 범위를 확인하는 데 쓰인다.

## 1차 IA

| 섹션 | 사용자용 내용 | QA/개발용 내용 |
| --- | --- | --- |
| 앱 정보 | 버전, prerelease 여부, 설치 주의사항 | commit/tag, 빌드 플랫폼 |
| 저장과 열기 | MusicXML 저장/가져오기, PDF 변환 | 지원하는 MusicXML subset |
| 악보 작성 | 단성부 입력, 박자/조표, 쉼표/음표 변환 | tuplets, ties, range editing 상태 |
| 표현 기호 | 셈여림, 페르마타, 숨표, 아티큘레이션 | MusicXML import/export 보존 여부 |
| 재생 | 기본 재생, 빠르기 | tempo map 미지원 범위 |
| 알려진 제한 | 다성부, 화음, 코드 심벌, 가사 미지원 | 관련 GitHub 이슈 링크 |
| 릴리즈 노트 | 최신 변경 요약 | release checklist 링크 |

## 1차 표시 기능 목록

- 새 악보 만들기
- 솔로/피아노 grand staff/앙상블 새 악보 프리셋
- 피아노 grand staff/앙상블 stacked staff 미리보기
- 추가 staff 이벤트 선택과 note input target 유지
- 입력 보표 전환 UI
- part/staff 추가, 삭제, 이름 변경 첫 슬라이스
- 현재 보표 음자리표 선택
- 악기 라이브러리 기반 part 추가
- multi-staff 표기 객체 staff anchoring 첫 슬라이스
- 제목/작곡자/빠르기 입력
- 박자표와 조표 선택
- 단성부 음표/쉼표 입력과 음가 변경
- 범위 선택, 복사/붙여넣기, 삭제
- 붙임줄, 셋잇단음표, 페르마타, 숨표/중지표, 셈여림, 연습표, 보표 글자, 시스템/표현 텍스트
- MusicXML 저장과 가져오기
- grand staff/앙상블의 MusicXML 구조와 기본 note/rest 저장·재가져오기
- MuseScore/Finale/Sibelius/Dorico 호환 MusicXML seed fixture 자동 검증
- 선택 part만 보는 파트보 preview, 제목 표시, PDF 출력 대상 선택 첫 구현
- PDF 변환
- part별 track/channel/program을 가진 MIDI 내보내기 첫 구현
- multi-voice tie와 ensemble tuplet playback timing 자동 검증 일부
- macOS arm64 unpacked packaged app의 시작/새 악보 workspace/MusicXML write/reopen/PDF 구조/MIDI type-1 구조/autosave 자동 smoke
- 기본 재생과 위치별 템포 변경 재생

## Known limitations

- 다성부, 화음, 코드 심벌, 가사는 아직 완성 지원하지 않는다.
- multi-staff/앙상블은 생성, 미리보기, 추가 staff 입력 target, 입력 보표 전환 UI,
  part/staff add/remove/rename, 현재 보표 음자리표 선택, MusicXML 구조와 기본 event
  round-trip, 악기 library 기반 part 추가, 표기 객체 staff anchoring 첫 슬라이스 이후
  고급 표기 저장/출력 QA가 남아 있다.
- MusicXML은 MVP subset과 compatibility seed fixture까지만 자동 검증하며, 실제 앱 export-origin
  fixture와 reopen/manual QA가 남아 있다.
- 셈여림과 일부 표현 기호 배치는 복잡한 악보에서 추가 개선이 필요하다.
- 자동저장은 사용자 명시 저장을 대체하지 않는다.
- 웹/커뮤니티/계정 연동 기능은 별도 제품 표면에서 계획 중이다.

## 후속 구현 이슈로 분리할 항목

- 시스템 탭 UI 컴포넌트
- 지원 범위 데이터를 feature map과 공유하는 구조
- GitHub Release notes 또는 `package.json` 버전 자동 표시
- known limitations와 GitHub issue 링크 자동 동기화
