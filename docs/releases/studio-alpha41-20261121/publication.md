# 띠로리 Studio alpha.41 게시 확인

GitHub 프리릴리즈는 2026-11-21 22:03:53 KST에 게시됐다. `v0.1.0-alpha.41`은 검증한 소스 `24971ce6141a0c91b2e1b40d556297d771bc0ad2`에 고정돼 있다. [릴리즈](https://github.com/mann-lab-apps/in-c/releases/tag/v0.1.0-alpha.41) · [전체 CI](https://github.com/mann-lab-apps/in-c/actions/runs/44901556389)

세 플랫폼의 12개 shard, Node 도구 검사, 패키징과 패키지 실행 검사를 통과했다. macOS는 Vitest 7,343개 통과·1개 건너뜀, Windows는 7,283개 통과·61개 건너뜀, Linux는 7,093개 통과·251개 건너뜀이다. 각 플랫폼의 Node 도구 검사 5개는 모두 통과했다. 선택적 외부 앱·플랫폼 조건부 검사는 건너뜀에 포함된다. [CI 결과](ci-checks.json)

macOS Universal DMG/ZIP, Windows 설치용·포터블, Linux AppImage와 체크섬 파일을 내려받아 GitHub digest, 파일 크기 및 SHA256SUMS를 대조했다. 다운로드한 DMG를 읽기 전용으로 열어 앱 ID·버전·아이콘·arm64/x86_64, Developer ID 서명, 공증, Gatekeeper 및 임시 프로필의 실제 실행 검사를 확인했다. 검증 프로세스와 마운트는 종료했다. 사용자 데이터로 업그레이드하거나 실제 OS 대화상자를 조작하는 수동 검증은 이번 범위 밖이다. [다운로드 검사](publication.json) · [macOS 검사](published-mac.json)

alpha.40 태그는 최초 후보 기록으로 남았으며 GitHub Release는 게시되지 않았다. 설치 파일이 있는 공개 버전은 alpha.41이다. 기존 원본 워크트리와 사이트 배포 설정은 그대로다. [후보 검증 기록](release-candidate.md)
