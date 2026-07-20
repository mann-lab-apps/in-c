# 프로덕션 운영 플레이북

이 플레이북은 `https://in-c.mannlab.app` 정적 사이트, Chromatics 다운로드 링크,
GA4 이벤트, GitHub Pages 배포를 대상으로 한다. 목표는 운영자가 15분 안에 기본
장애 여부를 판단하고, 필요하면 이전 커밋으로 되돌릴 수 있게 하는 것이다.

## 15분 장애 판단

1. GitHub Actions의 `Site`와 `CI` workflow 상태를 확인한다.
2. `npm run verify:site-production`으로 주요 URL, sitemap, robots, 다운로드
   manifest, GitHub Pages fallback redirect, TLS 인증서를 확인한다.
3. `https://in-c.mannlab.app/`, `/columns.html`, `/compositions.html`,
   `/privacy.html`, `/download-manifest.json`를 브라우저에서 직접 연다.
4. 홈 다운로드 CTA, Columns 칼럼 열기, Compositions 상세 열기, GitHub Issues
   링크를 한 번씩 눌러 링크 깨짐을 확인한다.
5. GA4 Realtime에서 page view와 핵심 이벤트가 들어오는지 확인한다.
6. GitHub Releases에서 manifest가 가리키는 파일과 `SHA256SUMS.txt`가 열리는지
   확인한다.

## 배포 후 체크리스트

- [ ] `git status --short --branch`에서 배포 대상 브랜치가 깨끗하다.
- [ ] `git fetch origin main` 후 로컬 배포 후보와 `origin/main` 차이를 확인했다.
- [ ] `main` 최신 커밋의 `CI` workflow가 성공했다.
- [ ] `main` 최신 커밋의 `Site` workflow가 성공했다.
- [ ] `npm run verify:site-production`이 성공했다.
- [ ] `npm run verify:analytics`가 성공했다.
- [ ] `npm run verify:site-seo`가 성공했다.
- [ ] 다운로드 manifest의 `releaseTag`, `releaseUrl`, `checksumsUrl`, platform
  URL이 실제 릴리즈와 일치한다.
- [ ] sitemap에 `index.html`, `columns.html`, `compositions.html`,
  `privacy.html`, 공개 Columns 페이지가 포함된다.
- [ ] GA4 Realtime에서 `download_primary`, `open_in_chromatics`,
  `composition_download`, `feedback_submit` 중 가능한 이벤트를 확인했다.

## 원격 main 동기화 기준

원격 push는 사용자 승인 후 진행한다. 승인 전에는 다음 항목을 issue 또는 작업
메모에 남긴다.

- 배포 후보 커밋 범위.
- 포함할 변경과 제외할 변경.
- 실행한 검증 명령과 결과.
- 배포 후 확인할 URL.
- 롤백이 필요한 조건.

권장 명령:

```bash
git status --short --branch
git fetch origin main
git log --oneline --decorate --max-count=8 --left-right main...origin/main
npm run typecheck
npm test
npm run site:build
npm run verify:analytics
npm run verify:site-seo
```

## 주요 장애별 확인

| 증상 | 1차 확인 | 대응 |
| --- | --- | --- |
| 사이트가 열리지 않음 | GitHub Pages/hosting 상태, DNS, TLS, `Site` workflow | Pages 장애면 fallback URL 확인, 최근 배포 실패면 이전 성공 커밋 재배포 |
| 일부 페이지 404 | `site/vite.config.ts` input, sitemap, 배포 artifact | 누락된 HTML input 추가 후 재배포 |
| 다운로드 실패 | `site/download-manifest.json`, GitHub Release artifact, checksum URL | manifest를 실제 릴리즈 산출물에 맞춰 수정 |
| analytics 이벤트 0 | `site/analytics-config.json`, GA4 Realtime, 브라우저 차단 | config와 measurement ID 확인, 이벤트 payload 변경 여부 확인 |
| Search Console 색인 문제 | sitemap 제출, robots, canonical | `npm run verify:site-seo`, Search Console URL inspection |
| 사용자 제보 증가 | GitHub issue 라벨, 재현 가능성, 영향 범위 | 장애/버그/문의로 분류하고 재현 정보 요청 |

## 롤백 절차

1. 마지막 성공 커밋을 확인한다.

   ```bash
   gh run list --repo mann-lab-apps/in-c --workflow Site --branch main --limit 10
   gh run list --repo mann-lab-apps/in-c --workflow CI --branch main --limit 10
   ```

2. 되돌릴 범위가 단일 커밋이면 revert commit을 만든다.

   ```bash
   git pull --ff-only origin main
   git revert <bad-commit-sha>
   npm run typecheck
   npm test
   npm run site:build
   git push origin main
   ```

3. 배포 artifact만 다시 만들면 되는 경우 `Site` workflow를 재실행한다.

   ```bash
   gh workflow run Site --repo mann-lab-apps/in-c --ref main
   ```

4. 배포 후 `npm run verify:site-production`을 다시 실행한다.
5. 관련 GitHub issue에 원인, 영향 범위, 롤백 커밋, 남은 후속 작업을 남긴다.

주의: `git reset --hard`와 강제 푸시는 기본 롤백 절차가 아니다. 공개 main에서는
revert commit으로 기록을 남긴다.

## GitHub issue 대응 기준

- 장애: 프로덕션 사이트 404/5xx, 다운로드 파일 접근 실패, 배포 실패, analytics
  완전 누락처럼 사용자 흐름이 막히는 문제. `긴급` 라벨을 붙이고 재현 명령을 남긴다.
- 버그: 특정 브라우저, 특정 페이지, 특정 파일에서 재현되는 문제. 스크린샷, URL,
  운영체제, 브라우저, 앱 버전을 요청한다.
- 문의: 사용법, 설치 경고, 기능 범위 질문. 공개 답변으로 해결하되 개인정보나
  비공개 파일을 요구하지 않는다.
- 개선: 제품 방향이나 콘텐츠 제안. 급한 운영 장애와 분리한다.

## 운영 메모 템플릿

정식 배포 후 확인 결과는
[`Production smoke evidence 기록 양식`](../quality/production-smoke-evidence-template.md)을
복사해 날짜, commit, URL, 판정 근거를 남긴다. 아래 양식은 장애를 빠르게 기록할
때 사용한다.

```markdown
## 확인 시각

- KST:
- 확인자:

## 영향

- 사용자 영향:
- 영향 URL:
- 관련 커밋/릴리즈:

## 확인 결과

- CI:
- Site workflow:
- Production smoke:
- GA4 Realtime:
- 다운로드 manifest:

## 조치

- 실행한 명령:
- 롤백 여부:
- 후속 이슈:
```

## 관련 문서

- 사이트 운영: [`docs/site.md`](../site.md)
- GA4 운영: [`docs/product/analytics-operations.md`](../product/analytics-operations.md)
- analytics 이벤트 사양: [`docs/product/analytics-events.md`](../product/analytics-events.md)
- 공개 고지: [`site/privacy.html`](../../site/privacy.html)
