# 브랜치 운영 전략

작성일: 2026-07-09

## 결정

`dev` 브랜치를 도입한다.

- `main`: 배포 가능한 안정 브랜치
- `dev`: 다음 앱 릴리즈 후보를 통합하는 브랜치
- `issue-*`: 개별 이슈 작업 브랜치

현재 GitHub Pages와 릴리즈는 `main` 기준으로 유지한다. `dev`는 앱 기능이
여러 PR에 걸쳐 누적될 때 통합 검증을 위한 중간 지점으로 사용한다.

## PR base branch 규칙

| 작업 유형 | 기본 base | 이유 |
| --- | --- | --- |
| 앱 기능, 편집기 동작, MusicXML, renderer 변경 | `dev` | 릴리즈 전 통합 검증이 필요하다. |
| 배포 직전 릴리즈 준비 | `dev` -> `main` | 검증된 릴리즈 후보만 `main`으로 보낸다. |
| 문서, 이슈 정리, Columns/Compositions 콘텐츠 | `main` | 배포 위험이 작고 빠른 반영이 유리하다. |
| GitHub Pages 소개 페이지의 작은 문구 수정 | `main` | 웹 배포 흐름을 단순하게 유지한다. |
| 긴급 수정 hotfix | `main` | 배포 브랜치에 직접 반영하고 필요하면 `dev`에 backport한다. |

작업자가 판단하기 애매하면 `main`을 최신화한 뒤 이슈 성격을 확인한다. 앱 동작이
바뀌면 `dev`, 콘텐츠와 문서만 바뀌면 `main`을 기본값으로 본다.

## 병합 흐름

앱 기능 개발:

1. `dev` 최신화
2. `issue-{번호}-{slug}` 브랜치 생성
3. 구현과 검증
4. PR: `issue-*` -> `dev`
5. 릴리즈 후보 검증
6. PR: `dev` -> `main`
7. release tag 생성

문서와 콘텐츠:

1. `main` 최신화
2. `issue-{번호}-{slug}` 브랜치 생성
3. 수정과 검증
4. PR: `issue-*` -> `main`

hotfix:

1. `main` 기준 hotfix 브랜치 생성
2. PR: hotfix -> `main`
3. 릴리즈가 필요한 경우 patch release 생성
4. 같은 수정이 `dev`에 필요하면 별도 PR로 backport

## GitHub Pages 영향

현재 소개 페이지와 Columns/Compositions는 `main` 기준 빌드와 배포를 유지한다.
`dev`에 머문 변경은 사용자에게 공개되지 않는다. 사이트 변경을 `dev`에 누적해야
할 정도로 커지면 별도 preview 배포 이슈를 만든다.

## Electron 릴리즈 영향

Electron 앱 릴리즈는 `main`에서만 태그를 만든다.

- `dev`는 릴리즈 후보 검증 브랜치다.
- `main`에 들어온 후 `v*` tag를 생성한다.
- tag 검증, artifact 검증, landing page 다운로드 링크 갱신은 기존 릴리즈
  스크립트 흐름을 따른다.

## Agent 작업 규칙

- 사용자가 특정 base를 지정하지 않으면 이 문서의 PR base branch 규칙을 따른다.
- 목표모드에서 여러 앱 기능 이슈를 연속 처리할 때는 `dev`를 base로 사용한다.
- 문서/콘텐츠 이슈를 연속 처리할 때는 `main`을 base로 사용한다.
- PR 본문에 실제 base branch와 검증 명령을 명시한다.

## 브랜치 보호

현재 이 이슈에서는 브랜치 보호 규칙을 설정하지 않는다. 다만 릴리즈가 잦아지면
다음 항목을 별도 이슈로 검토한다.

- `main` 직접 push 제한
- `main` PR 필수 체크
- `dev` PR 필수 체크
- release tag 생성 권한
