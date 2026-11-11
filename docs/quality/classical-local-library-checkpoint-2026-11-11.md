# Play 커밋·푸시와 지속 워크트리 인계

2026-11-11 사용자의 커밋/푸시·워크트리 정리 요청으로 기존 검증 완료 변경을 보존하고 원격 브랜치에 올렸다. 원본 저장소와 다른 앱의 dirty 변경은 포함하거나 되돌리지 않았다.

## 실제 제품 체크포인트

- 브랜치: `feature/ddirori-play-library-context-20261031`
- 디자인 도구 보완: `e36582cb` — palette 날짜/선택 원본과 API snapshot 경로 이식성
- 제품/검증 증거: `436a615746ca1c546206e80921ad4c27a6923cd7` — 보관함·검색·셔플/반복·큐 편집·즐겨찾기·IMSLP·복구/접근성/피드백과 기존 이어받은 변경
- 원격: `origin/feature/ddirori-play-library-context-20261031` (새 브랜치 push 성공)
- 지속 경로: `/Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-library-context-20261031`

`git worktree move`로 기존 checkout과 ignored build/QA 파일을 함께 옮겼다. `/tmp/ddirori-play-library-context-20261031`은 더 이상 개발 경로가 아니다. 이력 문서·runner report·해시 registry의 예전 경로/HEAD/미커밋 표시는 당시 실행 사실이므로 바꾸지 않았다. 이 문서와 README의 최신 안내를 재개 기준으로 사용한다.

## 증거와 검증

제품 커밋에 [music-actions 증거](evidence/play-music-actions-20261111/report.json)와 [reliability 증거](evidence/play-reliability-20261111/report.json)의 모든 참조 로그/이미지를 포함했다. `.gitattributes`는 해당 두 묶음의 원본 로그를 binary로 보존해 terminal padding이나 줄바꿈 변환으로 SHA-256이 달라지지 않게 한다. 원본 로그·hash·촬영 결과는 편집하지 않았다. 커밋된 Git blob에서도 제품 source226개와 양쪽 evidence registry 전체가 기록된 해시와 일치함을 확인했다.

직전 검증은 앱726개·고유 iOS native14개·QA17항목·새61장·source fingerprint `a458146dbaaa3fbba9bb535d88bb7cecbc973c30c6d3f71d50391e8fafa734a2`다. 디자인 도구의 Node 테스트2개와 palette `--check`도 통과했다. worktree 이동 후 아래 검사를 다시 통과했고 runtime source226개의 bytes와 live fingerprint도 그대로다. 새 제품 기능이나 버전 변경은 없다.

| 이동 후 실행 | 실제 결과 |
| --- | --- |
| `flutter pub get` | exit0, lock/source 변경 없음 |
| `dart format --output=none --set-exit-if-changed lib test integration_test tool` | 175파일·변경0 |
| `flutter test --no-pub --reporter expanded` | 726개 통과 |
| `flutter analyze` | No issues found |
| `flutter build ios --simulator --no-codesign` | exit0, `build/ios/iphonesimulator/Runner.app` 생성 |
| Fastlane `prepare_ios_metadata ... mode:check` | exit0 |
| `git diff --check` | 통과 |

이동 후 로그와 hash는 아래 cleanup 백업의 `post-move-checks/`에 로컬 보존한다. 제품 코드가 같은 직전 native14개 증거를 다시 실행한 것처럼 표현하지 않는다. 이번 추가 확인은 경로 이동 후 호스트 회귀·시뮬레이터 build이며 물리 실행/청감이나 새 배포가 아니다.

## 정리 범위와 복구

아래 두 Play checkout은 이미 디렉터리가 없었고 index의 staged 변경도 없었다. 등록 메타데이터를 먼저 백업한 뒤 `git worktree remove`로 해당 등록만 제거했다. Git branch/ref는 삭제하지 않았다. 다른 앱의 prunable 등록은 건드리지 않았다.

- `/private/tmp/ddirori-play-release-20261026`: `feature/ddirori-play-library-release-prep-20261026` / `c9c6921dc6ace93ffd38072650188ba0b3974b40`
- `/private/tmp/ddirori-play-testflight-20261030`: `feature/ddirori-play-ios-media-controls-20261030` / `cb29d398321d3b1ac84e4ce90d619e3da7af574b`

등록 백업은 `/Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-snapshots/20261111-worktree-cleanup/`에 있다. 기존 source/evidence 복구 archive는 같은 상위 폴더의 `20261111/`·`20261111-reliability/`에 그대로 유지한다. 검증된 증거·기존 브랜치·다른 앱의 build 또는 작업 파일을 일괄 삭제하지 않았다.

## 남은 경계

App Store/TestFlight 업로드·심사·출시·metadata pinning을 진행하지 않았다. 버전0.1.0+4·SQLite18·기존 Apple build ID와 metadata pending/reviewed false를 유지한다. MP3 양성 fixture, Xs 이전 OS 실행·청감·VoiceOver·Files/iCloud·Bluetooth·전화 검수는 [안정성 기록](classical-local-library-reliability-2026-11-11.md)과 사용자 점검표를 따른다. 원본 저장소의 별도 Play/브랜딩/Score/Studio 작업은 미커밋 상태를 보존하며 이번 브랜치로 자동 통합하지 않는다.
