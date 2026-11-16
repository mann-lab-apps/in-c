# Play 공개 페이지 로컬 초안

2026-11-16 최신 상태: 사용자 승인으로 운영 주체만랩·첫 공개 목표1.0.0·대표 도메인ddirori.com을 확정했다. 실제 운영 소스는 별도 `mann-lab-apps/ddirori` 저장소다. 승인된3파일 변경을 commit `5a0d7f90f5a176966fffc9f06ddb344d793cf6a3`으로 게시했고 GitHub Pages run43805476424 성공 및 `/play/privacy/`·`/play/`·`/support/` HTTPS200/내용을 확인했다. 시행일은2026-11-16이다. 아래2026-11-12 상태는 당시 이력이며 현재 URL로 사용하지 않는다. 로컬 `privacy.html`이 승인된 앱 방침이며 index/support 초안은 운영 웹사이트의 기존 페이지를 대체하지 않는다.

사용자 확인 공개 이메일은 `daga4242@gmail.com`이다. 2026-11-12 작업 환경에서 `https://ddirori.mannlab.app/`는 DNS 해석 실패, 기존 임시 Site의 privacy/support는 HTTP403이었다. 외부 게시/등록/수정은 하지 않았고 앱/YAML에 미검증 URL을 주입하지 않았다.

이 폴더를 정적 HTTP 서버의 document root로 사용할 수 있다. index/privacy/support와 CSS 외에 서버·SDK·폼·저장소·외부 자산이 없다. Sites의 로컬 전용 절차로 준비하며 hosted Site identity/hosting manifest를 임의 생성하지 않는다. 색상은 시스템 light/dark 중립값을 따르고 대표색·아이콘을 확정하지 않는다.

게시 전 운영 주체/적용일·최종 URL과 내용을 확인하고 공개 게시에 대한 별도 승인을 받아야 한다. 최종 게시 시 초안 문구와 noindex를 실제 결정에 맞게 처리한다. 공개 HTTPS 응답과 실제 내용을 다시 확인한 뒤 `PRIVACY_POLICY_URL`/`SUPPORT_URL` 및 ios-metadata.yaml에 동일하게 반영한다. 로컬 준비는 공개 URL 준비 완료가 아니다.

사용자에게 필요한 확인은 묶어서 받는다: 도메인/DNS 또는 다른 공개 URL, 개인정보·지원 최종 게시 정보, 새 후보의 Xs 최소 QA 결과. 이메일과 기존 아이콘 승인을 다시 요구하지 않는다.
