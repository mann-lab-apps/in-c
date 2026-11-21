# 띠로리 Studio alpha.41 배포 후보

alpha.40은 태그에서 실행한 Linux 전체 검사에서 실패해 게시되지 않았다. 브랜드 검사가 alpha.39를 고정했고, 드래그 테스트에 필요한 소스를 릴리즈 스냅샷에 넣지 않았으며, 꾸밈음 설명서 테스트가 배포 전 문구를 기대했다. [alpha.40 실행](https://github.com/mann-lab-apps/in-c/actions/runs/44890052177)

alpha.41에서는 패키지와 lock 버전 일치, 빌더에서 만든 각 플랫폼 파일명의 버전과 ASCII를 검사한다. 기존 드래그 검사 의존 소스를 포함하고, 설명서 테스트가 MIDI 손실 안내 링크를 직접 열어 해당 항목을 확인하게 했다. 앱의 악보 모델·입력·출력 수정은 alpha.40 후보의 내용을 유지하며, 이 버전의 설명서와 릴리즈 노트에 버전을 반영했다.

태그의 Release workflow는 `macos-15`로 Universal 앱을 검사한다. [기존 기능 검증과 자료 색인](../studio-alpha40-20261121/preflight.md)

alpha.40 macOS의 App 시간 초과 4건은 POSIX·저장 데이터 실패와 분리했다. 실제 작업 영역으로 조회를 좁히고 긴 가사·빠르기 테스트를 두 실행으로 나눴다. 기존 기대값과 제한 시간을 유지했다. 로컬 전체 회귀 7,342개와 Node 5개는 이 시간 초과 보완 전 후보에서 통과했다. 최종 보완의 관련 10검사와 타입 검사를 통과했다.

검증된 후보 방식은 dispatch 시점의 커밋을 플랫폼마다 checkout한다. 세 패키지·실행 검사와 서명·공증을 완료한 뒤 결과 커밋에 버전 태그를 붙이고 체크섬이 포함된 GitHub 프리릴리즈를 게시한다. [GitHub Actions 토큰 이벤트 처리](https://docs.github.com/en/actions/concepts/security/github_token)
