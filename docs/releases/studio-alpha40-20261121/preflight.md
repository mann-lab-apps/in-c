# 띠로리 Studio alpha.40 배포 준비

기능 소스는 alpha.39 이후 작업의 IC 검증본이다. 원래 검증에서 Vitest 7,342개와 Node 도구 검사 5개가 통과했고 외부 앱 opt-in 검사 1개를 건너뛰었다. 별도 릴리즈 워크트리에 데스크톱 소스와 회귀 테스트, 앱 내 설명서를 옮겼다. 큰 로컬 검증 자료는 파일 경로와 SHA-256으로 인계한다. [소스 기준](source.json) · [검증 자료 색인](local-evidence-index.json)

릴리즈 후보에서 npm ci, 타입 검사를 포함하는 생산 빌드, 관련 6파일 42검사, 사용설명서·백로그·태그 버전·Git 공백 검사를 통과했다. macOS arm64 로컬 패키지를 별도 프로필로 실행해 프로젝트·복구·XML/MXL·PDF·MIDI 패키지 검사를 통과했다. 이 로컬 빌드에는 Developer ID 서명과 공증을 적용하지 않았다.

GitHub Release workflow로 태그의 전체 회귀, 플랫폼별 패키지 smoke, macOS Universal 서명·공증과 체크섬 게시를 확인한다.
