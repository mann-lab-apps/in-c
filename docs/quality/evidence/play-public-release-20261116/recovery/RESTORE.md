# Play 공개 준비 checkpoint 복구

- 인계 commit: c91c6ec9def6c6d900881470d94fcfcf54e85347
- 실제 IPA 제품 commit: 2814dbd30aa5764ec70544772d6fcd418260367f
- 버전: 1.0.0(5), SQLite19, 후보 feedback receipt는 아직0개
- 원래 지속 경로: /Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-library-context-20261031
- 빌드 전용 경로: /Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-release-candidate-20261116

`checkpoint.json`의 SHA256을 먼저 대조한다. 기존 원본/다른 앱/dirty worktree에 덮어쓰거나 reset/clean하지 않는다. 이전20261112 snapshot도 보존한다.

`checkpoint.bundle`은 **증분 bundle**이다. f57602c18ce55031833faabf37a073da437453b9가 있는 원본 Git 저장소 또는 그 base를 원격에서 확보한 clone이 필요하다. 원본 저장소에서 `git bundle verify <bundle>` 후 기존 브랜치를 덮어쓰지 않는 recovery ref로 fetch하고, 새 빈 worktree에 인계 commit을 checkout한다. bundle만으로 독립 clone할 수 있다고 가정하지 않는다. `scoped-source.tar.gz`는 앱/ddirori_ui/deployment와 이번 인계 자료를 한정 보관한 별도 소스 사본이며 Git 전체 저장소가 아니다.

`release-runtime.tar.gz`에는 실제 archive/IPA, 검증 baseline, JSON 빌드 입력, 승인된 원격 쓰기 계획, 후보 manifest, 원본 native 이미지/촬영·검수 proof와 해당 시점 결과가 있다. 우선 새 검증 폴더에 목록/해시를 확인한다. 원래 지속 경로가 소실된 경우 그 경로에 인계 checkpoint를 복구한 다음 deployment/output 트리만 복원한다. 남아 있는 제품 파일에 tar를 덮어쓰지 않는다.

촬영 proof는 원래 절대 경로와 실제 hash에 연결돼 있다. 다른 경로로 복원한다면 proof JSON을 수동 조작하지 말고 새 검증/촬영을 수행한다. 제품을 다시 빌드하려면 실제 제품 commit2814dbd3의 깨끗한 별도 checkout과 이 인계의 deployment 설정을 사용한다. IPA hash는 d44f262a017c7060a057b8c93593daef44b0dcfbe637bcb1a03eeaf5cb962c36이다.

인증서 비밀키, .p8, issuer 설정, 심사 연락처 실제 값은 포함하지 않았다. 기존 외부 자격 증명과 GitHub Secrets 참조를 사용한다. 개인정보 페이지는 별도 웹 저장소 commit5a0d7f90f5a176966fffc9f06ddb344d793cf6a3로 공개돼 있다. App Store는1.0.0/PREPARE_FOR_SUBMISSION/MANUAL, 내부 빌드5 VALID/IN_BETA_TESTING, 승인된14장 업로드/체크섬/순서 확인 상태다. 이 기록은 사람의 QA·심사 제출·공개 출시 승인이 아니다.
