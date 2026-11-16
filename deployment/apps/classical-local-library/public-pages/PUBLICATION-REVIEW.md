# Play 개인정보 페이지 게시 검토

운영 주체 **만랩**, 대표 도메인 **ddirori.com**, 공개 앱 목표 버전 **1.0.0**은 사용자 결정이다.

게시 제안 범위:

- 실제 운영 웹 저장소 `mann-lab-apps/ddirori`의 `src/play-privacy.html` 추가
- `scripts/build.mjs`에 `/play/privacy/` 경로 추가
- 기존 `/play/` 하단에 개인정보·지원 링크 추가
- 현재 검토본 안내를 실제 게시일의 시행일로 바꾸고 GitHub Pages로 배포
- 기존 `/support/`, `/privacy/`, 다른 서비스 소개·분석 설정·도메인/DNS는 보존

현재 `/support/`는 공개 HTTPS200과 Play 문의 안내를 확인했다. `/privacy/`는 웹사이트 방문 분석만 안내하므로 앱의 방침으로 대신 쓰지 않는다. 새 `/play/privacy/`는 아직404다. 승인 전에는 원본 웹 저장소 변경·push·공개 게시를 하지 않는다.

내용 정본은 이 폴더의 [privacy.html](privacy.html)이다. 기기 내 데이터·외부 검색·백업/공유·보관/삭제·문의·웹사이트 분석 구분을 포함한다. 문의 보관/삭제 안내를 포함한 운영 방침도 게시 전에 확인한다. 이메일과 아이콘 승인을 다시 요청하지 않는다.

리뷰 산출물: `docs/quality/evidence/play-public-release-20261116/web-review/`.
패치는 기록된 웹 base commit에 적용 가능한지 `git apply --check`로 확인했다. 현재 웹 source가 달라졌으면 재비교하고 새 패치를 만든다. 기존6개 페이지/181개 링크·스토어 CTA·이미지 hash 회귀와 새 canonical/진입 링크 검사가 통과했다. 별도 로컬 Chrome에서390 기본·320 글자2배·1024 글자2배, 키보드 skip-link focus·가로 overflow를 확인했고 대표 캡처를 열어 검수했다. 글자2배는 계산된 font/line-height를 두 배로 주입한 로컬 QA이며 실기기 접근성 결과가 아니다. 운영 GA 설정은 변경하지 않았고 로컬 빌드는 GA 비활성이다.

게시 승인 후 실제 날짜를 반영해 패치·미리보기를 다시 만들고, 승인 범위만 적용한다. 공개 HTTP 내용·HTTPS를 확인한 뒤 앱의 PRIVACY_POLICY_URL과 YAML을 연결한다. 앱 소스가 바뀌면 새 checkpoint/후보를 사용한다.
