# 띠로리 Studio alpha.41 배포 후보

alpha.40은 태그에서 실행한 Linux 전체 검사에서 실패해 게시되지 않았다. 브랜드 검사가 alpha.39를 고정했고, 드래그 테스트에 필요한 소스를 릴리즈 스냅샷에 넣지 않았으며, 꾸밈음 설명서 테스트가 배포 전 문구를 기대했다. [alpha.40 실행](https://github.com/mann-lab-apps/in-c/actions/runs/44890052177)

alpha.41에서는 패키지와 lock 버전 일치, 빌더에서 만든 각 플랫폼 파일명의 버전과 ASCII를 검사한다. 기존 드래그 검사 의존 소스를 포함하고, 설명서 테스트가 MIDI 손실 안내 링크를 직접 열어 해당 항목을 확인하게 했다. 앱의 악보 모델·입력·출력 수정은 alpha.40 후보의 내용을 유지하며, 이 버전의 설명서와 릴리즈 노트에 버전을 반영했다.

태그의 Release workflow는 `macos-15`로 Universal 앱을 검사한다. [기존 기능 검증과 자료 색인](../studio-alpha40-20261121/preflight.md)

alpha.40 macOS의 App 시간 초과 4건은 POSIX·저장 데이터 실패와 분리했다. 실제 작업 영역으로 조회를 좁히고 긴 가사·빠르기 테스트를 두 실행으로 나눴다. 기존 기대값과 제한 시간을 유지했다. 로컬 전체 회귀 7,342개와 Node 5개는 이 시간 초과 보완 전 후보에서 통과했다. 최종 보완의 관련 10검사와 타입 검사를 통과했다.

검증된 후보 방식은 dispatch 시점의 커밋을 플랫폼마다 checkout한다. 세 패키지·실행 검사와 서명·공증을 완료한 뒤 결과 커밋에 버전 태그를 붙이고 체크섬이 포함된 GitHub 프리릴리즈를 게시한다. [GitHub Actions 토큰 이벤트 처리](https://docs.github.com/en/actions/concepts/security/github_token)

alpha.40 Windows에서 Markdown CRLF가 설명서의 제목·표·앵커 파싱에 영향을 주는 것을 확인했다. 같은 원문을 CRLF로 전달하는 로컬 테스트에서 재현한 뒤 번들 경계에서 LF로 정규화했다. 파일 장애 주입에는 OS 경로 구분자를 사용하며, MusicXML 개행 비교는 Windows의 표준 출력 변환을 피하도록 libxml2 내부에서 문자열을 비교한다. 실제 내보낸 XML의 전체 XSD 확인과 원본 문자열 보존 검사는 유지한다. 파트 페이지 검사도 실제 작업 영역으로 좁혔다.

첫 후보 실행은 Windows 이전 결과 확인 후 태그 생성 전에 취소했다. 보완본의 관련 17파일 124검사와 타입 검사가 통과했다. Windows/Linux의 플랫폼별 preflight 후 새 후보 실행을 진행한다. [취소한 후보 실행](https://github.com/mann-lab-apps/in-c/actions/runs/44896106410)
