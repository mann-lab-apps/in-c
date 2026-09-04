# Chromatics Desktop V1 릴리즈 노트 초안

상태: V1 웹 랜딩 공개용 초안

이 문서는 public release candidate 전에 사용자-facing 문구를 고정하기 위한 초안이다.
`docs/product/chromatics-v1-blocker-backlog.md`의 professional V1 blocker가 남아 있는
동안에는 이 문서를 최종 릴리즈 노트로 게시하지 않는다.

2026-09-03 기준 로컬 자동 검증과 macOS unpacked packaged smoke는 pass evidence가 있고,
제품 owner가 실제 외부 앱 MusicXML export fixture, file dialog 기반 save/open/export,
PDF/MIDI 외부 앱 열기, playback/mixer 청감 QA, installer/DMG, Windows packaged smoke를
별도 수동 QA로 수행하기로 했다. 웹 랜딩은 V1 공개 카피로 게시할 수 있고, desktop app
public RC signoff evidence는 수동 QA 결과로 보강한다.

## 한눈에 보기

- Chromatics Desktop V1은 Mac/Windows 데스크탑 사보앱으로, 총보와 파트보를 작성하고
  MusicXML/PDF/MIDI로 주고받는 workflow를 목표로 한다.
- Linux package는 V1 public release target이 아니며 post-V1 follow-up target이다.
- V1 primary save는 MusicXML이다.
- 전용 프로젝트 포맷은 V1에 포함하지 않고 post-V1 migration 대상으로 둔다.

## 저장 정책

- **Primary save**: MusicXML.
- **로컬 앱 상태**: autosave/recovery snapshot, 최근 파일 목록, 파일 경로별 총보/파트보
  view preference만 Chromatics 로컬 상태로 유지한다.
- **보존되지 않는 상태**: MusicXML이 표현하지 못하는 Chromatics 전용 layout/view 데이터는
  저장/내보내기 warning report에 표시한다.
- **Migration path**: post-V1 전용 프로젝트 포맷을 도입하면 기존 MusicXML을 먼저 가져오고,
  안전하게 매핑 가능한 로컬 preference만 migration한다. MusicXML에서 보존되지 않은 layout
  데이터는 warning report를 기준으로 사용자가 재설정하도록 안내한다.

## 현재 제한

public V1 release notes에는 전문 악보 작업의 기본 신뢰를 깨는 blocker를 제한으로 남기지
않는다. 남길 수 있는 제한은 scan/OCR, VST, 실시간 협업, 웹 풀 에디터, 고급 tab/percussion,
text-only tempo curve playback처럼 post-V1 고급 확장으로 분리된 항목뿐이다.

## 게시 전 조건

- `docs/product/chromatics-v1-blocker-backlog.md`의 release blocker가 public V1 known
  limitation으로 남지 않는다.
- `docs/quality/evidence-log.md`에 자동 검증과 manual QA evidence가 모두 기록되어 있다.
- `docs/quality/known-limitations.md`와 이 초안의 `현재 제한` 범위가 충돌하지 않는다.
